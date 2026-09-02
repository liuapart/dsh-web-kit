// 浏览器半部 · 停靠栏壳（单例 DOM + 开合 + 全局交互 + 双把手）
// 状态：hasContent 区分"空提示"与"有内容"，收起不清内容；
// openHook 由 browser 模块注册 —— 把手点击展开时若面板为空则进入浏览模式。
const { ensureStyles } = require("./styles.js");

var dock = null, scrim = null, handle = null, headEl = null, bodyEl = null;
var expanded = false;
var hasContent = false;
var openHook = null;
var WIDTH_KEY = "dsh-wk-width"; // 拖拽宽度持久化（v1 的 dsh-fv-width 已废弃）

function setExpanded(on) {
	expanded = on;
	if (dock !== null) dock.classList.toggle("dsh-wk-collapsed", !on);
	if (scrim !== null) scrim.classList.toggle("dsh-wk-scrim-visible", on);
}

function setOpenHook(fn) {
	openHook = typeof fn === "function" ? fn : null;
}

/** 面板当前是否为空（首次打开才触发浏览入口，不打扰已打开的预览）。 */
function isEmpty() {
	return !hasContent;
}

function onKey(e) {
	if (e.key === "Escape" && expanded) setExpanded(false);
}

// 外点收起：pointerdown 只观察不拦截 —— 拦截会吞掉本次点击，
// 用户就点不开聊天里的路径了（点击后渲染流程会重新展开）
function onOutside(e) {
	if (!expanded) return;
	if (dock !== null && dock.contains(e.target)) return;
	if (handle !== null && handle.contains(e.target)) return;
	setExpanded(false);
}

function ensureDock() {
	ensureStyles();
	if (dock !== null) return;
	dock = document.createElement("div");
	dock.id = "dsh-wk-dock";
	dock.className = "dsh-wk-collapsed";

	// —— 左缘拖拽调宽：320~760px，pointerup 落盘 localStorage ——
	var resize = document.createElement("div");
	resize.className = "dsh-wk-resize";
	resize.title = "拖拽调宽";
	var dragWidth = function (e) {
		if (e.buttons !== 1) return;
		var w = Math.min(Math.max(window.innerWidth - e.clientX, 320), 760);
		dock.style.width = w + "px";
	};
	var saveWidth = function () {
		try { localStorage.setItem(WIDTH_KEY, dock.style.width); } catch (e) { }
		document.removeEventListener("pointermove", dragWidth);
	};
	resize.addEventListener("pointerdown", function () {
		document.addEventListener("pointermove", dragWidth);
	});
	document.addEventListener("pointerup", saveWidth);

	headEl = document.createElement("div");
	headEl.className = "dsh-wk-head";
	// —— 面包屑层：位于头部与内容区之间的固定层 ——
	//    必须独立于 .dsh-wk-body（滚动容器）：放在 body 里会随代码横向滚动
	//    一起位移（2026-08-31 反馈），独立后只有面包屑自己可横向滚动
	crumbsEl = document.createElement("div");
	crumbsEl.className = "dsh-wk-crumbs";
	crumbsEl.style.display = "none"; // 空态/工作区根视图不占高度
	bodyEl = document.createElement("div");
	bodyEl.className = "dsh-wk-body";
	showHint();

	// —— 左侧遮罩：预览展开时阻断背后聊天内容，点击遮罩收起 ——
	scrim = document.createElement("div");
	scrim.id = "dsh-wk-scrim";
	scrim.setAttribute("aria-hidden", "true");
	// 遮罩阻断背后内容；点击收起，但不产生移动端 tap/按压反馈。
	scrim.addEventListener("pointerdown", function (e) {
		e.stopPropagation();
	});
	scrim.addEventListener("click", function (e) {
		e.preventDefault();
		e.stopPropagation();
		setExpanded(false);
	});

	// —— 右缘竖排把手：停靠栏收起时可见，点击展开（主动打开入口） ——
	//    面板为空（首次/未预览过）→ 交给 openHook 进入工作区浏览模式
	handle = document.createElement("div");
	handle.id = "dsh-wk-handle";
	handle.textContent = "预览";
	handle.title = "展开文件预览";
	handle.addEventListener("click", function () {
		setExpanded(true);
		if (openHook !== null && !hasContent) openHook();
	});

	// —— 功能二：小屏侧栏贴边把手 ——
	// 官方收起细条被隐藏后，这里是唯一入口；点击转发给官方 toggle：
	//  优先选收起态（[data-sidebar-collapsed] 作用域）里的 toggle 按钮，
	//  找不到（侧栏展开态）再全局找 —— 正好实现开↔关切换。
	// 类名用 [class*="_toggle"] 后缀匹配：CSS Modules 哈希在构建间会变，
	// 但 "_toggle"/"_root" 这类源码名后缀稳定。
	var sideOpen = document.createElement("div");
	sideOpen.id = "dsh-wk-side-open";
	sideOpen.textContent = "›";
	sideOpen.title = "侧栏";
	sideOpen.setAttribute("role", "button");
	sideOpen.setAttribute("aria-label", "侧栏开关");
	sideOpen.addEventListener("click", function () {
		var t = document.querySelector('[data-sidebar-collapsed] button[class*="_toggle"]')
			|| document.querySelector('button[class*="_toggle"]');
		if (t !== null) t.click();
	});

	dock.appendChild(resize);
	dock.appendChild(headEl);
	dock.appendChild(crumbsEl);
	dock.appendChild(bodyEl);
	document.body.appendChild(scrim);
	document.body.appendChild(dock);
	document.body.appendChild(handle);
	document.body.appendChild(sideOpen);
	// 恢复上次拖拽宽度（限三位数 px，防脏数据）
	try {
		var w = localStorage.getItem(WIDTH_KEY);
		if (w !== null && /^\d{3}px$/.test(w)) dock.style.width = w;
	} catch (e) { }
	document.addEventListener("keydown", onKey);
	document.addEventListener("pointerdown", onOutside);
}

/** 头部空态（首次建栏时的操作提示）。 */
function showHint() {
	headEl.textContent = "";
	var t = document.createElement("div");
	t.className = "dsh-wk-title";
	t.textContent = "文件预览";
	headEl.appendChild(t);
	var fold = document.createElement("button");
	fold.className = "dsh-wk-btn";
	fold.setAttribute("aria-label", "收起");
	fold.title = "收起（Esc）";
	fold.textContent = "»";
	fold.addEventListener("click", function () { setExpanded(false); });
	headEl.appendChild(fold);
	if (crumbsEl !== null) { crumbsEl.textContent = ""; crumbsEl.style.display = "none"; }
	bodyEl.textContent = "";
	var hint = document.createElement("div");
	hint.className = "dsh-wk-hint";
	hint.textContent = "点击聊天消息里的文件路径，即可在此预览\n或点右侧「预览」把手浏览工作区文件";
	bodyEl.appendChild(hint);
}

module.exports = { ensureDock, setExpanded, setOpenHook, isEmpty, headEl: () => headEl, bodyEl: () => bodyEl, crumbsEl: () => crumbsEl };
