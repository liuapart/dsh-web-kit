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
