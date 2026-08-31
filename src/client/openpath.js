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
