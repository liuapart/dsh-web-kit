// ============================================================================
// @apanoo/dsh-web-kit — 服务端半部【构建物，勿手改；改 src/server/ 后 npm run build】
// ============================================================================

import __ext0 from "node:fs/promises";
import __ext1 from "node:os";
import __ext2 from "node:path";

var __mod = {
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/reply.js": function (module, exports, require) {
			// 服务端半部 · 统一 JSON 响应（no-store：预览内容永远取最新，不走缓存）
			function json(res, status, body) {
				res.writeHead(status, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				res.end(JSON.stringify(body));
			}

			module.exports = { json };

		}, // ↑ src/server/reply.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/fence.js": function (module, exports, require) {
			// ============================================================================
			// 服务端半部 · 信任围栏（安全模型核心，历史迭代结论，勿轻动）
			// ----------------------------------------------------------------------------
			// 语义对齐 dsh-client-connection 的 isTrustedApiRequest：
			//   - sec-fetch-site: cross-site → 拒绝（跨站请求直接拒绝）
			//   - 带 Origin 时必须与 Host 完全一致 → 否则拒绝
			//   - Host 必须是回环/私网字面量/部署域名白名单 → 否则拒绝
			//     （DNS-rebinding 防线：域名解析拦不住 IP 字面量，所以按字面量判断）
			// 域名入口（ai.apanoo.cn）：请求必经 Caddy（remote_ip 白名单 + basic_auth）
			// 才能到达 dsh（3080 只绑 loopback，外部无法直连），故域名 Host 等价于
			// 已通过认证的 LAN 来源；本围栏是纵深防御的第二层，非唯一防线。
			// ============================================================================
			const EXTRA_TRUSTED_HOSTNAMES = new Set(["ai.apanoo.cn"]);

			function trustedHostname(hostname) {
				if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1") return true;
				if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) return true;
				if (/^f[cd][0-9a-f]{2}:/.test(hostname)) return true;
				return EXTRA_TRUSTED_HOSTNAMES.has(hostname);
			}

			/** 请求级信任判定：false → 调用方必须 403，不得继续任何业务逻辑。 */
			function isTrustedRequest(req) {
				const host = String(req.headers.host ?? "");
				if (req.headers["sec-fetch-site"] === "cross-site") return false;
				const origin = req.headers.origin;
				if (origin !== undefined) {
					try {
						if (new URL(String(origin)).host !== host) return false;
					} catch {
						return false; // Origin 头畸形 → 视为不可信
					}
				}
				const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
				return trustedHostname(hostname);
			}

			module.exports = { isTrustedRequest };

		}, // ↑ src/server/fence.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/listing.js": function (module, exports, require) {
			// 服务端半部 · 目录列表（排序：目录优先，名称次之；噪音过滤；条数上限）
			const { lstat, readdir } = require("node:fs/promises");
			const { join } = require("node:path");

			const MAX_ENTRIES = 500; // 目录列举上限，超出返回 truncated 标记

			async function listDir(real) {
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
				return { truncated, entries: truncated ? entries.slice(0, MAX_ENTRIES) : entries };
			}

			module.exports = { listDir, MAX_ENTRIES };

		}, // ↑ src/server/listing.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/readfile.js": function (module, exports, require) {
			// 服务端半部 · 文件读取（图片识别 + 二进制嗅探 + 截断读取）
			const { open } = require("node:fs/promises");

			const MAX_READ = 1024 * 1024;        // 文本读取上限 1MB，超出返回截断标记
			const MAX_IMAGE = 20 * 1024 * 1024;  // 图片 data URL 上限 20MB（base64 膨胀 4/3），超出回退原生打开

			// 图片魔数表：按文件头判定，比扩展名可靠（扩展名经常不可信）
			const IMAGE_MAGIC = [
				{ prefix: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png" },  // PNG
				{ prefix: [0xff, 0xd8, 0xff], mime: "image/jpeg" },                               // JPEG/JFIF/EXIF
				{ prefix: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },                          // GIF87a/GIF89a
				{ prefix: [0x42, 0x4d], mime: "image/bmp" },                                      // BMP
				{ prefix: [0x00, 0x00, 0x01, 0x00], mime: "image/x-icon" },                       // ICO
			];

			/** 在头部缓冲匹配图片魔数；WEBP 单独判（RIFF 固定头 + 偏移 8 的 "WEBP"）。 */
			function sniffImage(head) {
				for (var i = 0; i < IMAGE_MAGIC.length; i++) {
					var sig = IMAGE_MAGIC[i].prefix;
					var hit = true;
					for (var j = 0; j < sig.length; j++) {
						if (head[j] !== sig[j]) { hit = false; break; }
					}
					if (hit) return IMAGE_MAGIC[i].mime;
				}
				if (head.length >= 12 &&
					head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
					head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) {
					return "image/webp";
				}
				return null;
			}

			async function readFilePart(real, info) {
				if (info.size > 64 * 1024 * 1024) return { status: 413, error: "too-large" };
				const handle = await open(real, "r");
				try {
					// 嗅探头部 8KB
					const headLen = Math.min(info.size, 8192);
					const head = Buffer.alloc(headLen);
					await handle.read(head, 0, headLen, 0);

					// —— 位图：魔数命中 → 整文件 base64 data URL（kind:"image"），浏览器半部页内渲染 ——
					const mime = sniffImage(head);
					if (mime !== null) {
						if (info.size > MAX_IMAGE) return { status: 413, error: "image-too-large" };
						const buf = Buffer.alloc(info.size);
						await handle.read(buf, 0, info.size, 0);
						return {
							status: 200,
							body: {
								ok: true,
								kind: "image",
								path: real,
								size: info.size,
								mime: mime,
								dataUrl: "data:" + mime + ";base64," + buf.toString("base64")
							}
						};
					}

					// —— SVG：文本格式无魔数，按扩展名识别（<img> 上下文里 SVG 脚本不执行，安全） ——
					if (/\.svg$/i.test(real)) {
						if (info.size > MAX_IMAGE) return { status: 413, error: "image-too-large" };
						const svg = Buffer.alloc(info.size);
						await handle.read(svg, 0, info.size, 0);
						return {
							status: 200,
							body: {
								ok: true,
								kind: "image",
								path: real,
								size: info.size,
								mime: "image/svg+xml",
								dataUrl: "data:image/svg+xml;base64," + svg.toString("base64")
							}
						};
					}

					// NUL 字节即判为二进制 → 415，浏览器半部会回退原 openPath
					if (head.includes(0)) return { status: 415, error: "binary" };
					const readLen = Math.min(info.size, MAX_READ);
					const buf = Buffer.alloc(readLen);
					await handle.read(buf, 0, readLen, 0);
					return {
						status: 200,
						body: {
							ok: true,
							kind: "file",
							path: real,
							size: info.size,
							truncated: info.size > readLen,
							content: buf.toString("utf8")
						}
					};
				} finally {
					await handle.close();
				}
			}

			module.exports = { readFilePart, MAX_READ, MAX_IMAGE };

		}, // ↑ src/server/readfile.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/workspace.js": function (module, exports, require) {
			// 服务端半部 · 工作区根列表（P0「把手上手即浏览」的数据来源）
			// ----------------------------------------------------------------------------
			// 数据源：dsh 的 workspace 注册表（~/.dsh/storages/workspace.json，unit.version=2），
			// 结构 tables.workspaces[<id>] = { path, title, ... }。
			// 刻意做成「宽容解析」：注册表不存在/格式变化/条目失效 → 一律返回空数组，
			// 绝不让预览主路由 500（工作区列表是便利功能，不是关键路径）。
			const { readFile, stat, realpath } = require("node:fs/promises");
			const { join } = require("node:path");
			const { homedir } = require("node:os");

			const REGISTRY = () => join(homedir(), ".dsh", "storages", "workspace.json");

			async function readWorkspaceRoots() {
				try {
					const data = JSON.parse(await readFile(REGISTRY(), "utf8"));
					const tables = data !== null && typeof data === "object" ? data.tables?.workspaces : null;
					if (tables === null || typeof tables !== "object") return [];
					const seen = new Set();
					const out = [];
					for (const id of Object.keys(tables)) {
						const w = tables[id];
						if (w === null || typeof w !== "object" || typeof w.path !== "string" || w.path === "") continue;
						const real = await realpath(w.path).catch(() => null);
						if (real === null || seen.has(real)) continue;
						const st = await stat(real).catch(() => null);
						if (st === null || !st.isDirectory()) continue;
						seen.add(real);
						const fall = real.split("/").pop() || real;
						out.push({ name: typeof w.title === "string" && w.title !== "" ? w.title : fall, path: real, type: "dir" });
					}
					out.sort((a, b) => a.name.localeCompare(b.name));
					return out;
				} catch {
					return [];
				}
			}

			module.exports = { readWorkspaceRoots };

		}, // ↑ src/server/workspace.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/index.js": function (module, exports, require) {
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
			const { json } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/reply.js");
			const { isTrustedRequest } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/fence.js");
			const { listDir } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/listing.js");
			const { readFilePart } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/readfile.js");
			const { readWorkspaceRoots } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/workspace.js");

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

		}, // ↑ src/server/index.js
};
var __cache = {};
function __req(id) {
	if (__cache[id] !== undefined) return __cache[id].exports;
		if (id === "node:fs/promises") return __ext0;
		if (id === "node:os") return __ext1;
		if (id === "node:path") return __ext2;
	if (__mod[id] === undefined) throw new Error("module not found: " + id);
	var m = { exports: {} };
	__cache[id] = m;
	__mod[id](m, m.exports, __req);
	return m.exports;
}
var __entry = { exports: {} };
__mod["/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/server/index.js"](__entry, __entry.exports, __req);
const name = __entry.exports.name;
const inject = __entry.exports.inject;
const apply = __entry.exports.apply;
export { name, inject, apply };
