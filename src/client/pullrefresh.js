// PWA 独立模式 · 顶区下拉刷新（v2.3.0）
// 与安卓壳 TopZoneSwipeLayout 同策略：触摸起点落在屏幕顶部 TOP_ZONE 内、
// 纵向下滑即接管为刷新手势——不要求页面先滚到顶，内容在任意滚动位置都能拉；
// 越过阈值松手 → location.reload() 整页刷新。
// 背景：iOS 主屏幕 PWA 没有原生下拉刷新（那是 Safari 浏览器的待遇），而后台
// 冻结又常把旧快照带回前台，用户只能杀掉重开。
// 门禁：
//   - 仅独立模式生效（navigator.standalone / display-mode:standalone），
//     浏览器模式保持 Safari 原生下拉刷新，不叠加第二套；
//   - 起点 y ≤ TOP_ZONE（对齐安卓壳 topZonePx=120dp）；ARM 位移门槛保证
//     点按/长按不误触；
//   - 纵向意图 dy > |dx|*1.2，不干扰官方横向手势（tab 横滑等）；
//   - 触摸落在编辑区（input/textarea/contenteditable）与本插件停靠栏/把手/
//     遮罩上不参与——停靠栏自己要滚，遮罩是点按关闭。
var TOP_ZONE = 120;  // 顶区高度（CSS px，对齐安卓壳 120dp）
var ARM = 12;        // 武装位移：纵向超过才算"开始下拉"（过滤点按抖动）
var TRIGGER = 58;    // 松手触发阈值（指示器位移）
var MAX = 96;        // 拖拽位移上限
var DAMP = 0.45;     // 阻尼：手指位移 → 指示器位移
var EXCLUDE = "#dsh-wk-dock,#dsh-wk-scrim,#dsh-wk-handle,#dsh-wk-side-open,input,textarea,[contenteditable=\"true\"],[contenteditable=\"\"]";
var ind = null;
var dist = 0;

function standalone() {
	return navigator.standalone === true ||
		(typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);
}

function ensureIndicator() {
	if (ind && ind.parentNode) return;
	ind = document.createElement("div");
	ind.id = "dsh-wk-ptr";
	ind.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v9"/><path d="M5.5 8.5 10 13l4.5-4.5"/></svg>';
	document.body.appendChild(ind);
}

// d: 0..MAX。箭头 -90°(向右)→0°(向下) 随距离转正，透明度 28px 内淡入
function paint(d) {
	var k = Math.min(d / TRIGGER, 1);
	ind.style.transform = "translateY(" + (-46 + d) + "px) rotate(" + (-90 + k * 90) + "deg)";
	ind.style.opacity = String(Math.min(d / 28, 1));
}

function reset() {
	dist = 0;
	ind.classList.add("dsh-wk-ptr-back");
	paint(0);
}

function install() {
	if (!standalone()) return; // 浏览器模式：原生自带，不叠加
	if (!document.body) {
		document.addEventListener("DOMContentLoaded", install);
		return;
	}
	ensureIndicator();
	var x0 = 0, y0 = 0, armed = false, engaged = false;

	document.addEventListener("touchstart", function (e) {
		if (e.touches.length !== 1) { armed = false; engaged = false; return; }
		var t = e.target;
		armed = false; engaged = false;
		if (t && t.closest && t.closest(EXCLUDE)) return;
		if (e.touches[0].clientY > TOP_ZONE) return; // 只认顶区起点（同安卓壳拦截逻辑）
		x0 = e.touches[0].clientX;
		y0 = e.touches[0].clientY;
		armed = true;
	}, { passive: true });

	document.addEventListener("touchmove", function (e) {
		if (e.touches.length !== 1) { if (engaged) { engaged = false; reset(); } return; }
		var dx = e.touches[0].clientX - x0;
		var dy = e.touches[0].clientY - y0;
		if (!engaged) {
			// 武装：顶区起点 + 纵向意图（滚动位置无关）
			if (armed && dy > ARM && dy > Math.abs(dx) * 1.2) {
				engaged = true;
				ind.classList.remove("dsh-wk-ptr-back", "dsh-wk-ptr-spin");
			} else {
				return;
			}
		}
		e.preventDefault(); // 压住原生滚动/橡皮筋，位移全部交给指示器
		dist = Math.max(0, Math.min(MAX, (dy - ARM) * DAMP));
		paint(dist);
	}, { passive: false });

	document.addEventListener("touchend", function () {
		if (!engaged) return;
		engaged = false;
		if (dist >= TRIGGER) {
			ind.classList.add("dsh-wk-ptr-spin");
			ind.classList.remove("dsh-wk-ptr-back");
			paint(TRIGGER);
			setTimeout(function () { location.reload(); }, 120);
		} else {
			reset();
		}
	}, { passive: true });

	document.addEventListener("touchcancel", function () {
		if (engaged) { engaged = false; reset(); }
	}, { passive: true });
}

module.exports = { installPullRefresh: install };
