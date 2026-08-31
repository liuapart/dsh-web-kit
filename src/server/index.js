// ============================================================================
// @apanoo/dsh-web-kit — 服务端半部入口（host plugin，ESM 由打包器生成到 lib/index.js）
// ----------------------------------------------------------------------------
// 职责：注册 /web-kit 精确路由，为浏览器半部提供：
//   1. GET /web-kit（无 path）→ 工作区根列表（kind:"roots"，P0 浏览入口）
//   2. GET /web-kit?path=X   → 文件内容 / 目录列表（原有能力）
// 安全模型总纲见 src/server/fence.js；允许任意可读路径是有意取舍——LAN 上的
// GUI 用户已经过 Caddy basic auth 认证，其可见文件面与 SSH 登录本机一致；
// 权限最终由文件系统裁决。realpath 解析符号链接。
// ============================================================================
const { stat, realpath } = require("node:fs/promises");
const { json } = require("./reply.js");
const { isTrustedRequest } = require("./fence.js");
const { listDir } = require("./listing.js");
const { readFilePart } = require("./readfile.js");
const { readWorkspaceRoots } = require("./workspace.js");

const name = "web-kit";
const inject = ["webServer"];

// 路由路径与限额常量（v2.0 由 /file-view 改名为 /web-kit，与插件新名一致）
const VIEW_PATH = "/web-kit";

/** dsh 生命周期入口：往 webServer 注册一条 exact 路由，随插件卸载自动销毁。 */
function apply(ctx) {
	const handler = async (req, res) => {
		try {
			// ---------- ① 信任围栏（先于一切业务逻辑） ----------
			if (!isTrustedRequest(req)) return json(res, 403, { error: "forbidden" });

			// ---------- ② 方法与路径匹配 ----------
			if (req.method !== "GET") return json(res, 405, { error: "method-not-allowed" });
			const url = new URL(req.url ?? "/", "http://internal");
			if (url.pathname !== VIEW_PATH) return json(res, 404, { error: "not-found" });

			const raw = url.searchParams.get("path");

			// ---------- ③ 无 path → 工作区根列表（浏览模式入口，宽容解析） ----------
			if (raw === null) {
				const entries = await readWorkspaceRoots();
				return json(res, 200, { ok: true, kind: "roots", entries });
			}
			if (raw === "" || raw === ".") return json(res, 400, { error: "path-required" });

			// ---------- ④ 真实路径（解析符号链接；权限由文件系统决定） ----------
			let real;
			try {
				real = await realpath(raw);
			} catch {
				return json(res, 404, { error: "file-not-found" });
			}

			const info = await stat(real);

			// ---------- ⑤ 目录：列表 ----------
			if (info.isDirectory()) {
				const { truncated, entries } = await listDir(real);
				return json(res, 200, { ok: true, kind: "dir", path: real, truncated, entries });
			}

			// ---------- ⑥ 文件：上限检查 + 二进制嗅探 + 截断读取 ----------
			if (!info.isFile()) return json(res, 415, { error: "not-a-file" });
			const file = await readFilePart(real, info);
			if (file.status !== 200) return json(res, file.status, { error: file.error });
			return json(res, 200, file.body);
		} catch (error) {
			// 兜底：任何未预期异常都以 JSON 500 返回，绝不让 webServer 挂掉
			return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
		}
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: VIEW_PATH,
		handler
	}), "web-kit: /web-kit route");
}

module.exports = { name, inject, apply };
