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
const { ensureDock } = require("./dock.js");
const { installSessionLog } = require("./sessionlog.js");
const { installPullRefresh } = require("./pullrefresh.js");

function apply(ctx) {
	// 小屏侧栏贴边把手（功能一）：首帧即具备开合入口
	ensureDock();
	// Session log 按钮 · 窄屏紧凑化（官方按钮打标记类，样式见 styles.js 媒体查询）
	installSessionLog();
	// PWA 顶区下拉刷新（仅独立模式；样式见 styles.js #dsh-wk-ptr）
	installPullRefresh();
}

module.exports = { name: "web-kit", inject: [], apply: apply };
