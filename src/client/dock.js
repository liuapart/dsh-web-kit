// 浏览器半部 · 小屏侧栏把手（单例 DOM）
// v2.6.0：功能一（文件预览停靠栏）已随官方 0.1.5 右侧文件预览下线，本文件只
// 保留功能二的贴边把手 DOM。点击转发给官方侧栏 toggle：
//  优先选收起态（[data-sidebar-collapsed] 作用域）里的 toggle 按钮，
//  找不到（侧栏展开态）再全局找 —— 正好实现开↔关切换。
// 类名用 [class*="_toggle"] 后缀匹配：CSS Modules 哈希在构建间会变，
// 但 "_toggle"/"_root" 这类源码名后缀稳定。
const { ensureStyles } = require("./styles.js");

var sideOpen = null;

function ensureSideOpen() {
	ensureStyles();
	if (sideOpen !== null) return;
	sideOpen = document.createElement("div");
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
	document.body.appendChild(sideOpen);
}

module.exports = { ensureDock: ensureSideOpen };
