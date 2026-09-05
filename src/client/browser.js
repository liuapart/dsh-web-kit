// 浏览器半部 · 预览面板的数据加载与渲染（双入口共用）
//   入口 A：点聊天里的文件路径 → tryView → render（精确直达）
//   入口 B：点「文件」把手 → openBrowse（从工作区根开始逛，P0）
// 位置记忆：localStorage 记住上次浏览路径，重开面板回到原处（失败回退根列表）。
const { ensureDock, setExpanded, headEl, bodyEl, crumbsEl } = require("./dock.js");
const { fmtSize, basename, parentPath } = require("./util.js");
const { tokenize, langOf } = require("./highlight.js");

var LAST_KEY = "dsh-wk-lastpath"; // 上次浏览位置持久化
var cachedRoots = null;           // 工作区根缓存（面包屑首段 = 工作区名，VS Code 惯例）

/** 拉取并缓存工作区根（apply 时预热；openRoots 时刷新）。失败 → 空数组不阻塞。 */
function ensureRoots() {
	if (cachedRoots !== null) return Promise.resolve(cachedRoots);
	return fetch("/web-kit", { headers: { accept: "application/json" } })
		.then(function (res) { return res.ok ? res.json() : null; })
		.then(function (data) {
			cachedRoots = data !== null && typeof data === "object" && data.ok === true && data.kind === "roots"
				? data.entries : [];
			return cachedRoots;
		})
		.catch(function () { return []; });
}

function saveLast(path) {
	try { localStorage.setItem(LAST_KEY, path); } catch (e) { }
}

/** 已知能看时的直接加载（目录下钻/面包屑/工作区选择用）；失败由调用方处理。 */
async function loadPath(path) {
	var res = await fetch("/web-kit?path=" + encodeURIComponent(path), {
		headers: { accept: "application/json" }
	});
	if (!res.ok) throw new Error("HTTP " + res.status);
	var data = await res.json();
	if (data === null || typeof data !== "object" || data.ok !== true) throw new Error("bad payload");
	if (data.kind !== "file" && data.kind !== "dir") throw new Error("bad kind");
	saveLast(data.path || path);
	render(path, data);
}

/** 把手入口：有记忆位置 → 直接回到原处；没有/失效 → 工作区根列表。 */
function openBrowse() {
	var saved = null;
	try { saved = localStorage.getItem(LAST_KEY); } catch (e) { }
	if (typeof saved === "string" && saved !== "") {
		loadPath(saved).catch(function () { openRoots(); });
	} else {
		openRoots();
	}
}

/** 工作区根列表（服务端宽容解析：注册表缺失/为空 → 空列表提示）。 */
function openRoots() {
	ensureRoots().then(function (entries) {
		render(null, { ok: true, kind: "roots", entries: entries });
	}).catch(function () { renderStatus("无法获取工作区列表"); });
}

/** 状态提示（错误/空态）。 */
function renderStatus(text) {
	bodyEl().textContent = "";
	var d = document.createElement("div");
	d.className = "dsh-wk-status";
	d.textContent = text;
	bodyEl().appendChild(d);
}

/**
 * 面包屑条（VS Code 惯例：首段 = 工作区名，点它回工作区根）。
 * - 路径属于某工作区：`工作区名 / 子目录 / … / 当前文件`——天然吃掉
 *   /Users/apanoo/... 长前缀，首段即「快速回到工作区根」入口
 * - 路径在工作区之外（如 /etc/hosts）：退回「… + 最后 3 段」，… 回工作区列表
 * - 任意段可点跳回该层；末段高亮不可点；roots 视图不显示面包屑
 */
function renderCrumbs(path) {
	// 独立 row 类：不带边框/背景（外层固定层 .dsh-wk-crumbs 负责），避免双重下边线
	var bar = document.createElement("div");
	bar.className = "dsh-wk-crumbs-row";
	function add(label, target, isHere, title) {
		if (bar.childNodes.length > 0) {
			var sep = document.createElement("span");
			sep.className = "dsh-wk-crumb-sep";
			sep.textContent = "/";
			bar.appendChild(sep);
		}
		var el = document.createElement("span");
		el.className = isHere ? "dsh-wk-crumb-here" : "dsh-wk-crumb";
		el.textContent = label;
		if (typeof title === "string") el.title = title;
		if (!isHere) el.addEventListener("click", function () { loadPath(target).catch(function () { }); });
		bar.appendChild(el);
	}
	var roots = cachedRoots || [];
	var best = null;
	for (var r = 0; r < roots.length; r++) {
		var rp = roots[r].path;
		if ((path === rp || path.indexOf(rp + "/") === 0) && (best === null || rp.length > best.path.length)) best = roots[r];
	}
	if (best !== null) {
		// —— 工作区内：首段工作区名，其后逐级展示（工作区内路径天然较短） ——
		var rel = path.slice(best.path.length).split("/").filter(function (s) { return s !== ""; });
		add(best.name, best.path, rel.length === 0, "工作区根：" + best.path);
		for (var i = 0; i < rel.length; i++) {
			var prefix = best.path + "/" + rel.slice(0, i + 1).join("/");
			add(rel[i], prefix, i === rel.length - 1);
		}
		return bar;
	}
	// —— 工作区外：前段折叠，只显示最后 3 段，「…」回工作区列表 ——
	var parts = path.split("/").filter(function (s) { return s !== ""; });
	var HIDE = parts.length > 4 ? parts.length - 3 : 0;
	if (HIDE > 0) add("…", null, false, "工作区列表（完整路径：" + path + "）");
	var ell = bar.querySelector(".dsh-wk-crumb");
	if (ell !== null) ell.addEventListener("click", function () { openRoots(); });
	for (var j = HIDE; j < parts.length; j++) {
		add(parts[j], "/" + parts.slice(0, j + 1).join("/"), j === parts.length - 1);
	}
	return bar;
}

/**
 * 渲染一次预览：头部（返回/标题/徽标/元信息/收起）+ 面包屑 + 主体。
 * path 为 null 表示工作区根列表视图（kind:"roots"）。
 */
function render(path, data) {
	ensureDock();
	setExpanded(true); // 有内容渲染即弹出面板（v2.0 行为；重构时曾遗漏导致点击链接不弹开）
	headEl().textContent = "";
	var isRoots = path === null;
	if (!isRoots && data.kind === "dir") {
		var up = document.createElement("button");
		up.className = "dsh-wk-btn";
		up.setAttribute("aria-label", "上一级");
		up.title = "上一级";
		// ‹ 与收起按钮「»」同属引号系符号（返回语义）；字号 18px 做视觉补偿
		//（‹ 字形偏小，15px 默认值显得单薄，2026-08-31 替换原 ↑ 箭头）
		up.textContent = "‹";
		up.style.fontSize = "18px";
		up.style.fontWeight = "600";
		up.addEventListener("click", function () { loadPath(parentPath(path)).catch(function () { }); });
		headEl().appendChild(up);
	}
	var title = document.createElement("div");
	title.className = "dsh-wk-title";
	title.textContent = isRoots ? "工作区" : (data.kind === "dir" ? basename(path) + "/" : basename(path));
	if (!isRoots) title.title = path; // 悬停看全路径
	var meta = document.createElement("div");
	meta.className = "dsh-wk-meta";
	if (isRoots) meta.textContent = data.entries.length + " 个工作区";
	else if (data.kind === "dir") meta.textContent = data.entries.length + " 项" + (data.truncated ? "（>500 截断）" : "");
	else meta.textContent = fmtSize(data.size) + (data.truncated ? "（已截断）" : "");
	var fold = document.createElement("button");
	fold.className = "dsh-wk-btn";
	fold.setAttribute("aria-label", "收起");
	fold.title = "收起（Esc）";
	fold.textContent = "»";
	fold.addEventListener("click", function () { setExpanded(false); });
	headEl().appendChild(title);
	if (!isRoots && data.kind === "file" && data.truncated) {
		var badge = document.createElement("span");
		badge.className = "dsh-wk-badge";
		badge.textContent = "> 1 MB";
		headEl().appendChild(badge);
	}
	headEl().appendChild(meta);
	headEl().appendChild(fold);

	var body = bodyEl();
	body.textContent = "";
	// —— 面包屑写入独立固定层（不随内容区横向滚动）；roots 视图隐藏 ——
	var crumbs = crumbsEl();
	crumbs.textContent = "";
	crumbs.style.display = !isRoots ? "" : "none";
	if (!isRoots) {
		var bar = renderCrumbs(path);
		crumbs.appendChild(bar);
		bar.scrollLeft = bar.scrollWidth; // 锚定末尾：当前文件恒可见（不用手动往右翻）
	}
	if (!isRoots && data.kind === "file") {
		// —— 文件：双栏行号（ln 列 sticky 钉左）+ 代码列；同字体同行高行行对齐 ——
		var lines = data.content.split("\n");
		if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop(); // 尾换行不占行号
		var ln = document.createElement("pre");
		ln.className = "dsh-wk-ln";
		var nums = new Array(lines.length);
		for (var n = 0; n < lines.length; n++) nums[n] = n + 1;
		ln.textContent = nums.join("\n");
		var pre = document.createElement("pre");
		pre.className = "dsh-wk-pre";
		var lang = langOf(path);
		if (lang !== null) pre.innerHTML = tokenize(data.content, lang);
		else pre.textContent = data.content;
		var inner = document.createElement("div");
		inner.className = "dsh-wk-codeinner";
		inner.appendChild(ln);
		inner.appendChild(pre);
		var wrap = document.createElement("div");
		wrap.className = "dsh-wk-codewrap";
		wrap.appendChild(inner);
		body.appendChild(wrap);
		return;
	}
	// —— 目录 / 工作区根：行点击下钻或选工作区（面包屑已在上方固定层） ——
	var list = document.createElement("div");
	list.className = "dsh-wk-list";
	if (data.entries.length === 0) {
		var empty = document.createElement("div");
		empty.className = "dsh-wk-status";
		empty.textContent = isRoots ? "没有可用的工作区（先在 dsh 里创建/打开一个）" : "空目录（.git / node_modules / .DS_Store 已隐藏）";
		list.appendChild(empty);
	}
	for (var idx = 0; idx < data.entries.length; idx++) {
		(function (entry) {
			var row = document.createElement("div");
			row.className = "dsh-wk-row" + (entry.type === "dir" ? " dsh-wk-rowdir" : "");
			var icon = document.createElement("span");
			icon.className = "dsh-wk-ico";
			icon.textContent = entry.type === "dir" ? "▸" : "▫";
			var name = document.createElement("span");
			name.className = "dsh-wk-name";
			name.textContent = entry.name + (entry.type === "dir" ? "/" : "");
			var size = document.createElement("span");
			size.className = "dsh-wk-size";
			size.textContent = entry.type === "file" && entry.size !== null ? fmtSize(entry.size) : "";
			row.appendChild(icon);
			row.appendChild(name);
			row.appendChild(size);
			row.addEventListener("click", function () {
				var target = isRoots ? entry.path : path + "/" + entry.name;
				loadPath(target).catch(function () { });
			});
			list.appendChild(row);
		})(data.entries[idx]);
	}
	body.appendChild(list);
}

/**
 * 尝试在页内查看（openPath 拦截入口）：能看 → 渲染并返回 true；
 * 不能（二进制/超大/围栏外/路由缺失）→ false，调用方回退原 openPath。
 * 所有异常一律吞掉返回 false。注意：tryView 成功也记入位置记忆。
 */
async function tryView(path) {
	if (typeof path !== "string" || path === "") return false;
	try {
		var res = await fetch("/web-kit?path=" + encodeURIComponent(path), {
			headers: { accept: "application/json" }
		});
		if (!res.ok) return false;
		var data = await res.json();
		if (data === null || typeof data !== "object" || data.ok !== true) return false;
		if (data.kind === "file" && typeof data.content !== "string") return false;
		if (data.kind === "dir" && !Array.isArray(data.entries)) return false;
		if (data.kind !== "file" && data.kind !== "dir") return false;
		saveLast(data.path || path);
		render(path, data);
		return true;
	} catch (e) {
		return false;
	}
}

module.exports = { openBrowse, tryView, ensureRoots };
