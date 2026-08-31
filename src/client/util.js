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
