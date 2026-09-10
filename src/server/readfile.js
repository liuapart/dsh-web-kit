// 服务端半部 · 文件读取（图片识别 + 二进制嗅探 + 截断读取）
const { open } = require("node:fs/promises");

const MAX_READ = 1024 * 1024;        // 文本读取上限 1MB，超出返回截断标记
const MAX_IMAGE = 20 * 1024 * 1024;  // 图片 data URL 上限 20MB（base64 膨胀 4/3），超出回退原生打开

// 图片魔数表：按文件头判定，比扩展名可靠（扩展名经常不可信）
const IMAGE_MAGIC = [
	{ prefix: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png" },  // PNG
	{ prefix: [0xff, 0xd8, 0xff], mime: "image/jpeg" },                               // JPEG/JFIF/EXIF
	{ prefix: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },                          // GIF87a/GIF89a
	{ prefix: [0x42, 0x4d], mime: "image/bmp" },                                      // BMP
	{ prefix: [0x00, 0x00, 0x01, 0x00], mime: "image/x-icon" },                       // ICO
];

/** 在头部缓冲匹配图片魔数；WEBP 单独判（RIFF 固定头 + 偏移 8 的 "WEBP"）。 */
function sniffImage(head) {
	for (var i = 0; i < IMAGE_MAGIC.length; i++) {
		var sig = IMAGE_MAGIC[i].prefix;
		var hit = true;
		for (var j = 0; j < sig.length; j++) {
			if (head[j] !== sig[j]) { hit = false; break; }
		}
		if (hit) return IMAGE_MAGIC[i].mime;
	}
	if (head.length >= 12 &&
		head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
		head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) {
		return "image/webp";
	}
	return null;
}

async function readFilePart(real, info) {
	if (info.size > 64 * 1024 * 1024) return { status: 413, error: "too-large" };
	const handle = await open(real, "r");
	try {
		// 嗅探头部 8KB
		const headLen = Math.min(info.size, 8192);
		const head = Buffer.alloc(headLen);
		await handle.read(head, 0, headLen, 0);

		// —— 位图：魔数命中 → 整文件 base64 data URL（kind:"image"），浏览器半部页内渲染 ——
		const mime = sniffImage(head);
		if (mime !== null) {
			if (info.size > MAX_IMAGE) return { status: 413, error: "image-too-large" };
			const buf = Buffer.alloc(info.size);
			await handle.read(buf, 0, info.size, 0);
			return {
				status: 200,
				body: {
					ok: true,
					kind: "image",
					path: real,
					size: info.size,
					mime: mime,
					dataUrl: "data:" + mime + ";base64," + buf.toString("base64")
				}
			};
		}

		// —— SVG：文本格式无魔数，按扩展名识别（<img> 上下文里 SVG 脚本不执行，安全） ——
		if (/\.svg$/i.test(real)) {
			if (info.size > MAX_IMAGE) return { status: 413, error: "image-too-large" };
			const svg = Buffer.alloc(info.size);
			await handle.read(svg, 0, info.size, 0);
			return {
				status: 200,
				body: {
					ok: true,
					kind: "image",
					path: real,
					size: info.size,
					mime: "image/svg+xml",
					dataUrl: "data:image/svg+xml;base64," + svg.toString("base64")
				}
			};
		}

		// NUL 字节即判为二进制 → 415，浏览器半部会回退原 openPath
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

module.exports = { readFilePart, MAX_READ, MAX_IMAGE };
