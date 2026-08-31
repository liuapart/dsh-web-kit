// 服务端半部 · 统一 JSON 响应（no-store：预览内容永远取最新，不走缓存）
function json(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}

module.exports = { json };
