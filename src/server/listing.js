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
