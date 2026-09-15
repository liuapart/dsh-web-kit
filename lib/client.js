// ============================================================================
// @apanoo/dsh-web-kit — 浏览器半部【构建物，勿手改；改 src/client/ 后 npm run build】
// ============================================================================

window.__ModuleLoader__.load({
	id: "@apanoo/dsh-web-kit",
	factory: () => {
		var __mod = {
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/styles.js": function (module, exports, require) {
			// 浏览器半部 · 样式注入（一次性）
			// v2.6.0：随文件预览功能下线，只保留三块样式——小屏侧栏管理（贴边把手 +
			// 官方细条/轨道回收）、Session log 窄屏紧凑、PWA 下拉刷新指示器。
			// 深色主题用 body[data-ds-dark-theme] 属性选择器：优先级高于官方
			// prefers-color-scheme 规则，不依赖 <style> 书写顺序（曾因层叠顺序翻车）
			var styleTag = null;

			function ensureStyles() {
				if (styleTag !== null) return;
				styleTag = document.createElement("style");
				styleTag.textContent = [
					// ---- 交互元素禁选文字：Chrome 安卓的「触摸搜索」会把点按当文字选择，
					//      弹「点击可查看搜索结果」（2026-08-31 反馈） ----
					"#dsh-wk-side-open{user-select:none;-webkit-user-select:none}",
					// ---- 移动端按钮：禁止 tap 高亮/系统触摸呼出 ----
					"#dsh-wk-side-open{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;outline:none}",
					// ---- Session log 按钮 · 窄屏紧凑（v2.2.0 自安卓壳迁入）：≤620px 只留下载图标并收缩钉右。
					//      官方按钮列宽由父布局分配且自带 min-width:111px，藏文字不会缩，需覆盖盒子；
					//      媒体查询驱动，转屏/拉宽自适应；无新增颜色，双主题天然适配 ----
					"@media (max-width:620px){.dsh-wk-slog{width:auto!important;min-width:0!important;flex:0 0 auto!important;padding:6px 12px!important;margin-left:auto!important}}",
					"@media (max-width:620px){.dsh-wk-slog span{display:none!important}}",
					// ---- 小屏侧栏贴边把手：12×64 细条，平时半透明，悬停显形 ----
					"#dsh-wk-side-open{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147481997;width:12px;height:64px;border:none;border-radius:0 8px 8px 0;background:rgba(128,140,160,.26);color:#e8eaf0;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;opacity:.4;transition:opacity .15s;padding:0}",
					"@media (hover:hover){#dsh-wk-side-open:hover{opacity:1;background:rgba(58,66,82,.85)}}",
					"@media(prefers-color-scheme:light){#dsh-wk-side-open{color:#1f2328;background:rgba(160,174,192,.3);border:1px solid #d8dee4;border-left:none}}",
					"@media (hover:hover) and (prefers-color-scheme:light){#dsh-wk-side-open:hover{background:#eaeef2}}",
					// ---- 小屏（<1024px，与官方 SIDEBAR_AUTO_COLLAPSE 对齐）侧栏管理核心 ----
					//  1) 显示贴边把手
					//  2) display:none 隐藏官方收起细条内容（rail）
					//  3) visibility:hidden 藏掉侧栏列的背景/边框（保留网格占位资格）
					//  4) !important 覆盖 frame 的内联 grid-template-columns：官方收起时
					//     computeColumns 固定保留 56px 轨道，这里压成 0 才真正回收宽度。
					//     按 [data-details-collapsed] 分两种模板，避免误伤右侧详情列
					"@media (max-width:1023px){#dsh-wk-side-open{display:flex}[data-sidebar-collapsed] [class*=\"_root\"][class*=\"_collapsed\"]{display:none}[data-sidebar-collapsed] [class*=\"_sidebarCol\"]{visibility:hidden}[data-sidebar-collapsed][data-details-collapsed]{grid-template-columns:0px minmax(0,1fr) 0px!important}[data-sidebar-collapsed]:not([data-details-collapsed]){grid-template-columns:0px minmax(0,1fr) auto!important}}",
					// ---- PWA 顶区下拉刷新指示器（v2.3.0）：浮在状态栏下方居中的小圆盘。
					//      平时藏在顶外（translateY(-46px)+opacity 0）；松手回弹才挂过渡类
					//      ——拖拽中 JS 每帧直写 transform，挂了过渡会拖影 ----
					"#dsh-wk-ptr{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:2147481999;width:38px;height:38px;margin-left:-19px;border-radius:50%;background:rgba(255,255,255,.94);box-shadow:0 2px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(-46px);pointer-events:none}",
					"#dsh-wk-ptr svg{width:20px;height:20px;stroke:#0969da}",
					"#dsh-wk-ptr.dsh-wk-ptr-back{transition:transform .22s ease,opacity .22s ease}",
					"#dsh-wk-ptr.dsh-wk-ptr-spin svg{animation:dsh-wk-ptr-rot .8s linear infinite}",
					"@keyframes dsh-wk-ptr-rot{to{transform:rotate(360deg)}}",
					"body[data-ds-dark-theme] #dsh-wk-ptr{background:rgba(33,38,45,.96);box-shadow:0 2px 12px rgba(0,0,0,.5)}",
					"body[data-ds-dark-theme] #dsh-wk-ptr svg{stroke:#58a6ff}"
				].join("\n");
				document.head.appendChild(styleTag);
			}

			module.exports = { ensureStyles };

		}, // ↑ src/client/styles.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/dock.js": function (module, exports, require) {
			// 浏览器半部 · 小屏侧栏把手（单例 DOM）
			// v2.6.0：功能一（文件预览停靠栏）已随官方 0.1.5 右侧文件预览下线，本文件只
			// 保留功能二的贴边把手 DOM。点击转发给官方侧栏 toggle：
			//  优先选收起态（[data-sidebar-collapsed] 作用域）里的 toggle 按钮，
			//  找不到（侧栏展开态）再全局找 —— 正好实现开↔关切换。
			// 类名用 [class*="_toggle"] 后缀匹配：CSS Modules 哈希在构建间会变，
			// 但 "_toggle"/"_root" 这类源码名后缀稳定。
			const { ensureStyles } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/styles.js");

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

		}, // ↑ src/client/dock.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/sessionlog.js": function (module, exports, require) {
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

		}, // ↑ src/client/sessionlog.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/pullrefresh.js": function (module, exports, require) {
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
			var EXCLUDE = "#dsh-wk-side-open,input,textarea,[contenteditable=\"true\"],[contenteditable=\"\"]";
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

		}, // ↑ src/client/pullrefresh.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/index.js": function (module, exports, require) {
			// ============================================================================
			// @apanoo/dsh-web-kit — 浏览器半部入口（打包器生成到 lib/client.js）
			// ----------------------------------------------------------------------------
			// v2.6.0：功能一【文件预览停靠栏】已移除（dsh 0.1.5 官方新增右侧文件预览栏，
			//   能力重叠；openpath/browser/highlight 与 server 路由一并下线，源码文件
			//   暂留仓库便于回退）。现保留：
			// 功能一【小屏侧栏管理】：视口 <1024px 时隐藏官方收起态的 56px 细条
			//   （含其网格轨道），改用左缘贴边细把手「›」转发官方 toggle 开合侧栏。
			// 功能二【PWA 顶区下拉刷新】：iOS 主屏幕 PWA 无原生下拉刷新，屏幕顶部
			//   120px 内下滑（滚动位置无关，同安卓壳 TopZoneSwipeLayout）→ 越阈松手整页
			//   刷新；仅独立模式生效，浏览器模式保持 Safari 原生行为。
			// 功能三【Session log 按钮 · 窄屏紧凑化】：官方按钮打标记类，样式见 styles.js。
			// ============================================================================
			const { ensureDock } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/dock.js");
			const { installSessionLog } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/sessionlog.js");
			const { installPullRefresh } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/pullrefresh.js");

			function apply(ctx) {
				// 小屏侧栏贴边把手（功能一）：首帧即具备开合入口
				ensureDock();
				// Session log 按钮 · 窄屏紧凑化（官方按钮打标记类，样式见 styles.js 媒体查询）
				installSessionLog();
				// PWA 顶区下拉刷新（仅独立模式；样式见 styles.js #dsh-wk-ptr）
				installPullRefresh();
			}

			module.exports = { name: "web-kit", inject: [], apply: apply };

		}, // ↑ src/client/index.js
		};
		var __cache = {};
		function __req(id) {
			if (__cache[id] !== undefined) return __cache[id].exports;
			if (__mod[id] === undefined) throw new Error("module not found: " + id);
			var m = { exports: {} };
			__cache[id] = m;
			__mod[id](m, m.exports, __req);
			return m.exports;
		}
		var m = { exports: {} };
		__cache["/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/index.js"] = m;
		__mod["/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/index.js"](m, m.exports, __req);
		return m.exports;
	}
});
