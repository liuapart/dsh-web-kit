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
