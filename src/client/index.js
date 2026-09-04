// ============================================================================
// @apanoo/dsh-web-kit — 浏览器半部入口（打包器生成到 lib/client.js）
// ----------------------------------------------------------------------------
// 功能一【文件预览停靠栏】：拦截 workspaces.openPath —— 点击聊天里的文件路径
//   → 右侧停靠栏内查看（语法高亮 / 目录下钻 / 拖拽调宽 / 外点与 Esc 收起）。
//   + P0 浏览模式：点「预览 ›」把手从工作区根开始逛（面包屑 + 位置记忆）。
// 功能二【小屏侧栏管理】：视口 <1024px 时隐藏官方收起态的 56px 细条
//   （含其网格轨道），改用左缘贴边细把手「›」转发官方 toggle 开合侧栏。
// 功能三【PWA 顶区下拉刷新】：iOS 主屏幕 PWA 无原生下拉刷新，屏幕顶部
//   120px 内下滑（滚动位置无关，同安卓壳 TopZoneSwipeLayout）→ 越阈松手整页
//   刷新；仅独立模式生效，浏览器模式保持 Safari 原生行为。
// ============================================================================
const { ensureDock, setOpenHook } = require("./dock.js");
const { installOpenPath } = require("./openpath.js");
const { openBrowse, tryView, ensureRoots } = require("./browser.js");
const { installSessionLog } = require("./sessionlog.js");
const { installPullRefresh } = require("./pullrefresh.js");

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
	// PWA 顶区下拉刷新（仅独立模式；样式见 styles.js #dsh-wk-ptr）
	installPullRefresh();
}

module.exports = { name: "web-kit", inject: ["workspaces"], apply: apply };
