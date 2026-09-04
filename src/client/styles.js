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
		"body[data-ds-dark-theme] .dsh-wk-ico{color:#e3b341}",
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
