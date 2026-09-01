// Session log 按钮 · 窄屏紧凑化（v2.2.0 从安卓壳迁入，Web/壳双端一致）
// 官方按钮类名是 CSS Module 哈希（.nL4_yW_sessionLogButton），不能按类名选；
// 按内部结构标记：button 内 span 文本 = 'Session log'（结构稳定）。
// JS 只负责打标记类 dsh-wk-slog；收窄样式全部交给 styles.js 的媒体查询
// （转屏/拉宽自适应零成本，不再需要壳里的 JS 内联样式切换）。
// 按钮列宽由父布局分配（官方 min-width:111px），藏文字不会缩，样式里需
// 一并覆盖盒子（width/min-width/flex/padding/margin-left，!important 压哈希类）。
var marked = new WeakSet();

function mark(root) {
	var btns = (root || document).querySelectorAll("button");
	for (var i = 0; i < btns.length; i++) {
		var b = btns[i];
		if (marked.has(b)) continue;
		var spans = b.querySelectorAll("span");
		for (var j = 0; j < spans.length; j++) {
			if ((spans[j].textContent || "").trim() === "Session log") {
				b.classList.add("dsh-wk-slog");
				marked.add(b);
				break;
			}
		}
	}
}

function install() {
	if (!document.body) {
		document.addEventListener("DOMContentLoaded", install);
		return;
	}
	mark(document);
	// SPA 重渲染：新增子树里的新按钮即打标（MutationObserver 回调先于绘制，无闪烁）
	new MutationObserver(function (muts) {
		for (var i = 0; i < muts.length; i++) {
			var added = muts[i].addedNodes;
			for (var j = 0; j < added.length; j++) {
				if (added[j].nodeType === 1) mark(added[j]);
			}
		}
	}).observe(document.body, { childList: true, subtree: true });
	// 自愈兜底：极端时序漏标的 2s 补标
	setInterval(function () {
		mark(document);
	}, 2000);
}

module.exports = { installSessionLog: install };
