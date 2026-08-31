// 服务端半部 · 文件读取（二进制嗅探 + 截断读取）
const { open } = require("node:fs/promises");

const MAX_READ = 1024 * 1024; // 文本读取上限 1MB，超出返回截断标记

async function readFilePart(real, info) {
	if (info.size > 64 * 1024 * 1024) return { status: 413, error: "too-large" };
	const handle = await open(real, "r");
	try {
		// 嗅探头部 8KB：出现 NUL 字节即判为二进制 → 415，浏览器半部会回退原 openPath
		const headLen = Math.min(info.size, 8192);
		const head = Buffer.alloc(headLen);
		await handle.read(head, 0, headLen, 0);
		if (head.includes(0)) return { status: 415, error: "binary" };
		const readLen = Math.min(info.size, MAX_READ);
		const buf = Buffer.alloc(readLen);
		await handle.read(buf, 0, readLen, 0);
		return {
			status: 200,
			body: {
				ok: true,
				kind: "file",
				path: real,
				size: info.size,
				truncated: info.size > readLen,
				content: buf.toString("utf8")
			}
		};
	} finally {
		await handle.close();
	}
}

module.exports = { readFilePart, MAX_READ };
