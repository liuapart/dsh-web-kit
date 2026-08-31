// ============================================================================
// @apanoo/dsh-web-kit v2 — 服务端半部（host plugin）
// ----------------------------------------------------------------------------
// 职责：注册 /web-kit 精确路由，为浏览器半部提供「任意路径的文件内容 / 目录列表」。
//       这是「聊天里点文件路径 → 页内预览」功能的数据来源。
//
// 安全模型（历史迭代结论，勿轻动）：
//   1. 仅 GET；其余方法 405。
//   2. 信任围栏，语义对齐 dsh-client-connection 的 isTrustedApiRequest：
//      - sec-fetch-site: cross-site → 403（跨站请求直接拒绝）
//      - 带 Origin 时必须与 Host 完全一致 → 否则 403
//      - Host 必须是回环/私网字面量 → 否则 403（DNS-rebinding 防线：
//        域名解析拦不住 IP 字面量，所以按字面量判断而不是按域名白名单）
//   3. 允许任意可读路径：这是有意取舍——LAN 上的 GUI 用户已经过 Caddy basic
//      auth 认证，其可见文件面与 SSH 登录本机一致；权限最终由文件系统裁决。
//   4. 二进制嗅探（头部 8KB 含 NUL → 415）、1MB 读取上限（truncated 标记）、
//      64MB stat 上限、目录 500 条上限。realpath 解析符号链接。
// ============================================================================
import { lstat, open, readdir, stat, realpath } from "node:fs/promises";
import { join } from "node:path";

// —— 插件元数据：inject 声明依赖 dsh 的 webServer 服务以注册路由 ——
const name = "web-kit";
const inject = ["webServer"];

// 路由路径与限额常量（v2.0 由 /file-view 改名为 /web-kit，与插件新名一致）
const VIEW_PATH = "/web-kit";
const MAX_READ = 1024 * 1024;      // 文本读取上限 1MB，超出返回截断标记
const MAX_ENTRIES = 500;           // 目录列举上限，超出返回 truncated 标记

/** 统一 JSON 响应（no-store：预览内容永远取最新，不走缓存）。 */
function json(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}

/**
 * Host 是否为本机回环或私网字面量。
 * IPv4 私网段：10/8、172.16/12、192.168/16、169.254/16（链路本地）；
 * IPv6 私网：fc00::/7（唯一本地，fd 开头最常见）。
 */
function trustedHostname(hostname) {
	if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1") return true;
	if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) return true;
	return /^f[cd][0-9a-f]{2}:/.test(hostname);
}

/** dsh 生命周期入口：往 webServer 注册一条 exact 路由，随插件卸载自动销毁。 */
function apply(ctx) {
	const handler = async (req, res) => {
		try {
			// ---------- ① 信任围栏（先于一切业务逻辑） ----------
			const host = String(req.headers.host ?? "");
			const origin = req.headers.origin;
			if (req.headers["sec-fetch-site"] === "cross-site") return json(res, 403, { error: "forbidden" });
			if (origin !== undefined) {
				try {
					if (new URL(String(origin)).host !== host) return json(res, 403, { error: "forbidden" });
				} catch {
					return json(res, 403, { error: "forbidden" }); // Origin 头畸形 → 视为不可信
				}
			}
			const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
			if (!trustedHostname(hostname)) return json(res, 403, { error: "forbidden" });

			// ---------- ② 方法与路径匹配 ----------
			if (req.method !== "GET") return json(res, 405, { error: "method-not-allowed" });
			const url = new URL(req.url ?? "/", "http://internal");
			if (url.pathname !== VIEW_PATH) return json(res, 404, { error: "not-found" });

			const raw = url.searchParams.get("path") ?? "";
			if (raw === "" || raw === ".") return json(res, 400, { error: "path-required" });

			// ---------- ③ 真实路径（解析符号链接；权限由文件系统决定） ----------
			let real;
			try {
				real = await realpath(raw);
			} catch {
				return json(res, 404, { error: "file-not-found" });
			}

			const info = await stat(real);

			// ---------- ④ 目录：列表（排序：目录优先，名称次之） ----------
			if (info.isDirectory()) {
				const entries = [];
				for (const d of await readdir(real, { withFileTypes: true })) {
					// 噪音过滤：与常见文件树面板一致（.git / node_modules / .DS_Store）
					if (d.name === ".DS_Store" || d.name === ".git" || d.name === "node_modules") continue;
					if (d.isDirectory()) entries.push({ name: d.name, type: "dir", size: null });
					else if (d.isFile()) {
						// lstat 失败（竞态删除/权限）→ 该项标 null 尺寸而不是让整个请求 500
						const st = await lstat(join(real, d.name)).catch(() => null);
						entries.push({ name: d.name, type: "file", size: st?.size ?? null });
					}
				}
				entries.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1);
				const truncated = entries.length > MAX_ENTRIES;
				return json(res, 200, {
					ok: true,
					kind: "dir",
					path: real,
					truncated,
					entries: truncated ? entries.slice(0, MAX_ENTRIES) : entries
				});
			}

			// ---------- ⑤ 文件：上限检查 + 二进制嗅探 + 截断读取 ----------
			if (!info.isFile()) return json(res, 415, { error: "not-a-file" });
			if (info.size > 64 * 1024 * 1024) return json(res, 413, { error: "too-large" });

			const handle = await open(real, "r");
			try {
				// 嗅探头部 8KB：出现 NUL 字节即判为二进制 → 415，浏览器半部会回退原 openPath
				const headLen = Math.min(info.size, 8192);
				const head = Buffer.alloc(headLen);
				await handle.read(head, 0, headLen, 0);
				if (head.includes(0)) return json(res, 415, { error: "binary" });
				const readLen = Math.min(info.size, MAX_READ);
				const buf = Buffer.alloc(readLen);
				await handle.read(buf, 0, readLen, 0);
				return json(res, 200, {
					ok: true,
					kind: "file",
					path: real,
					size: info.size,
					truncated: info.size > readLen,
					content: buf.toString("utf8")
				});
			} finally {
				await handle.close();
			}
		} catch (error) {
			// 兜底：任何未预期异常都以 JSON 500 返回，绝不让 webServer 挂掉
			return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
		}
	};
	// ctx.effect：路由的生命周期与插件绑定（禁用/卸载插件时自动反注册）
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: VIEW_PATH,
		handler
	}), "web-kit: /web-kit route");
}

export { apply, inject, name };
