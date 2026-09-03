// ============================================================================
// @apanoo/dsh-web-kit — 浏览器半部【构建物，勿手改；改 src/client/ 后 npm run build】
// ============================================================================

window.__ModuleLoader__.load({
	id: "@apanoo/dsh-web-kit",
	factory: () => {
		var __mod = {
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/styles.js": function (module, exports, require) {
			// 浏览器半部 · 样式注入（一次性；z-index 约定：预览把手 2147482001 > 停靠栏 2147482000 > 遮罩 2147481998 > 侧栏把手 2147481997）
			// 深色主题用 body[data-ds-dark-theme] 属性选择器：优先级高于官方
			// prefers-color-scheme 规则，不依赖 <style> 书写顺序（曾因层叠顺序翻车）
			var styleTag = null;

			function ensureStyles() {
				if (styleTag !== null) return;
				styleTag = document.createElement("style");
				styleTag.textContent = [
					// ---- 交互元素禁选文字：Chrome 安卓的「触摸搜索」会把点按当文字选择，
					//      弹「点击可查看搜索结果」（2026-08-31 反馈）；代码区 .dsh-wk-pre
					//      保持可选中（复制需求） ----
					"#dsh-wk-dock,#dsh-wk-scrim,#dsh-wk-handle,#dsh-wk-side-open,.dsh-wk-crumbs,.dsh-wk-crumb,.dsh-wk-crumb-here,.dsh-wk-row,.dsh-wk-btn,.dsh-wk-badge,.dsh-wk-meta,.dsh-wk-size{user-select:none;-webkit-user-select:none}",
					// ---- 移动端按钮：禁止 tap 高亮/系统触摸呼出；桌面端 hover 仍单独保留 ----
					"#dsh-wk-handle,#dsh-wk-side-open,.dsh-wk-btn{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;outline:none}",
					// ---- 面板按钮：移动端点击不显示按压背景；桌面端 hover 仍保留 ----
					// ---- 展开遮罩：阻断预览框左侧背后内容；点击后由 dock.js 收起面板 ----
					//      z-index 低于 dock/handle，高于官方聊天内容；隐藏时完全不拦截点击
					"#dsh-wk-scrim{position:fixed;inset:0;z-index:2147481998;background:rgba(0,0,0,.16);opacity:0;pointer-events:none;transition:opacity .18s ease;outline:none;-webkit-tap-highlight-color:transparent}",
					"#dsh-wk-scrim.dsh-wk-scrim-visible{opacity:1;pointer-events:auto;cursor:pointer}",
					// ---- 停靠栏主体：右侧全高，收起 = 平移出屏（保留内容与宽度） ----
					"#dsh-wk-dock{position:fixed;top:0;right:0;bottom:0;width:460px;max-width:70vw;z-index:2147482000;display:flex;flex-direction:column;background:#ffffff;color:#1f2328;border-left:1px solid #d8dee4;box-shadow:-8px 0 28px rgba(0,0,0,.10);font-family:-apple-system,'SF Pro Text','PingFang SC','Microsoft YaHei',sans-serif;transition:transform .18s ease}",
					"#dsh-wk-dock.dsh-wk-collapsed{transform:translateX(100%)}",
					// ---- 右缘展开把手：停靠栏展开时自动淡出（兄弟选择器，无需 JS 状态） ----
					//    2026-08-31 两轮收窄：高(内边距14→8/字号12→11/字距2→1/文案「预览 ›」)
					//    宽(横向厚度 ~22px→~15px：内边距 4/5→2/2、字号 11→10)
					"#dsh-wk-handle{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:2147482001;writing-mode:vertical-rl;padding:8px 2px;font-size:10px;letter-spacing:1px;color:#1f2328;background:#f6f8fa;border:1px solid #d8dee4;border-right:none;border-radius:6px 0 0 6px;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;outline:none;transition:opacity .15s}",
					"@media (hover:hover){#dsh-wk-handle:hover{background:#eaeef2}}",
					"#dsh-wk-dock:not(.dsh-wk-collapsed) ~ #dsh-wk-handle,#dsh-wk-handle.dsh-wk-handle-hidden{opacity:0;visibility:hidden;pointer-events:none}",
					// ---- 停靠栏头部：标题(可截断) + 元信息 + 截断徽标 + 收起按钮 ----
					".dsh-wk-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #d8dee4;flex:none;background:#f6f8fa}",
					".dsh-wk-title{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;direction:rtl;text-align:left}",
					".dsh-wk-meta{font-size:11.5px;color:#57606a;white-space:nowrap;flex:none}",
					".dsh-wk-badge{font-size:10.5px;color:#9a6700;background:rgba(154,103,0,.12);border-radius:6px;padding:2px 7px;flex:none}",
					".dsh-wk-btn{cursor:pointer;flex:none;width:26px;height:26px;border:none;border-radius:50%;background:transparent;color:inherit;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center}",
					"@media (hover:hover){.dsh-wk-btn:hover{background:rgba(110,118,129,.22)}}",
					// ---- 左缘拖拽调宽热区 ----
					".dsh-wk-resize{position:absolute;left:0;top:0;bottom:0;width:6px;cursor:col-resize;flex:none}",
					".dsh-wk-resize:hover{background:rgba(9,105,218,.3)}",
					// ---- 内容区：pre 代码块（双栏行号）/ 状态提示 / 目录列表 / 面包屑 ----
					".dsh-wk-body{flex:1;min-height:0;overflow:auto;margin:0}",
					// 行号双栏：codewrap 是唯一滚动容器；行号列 sticky 钉左（横向滚动不动），
					// 两列同字体同行高保证行行对齐；代码列恢复可选中（复制需求，覆盖 dock 禁选）
					".dsh-wk-codewrap{flex:1;min-height:0;height:100%;overflow:auto}",
					".dsh-wk-codeinner{display:flex;align-items:flex-start;width:max-content;min-width:100%}",
					".dsh-wk-ln{margin:0;padding:12px 0 12px 12px;min-width:3.5ch;text-align:right;color:#6e7781;background:#f6f8fa;position:sticky;left:0;z-index:1;flex:none;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6;white-space:pre;user-select:none;-webkit-user-select:none}",
					".dsh-wk-pre{margin:0;padding:12px 14px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6;color:#1f2328;white-space:pre;tab-size:4;flex:none;user-select:text;-webkit-user-select:text}",
					".hl-cm{color:#6e7781;font-style:italic}.hl-st{color:#0a3069}.hl-key{color:#116329}.hl-kw{color:#cf222e}.hl-nu{color:#0550ae}.hl-fn{color:#8250df}",
					".dsh-wk-status{padding:28px;text-align:center;color:#57606a;font-size:13px}",
					".dsh-wk-hint{padding:36px 28px;text-align:center;color:#57606a;font-size:13px;line-height:2}",
					".dsh-wk-list{padding:6px 0}",
					".dsh-wk-row{display:flex;align-items:center;gap:10px;padding:6px 14px;cursor:pointer;font-size:13px}",
					".dsh-wk-row:hover{background:rgba(9,105,218,.12)}",
					".dsh-wk-rowdir .dsh-wk-name{font-weight:600}",
					".dsh-wk-ico{width:14px;flex:none;color:#bf8700}",
					".dsh-wk-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,'SF Mono',Menlo,monospace}",
					".dsh-wk-size{flex:none;color:#57606a;font-size:11.5px}",
					// ---- Session log 按钮 · 窄屏紧凑（v2.2.0 自安卓壳迁入）：≤620px 只留下载图标并收缩钉右。
					//      官方按钮列宽由父布局分配且自带 min-width:111px，藏文字不会缩，需覆盖盒子；
					//      媒体查询驱动，转屏/拉宽自适应；无新增颜色，双主题天然适配 ----
					"@media (max-width:620px){.dsh-wk-slog{width:auto!important;min-width:0!important;flex:0 0 auto!important;padding:6px 12px!important;margin-left:auto!important}}",
					"@media (max-width:620px){.dsh-wk-slog span{display:none!important}}",
					// ---- 面包屑（P0 浏览导航）：路径分段可点，点任意段跳回该层 ----
					// 外层固定层：只有它带 padding/背景/下边线；内层 row 不再复用同名类
					//（曾因嵌套同 class 导致双重 border-bottom，文字下多出一条线）
					".dsh-wk-crumbs{display:flex;align-items:center;padding:9px 12px;border-bottom:1px solid #d8dee4;flex:none;font-size:11.5px;background:#fbfcfd;white-space:nowrap}",
					".dsh-wk-crumbs-row{display:flex;align-items:center;gap:2px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}",
					".dsh-wk-crumbs-row::-webkit-scrollbar{display:none}",
					".dsh-wk-crumb{cursor:pointer;color:#0969da;padding:2px 4px;border-radius:4px;flex:none;font-family:ui-monospace,'SF Mono',Menlo,monospace}",
					".dsh-wk-crumb:hover{background:rgba(9,105,218,.12)}",
					".dsh-wk-crumb-here{color:#57606a;padding:2px 4px;flex:none;font-weight:600;font-family:ui-monospace,'SF Mono',Menlo,monospace}",
					".dsh-wk-crumb-sep{color:#d8dee4;flex:none}",
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
					// ---- 深色主题覆盖（属性选择器，优先级高于官方 media 规则） ----
					"body[data-ds-dark-theme] #dsh-wk-dock{background:#161b22;color:#c9d1d9;border-left-color:#30363d;box-shadow:-8px 0 28px rgba(0,0,0,.32)}",
					"body[data-ds-dark-theme] #dsh-wk-handle{color:#c9d1d9;background:#21262d;border-color:#30363d}",
					"@media (hover:hover){body[data-ds-dark-theme] #dsh-wk-handle:hover{background:#30363d}}",
					"body[data-ds-dark-theme] .dsh-wk-head{background:#1c2128;border-bottom-color:#30363d}",
					"body[data-ds-dark-theme] .dsh-wk-crumbs{background:#161b22;border-bottom-color:#30363d}",
					"body[data-ds-dark-theme] .dsh-wk-crumb{color:#58a6ff}",
					"body[data-ds-dark-theme] .dsh-wk-crumb:hover{background:rgba(56,139,253,.2)}",
					"body[data-ds-dark-theme] .dsh-wk-crumb-here{color:#8b949e}",
					"body[data-ds-dark-theme] .dsh-wk-crumb-sep{color:#30363d}",
					"body[data-ds-dark-theme] .dsh-wk-meta,body[data-ds-dark-theme] .dsh-wk-size,body[data-ds-dark-theme] .dsh-wk-status,body[data-ds-dark-theme] .dsh-wk-hint{color:#8b949e}",
					"body[data-ds-dark-theme] .dsh-wk-badge{color:#e3b341;background:rgba(187,128,9,.15)}",
					"body[data-ds-dark-theme] .dsh-wk-btn:hover{background:rgba(110,118,129,.3)}",
					"body[data-ds-dark-theme] .dsh-wk-resize:hover{background:rgba(56,139,253,.35)}",
					"body[data-ds-dark-theme] .dsh-wk-pre{color:#c9d1d9}",
					"body[data-ds-dark-theme] .dsh-wk-ln{background:#161b22;color:#8b949e}",
					"body[data-ds-dark-theme] .hl-cm{color:#8b949e}body[data-ds-dark-theme] .hl-st{color:#a5d6ff}body[data-ds-dark-theme] .hl-key{color:#7ee787}body[data-ds-dark-theme] .hl-kw{color:#ff7b72}body[data-ds-dark-theme] .hl-nu{color:#79c0ff}body[data-ds-dark-theme] .hl-fn{color:#d2a8ff}",
					"body[data-ds-dark-theme] .dsh-wk-row:hover{background:rgba(56,139,253,.15)}",
					"body[data-ds-dark-theme] .dsh-wk-ico{color:#e3b341}"
				].join("\n");
				document.head.appendChild(styleTag);
			}

			module.exports = { ensureStyles };

		}, // ↑ src/client/styles.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/dock.js": function (module, exports, require) {
			// 浏览器半部 · 停靠栏壳（单例 DOM + 开合 + 全局交互 + 双把手）
			// 状态：hasContent 区分"空提示"与"有内容"，收起不清内容；
			// openHook 由 browser 模块注册 —— 把手点击展开时若面板为空则进入浏览模式。
			const { ensureStyles } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/styles.js");

			var dock = null, scrim = null, handle = null, headEl = null, bodyEl = null;
			var expanded = false;
			var hasContent = false;
			var openHook = null;
			var WIDTH_KEY = "dsh-wk-width"; // 拖拽宽度持久化（v1 的 dsh-fv-width 已废弃）

			function setExpanded(on) {
				expanded = on;
				if (dock !== null) dock.classList.toggle("dsh-wk-collapsed", !on);
				if (scrim !== null) scrim.classList.toggle("dsh-wk-scrim-visible", on);
				// 直接同步按钮状态，不依赖 dock/handle 的 DOM 兄弟选择器。
				if (handle !== null) handle.classList.toggle("dsh-wk-handle-hidden", on);
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

		}, // ↑ src/client/dock.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/openpath.js": function (module, exports, require) {
			// 浏览器半部 · openPath 拦截（功能一入口）
			// 服务代理（guardedService）只有 get 陷阱 → 对实例赋自有属性即可
			// 遮蔽原型方法；必须先 bind 原方法（内部读 this.api，裸调用会崩）。
			// 渐进增强：tryView 失败（二进制/超大/围栏外）→ 回退原实现（本机原生打开 /
			// 远端 403），行为与官方一致。
			function installOpenPath(ws, tryView) {
				if (ws === null || ws === undefined || typeof ws.openPath !== "function") return false;
				var original = ws.openPath.bind(ws);
				ws.openPath = function (path) {
					return tryView(path).then(function (shown) {
						if (shown) return undefined; // 页内已预览，不再触发原生打开
						return original(path);       // 回退：本机原生打开 / 远端 403（官方行为）
					});
				};
				return true;
			}

			module.exports = { installOpenPath };

		}, // ↑ src/client/openpath.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/util.js": function (module, exports, require) {
			// 浏览器半部 · 小工具（体积格式化 / 路径截取）
			function fmtSize(n) {
				if (n < 1024) return n + " B";
				if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
				return (n / 1048576).toFixed(1) + " MB";
			}
			function basename(p) {
				var i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
				return i === -1 ? p : p.slice(i + 1);
			}
			function parentPath(p) {
				var i = p.lastIndexOf("/");
				if (i <= 0) return "/";
				return p.slice(0, i);
			}

			module.exports = { fmtSize, basename, parentPath };

		}, // ↑ src/client/util.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/highlight.js": function (module, exports, require) {
			// 浏览器半部 · 轻量语法高亮（零依赖）
			// 策略：先整段转义，再按语言正则把"普通段"喂给 hlNormal 包 span；
			// 注释/字符串优先于正则（避免关键字在字符串里被误染）。
			// 语言表 LANGS：re 必须带 /g 且永不返回空匹配（空匹配会死循环，
			// hlNormal 里有 lastIndex++ 防线，但正则本身也别写出空匹配）。
			function esc(s) {
				return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
			}
			function span(cls, s) {
				return '<span class="hl-' + cls + '">' + s + "</span>";
			}
			function kwRe(words) {
				return new RegExp("\\b(?:" + words.join("|") + ")\\b", "g");
			}
			var JS_KW = ["const","let","var","function","return","if","else","for","while","do","class","new","import","export","from","as","async","await","try","catch","finally","throw","typeof","instanceof","switch","case","break","continue","default","extends","super","this","null","true","false","undefined","yield","static","get","set","delete","void","in","of"];
			var LANGS = {
				// JS/TS：关键字 | 数字 | 函数调用名（后瞻括号）
				js: {
					line: "//", block: ["/*", "*/"], strings: ["\"", "'", "`"],
					re: new RegExp("(" + kwRe(JS_KW).source + ")|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*(?=\\s*\\())", "g"),
					groups: { 1: "kw", 2: "nu", 3: "fn" }
				},
				// JSON：true/false/null | 数字；字符串带 keyOnColon（冒号后为 key 色）
				json: {
					strings: ["\""], keyOnColon: true,
					re: /(\b(?:true|false|null)\b)|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g,
					groups: { 1: "kw", 2: "nu" }
				},
				// Python：含三引号多行字符串（multiStrings 优先于单引号规则）
				py: {
					line: "#", strings: ["\"", "'"], multiStrings: ["\"\"\"", "'''"],
					re: /(\b(?:def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|lambda|pass|yield|in|is|not|and|or|None|True|False|global|nonlocal|assert|del|async|await|match|case)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*(?=\s*\())/g,
					groups: { 1: "kw", 2: "nu", 3: "fn" }
				},
				// Shell：关键字 | 数字 | 变量赋值左值（含 $ / 花括号）
				sh: {
					line: "#", strings: ["\"", "'"],
					re: /(\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|local|source|set|echo|read|cd|sudo|exec|shift|trap|until)\b)|(\b\d+(?:\.\d+)?\b)|(\$?\{?[\w]+\}?(?=\s*[=)]))/g,
					groups: { 1: "kw", 2: "nu", 3: "key" }
				},
				// C 系大杂烩：C/C++/Java/Go/Rust/Swift/Kotlin/Scala/C#/PHP/Dart
				clike: {
					line: "//", block: ["/*", "*/"], strings: ["\"", "'"],
					re: /(\b(?:public|private|protected|static|void|int|long|double|float|char|bool|boolean|string|String|class|struct|new|delete|return|if|else|for|while|switch|case|break|continue|default|import|package|namespace|using|template|typename|const|constexpr|auto|var|let|fn|impl|pub|use|mut|match|enum|interface|extends|implements|override|virtual|final|this|self|null|nullptr|nil|None|true|false|func|chan|go|defer|select|map|range|type)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*(?=\s*\())|(\b\d+(?:\.\d+)?[a-zA-Z%]*\b)/g,
					groups: { 1: "kw", 2: "nu", 3: "fn" }
				},
				// CSS/SCSS/LESS：@规则与属性名 | 数字(带单位)与色值
				css: {
					line: null, block: ["/*", "*/"], strings: ["\"", "'"],
					re: /(@[\w-]+|[\w-]+(?=\s*:))|(\b\d+(?:\.\d+)?(?:px|em|rem|vh|vw|vmin|vmax|%|s|ms|deg|fr)?|#[0-9a-fA-F]{3,8}\b)/g,
					groups: { 1: "key", 2: "nu" }
				},
				// YAML：行首 key（含 "- " 列表项）| 数字 | 布尔/null，^$ 用 m 标志
				yaml: {
					line: "#", strings: ["\"", "'"],
					re: /^([ \t]*(?:- )?[\w.$-]+)(?=\s*:)|(\b\d+(?:\.\d+)?\b)|(\b(?:true|false|null|yes|no)\b)/gm,
					groups: { 1: "key", 2: "nu", 3: "kw" }
				}
			};
			/** 扩展名 → 语言表；未收录返回 null（纯文本，不做高亮）。 */
			function langOf(name) {
				var m = /\.([a-zA-Z0-9]+)$/.exec(name);
				var ext = m ? m[1].toLowerCase() : "";
				if (["js", "mjs", "cjs", "jsx", "ts", "tsx"].indexOf(ext) !== -1) return LANGS.js;
				if (ext === "json" || ext === "jsonc") return LANGS.json;
				if (ext === "py") return LANGS.py;
				if (["sh", "bash", "zsh"].indexOf(ext) !== -1) return LANGS.sh;
				if (["c", "h", "cc", "cpp", "hpp", "java", "go", "rs", "swift", "kt", "scala", "cs", "php", "dart"].indexOf(ext) !== -1) return LANGS.clike;
				if (ext === "css" || ext === "scss" || ext === "less") return LANGS.css;
				if (ext === "yml" || ext === "yaml") return LANGS.yaml;
				return null;
			}
			/** 普通段高亮：整段跑语言正则，命中按 groups 染色，其余转义。 */
			function hlNormal(text, lang) {
				var out = "", last = 0, m;
				lang.re.lastIndex = 0;
				while ((m = lang.re.exec(text)) !== null) {
					if (m[0] === "") { lang.re.lastIndex++; continue; } // 空匹配防线
					out += esc(text.slice(last, m.index));
					var cls = lang.groups[1] !== undefined ? lang.groups[1] : null;
					for (var g = 1; g < m.length; g++) {
						if (m[g] !== undefined) { cls = lang.groups[g] || cls; break; }
					}
					out += cls === null ? esc(m[0]) : span(cls, esc(m[0]));
					last = m.index + m[0].length;
				}
				out += esc(text.slice(last));
				return out;
			}
			function startsWithAt(code, i, s) {
				return code.substr(i, s.length) === s;
			}
			/**
			 * 主分词：按优先级扫全码 —— 行注释 → 块注释 → 多行字符串 → 单行字符串
			 * → 普通段累积。注释/字符串整体走 esc 不再染内层；普通段交给 hlNormal。
			 */
			function tokenize(code, lang) {
				if (lang === null || lang === undefined) return esc(code); // 无语言防御
				var out = "", normal = "", i = 0, n = code.length;
				function flush() {
					if (normal !== "") { out += hlNormal(normal, lang); normal = ""; }
				}
				while (i < n) {
					var consumed = false;
					var blockStart = lang.block !== undefined ? lang.block[0] : null;
					// 行注释：注意排除块注释开头相同前缀的情况（CSS 的 /* vs 无行注释；
					// 且 blockStart === null 时短路，避免 null.startsWith 崩溃）
					if (lang.line !== null && lang.line !== undefined && startsWithAt(code, i, lang.line) && (blockStart === null || !startsWithAt(code, i, blockStart))) {
						flush();
						var j = code.indexOf("\n", i);
						if (j === -1) j = n;
						out += span("cm", esc(code.slice(i, j)));
						i = j;
						consumed = true;
					} else if (lang.block !== undefined && startsWithAt(code, i, lang.block[0])) {
						// 块注释：找不到闭合就吃到文件尾
						flush();
						var end = code.indexOf(lang.block[1], i + lang.block[0].length);
						end = end === -1 ? n : end + lang.block[1].length;
						out += span("cm", esc(code.slice(i, end)));
						i = end;
						consumed = true;
					} else if (lang.multiStrings !== undefined) {
						// 多行字符串（Python 三引号）
						for (var ms = 0; ms < lang.multiStrings.length; ms++) {
							if (startsWithAt(code, i, lang.multiStrings[ms])) {
								flush();
								var close = code.indexOf(lang.multiStrings[ms], i + lang.multiStrings[ms].length);
								close = close === -1 ? n : close + lang.multiStrings[ms].length;
								out += span("st", esc(code.slice(i, close)));
								i = close;
								consumed = true;
								break;
							}
						}
					}
					if (!consumed && lang.strings !== undefined && lang.strings.indexOf(code[i]) !== -1) {
						// 单行字符串：处理 \\ 转义；遇换行视为未闭合（吃到行尾）
						flush();
						var q = code[i], j2 = i + 1;
						while (j2 < n) {
							if (code[j2] === "\\") { j2 += 2; continue; }
							if (code[j2] === q) { j2++; break; }
							if (code[j2] === "\n") break;
							j2++;
						}
						var raw = code.slice(i, j2);
						var k = j2;
						// JSON 键判定：字符串结束后跳过空白，紧跟冒号 → key 色
						while (k < n && (code[k] === " " || code[k] === "\t")) k++;
						out += span(lang.keyOnColon && code[k] === ":" ? "key" : "st", esc(raw));
						i = j2;
						consumed = true;
					}
					if (!consumed) { normal += code[i]; i++; }
				}
				flush();
				return out;
			}

			module.exports = { tokenize, langOf };

		}, // ↑ src/client/highlight.js
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/browser.js": function (module, exports, require) {
			// 浏览器半部 · 预览面板的数据加载与渲染（双入口共用）
			//   入口 A：点聊天里的文件路径 → tryView → render（精确直达）
			//   入口 B：点「预览 ›」把手 → openBrowse（从工作区根开始逛，P0）
			// 位置记忆：localStorage 记住上次浏览路径，重开面板回到原处（失败回退根列表）。
			const { ensureDock, setExpanded, headEl, bodyEl, crumbsEl } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/dock.js");
			const { fmtSize, basename, parentPath } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/util.js");
			const { tokenize, langOf } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/highlight.js");

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

		}, // ↑ src/client/browser.js
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
		"/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/index.js": function (module, exports, require) {
			// ============================================================================
			// @apanoo/dsh-web-kit — 浏览器半部入口（打包器生成到 lib/client.js）
			// ----------------------------------------------------------------------------
			// 功能一【文件预览停靠栏】：拦截 workspaces.openPath —— 点击聊天里的文件路径
			//   → 右侧停靠栏内查看（语法高亮 / 目录下钻 / 拖拽调宽 / 外点与 Esc 收起）。
			//   + P0 浏览模式：点「预览 ›」把手从工作区根开始逛（面包屑 + 位置记忆）。
			// 功能二【小屏侧栏管理】：视口 <1024px 时隐藏官方收起态的 56px 细条
			//   （含其网格轨道），改用左缘贴边细把手「›」转发官方 toggle 开合侧栏。
			// ============================================================================
			const { ensureDock, setOpenHook } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/dock.js");
			const { installOpenPath } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/openpath.js");
			const { openBrowse, tryView, ensureRoots } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/browser.js");
			const { installSessionLog } = require("/Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit/src/client/sessionlog.js");

			function apply(ctx) {
				var ws = ctx.get("workspaces");
				installOpenPath(ws, tryView);
				// 把手入口：面板为空时点击 → 工作区浏览模式（有预览内容则保持原样）
				setOpenHook(openBrowse);
				// 预建停靠栏与把手：首帧就具备"主动打开"能力，不依赖第一次点击
				ensureDock();
				// 预热工作区根缓存：首次点链接时面包屑首段就能显示工作区名（fire-and-forget）
				ensureRoots();
				// Session log 按钮 · 窄屏紧凑化（官方按钮打标记类，样式见 styles.js 媒体查询）
				installSessionLog();
			}

			module.exports = { name: "web-kit", inject: ["workspaces"], apply: apply };

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
