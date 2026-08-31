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
