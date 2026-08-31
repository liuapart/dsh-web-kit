// ============================================================================
// @apanoo/dsh-web-kit v2 — 浏览器半部（client module）
// ----------------------------------------------------------------------------
// 功能一【文件预览停靠栏】：拦截 workspaces.openPath —— 点击聊天里的文件路径
//   → 右侧停靠栏内查看（语法高亮 / 目录下钻 / 拖拽调宽 / 外点与 Esc 收起）。
//   不可查看（二进制 / 路由 404 / 接口缺失）时回退原实现（本机原生打开 /
//   远端 403），行为与官方一致 —— 渐进增强，不做破坏性接管。
// 功能二【小屏侧栏管理】：视口 <1024px 时隐藏官方收起态的 56px 细条
//   （含其网格轨道），改用左缘贴边细把手「›」转发官方 toggle 开合侧栏。
//
// 历史调整记录（踩坑备忘，勿回退）：
//   - openPath 必须 bind(this)：原方法内部读 this.api，裸调用 TypeError
//   - 深色主题用 body[data-ds-dark-theme] 属性选择器：优先级高于官方
//     prefers-color-scheme 规则，不依赖 <style> 书写顺序（曾因层叠顺序翻车）
//   - 外点收起用 pointerdown 仅观察不拦截：拦截会吃掉点击导致路径点不开
//   - 收起态细条 = 网格轨道 56px（computeColumns 硬编码）+ 轨道内 rail 内容；
//     只 display:none 内容不够，必须再覆盖 frame 的内联 grid-template-columns
//     （!important 才能压过内联样式）才能真正回收宽度
// ============================================================================
window.__ModuleLoader__.load({
	id: "@apanoo/dsh-web-kit",
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// ====================================================================
		// 一、样式（ensureStyles）：一次性注入全部 CSS
		//    - 默认浅色；深色统一走 body[data-ds-dark-theme] 属性选择器覆盖
		//    - z-index 约定：停靠栏 2147482000 > 把手 2147482001 > 侧栏把手 2147481999
		// ====================================================================
		var styleTag = null;
		function ensureStyles() {
			if (styleTag !== null) return;
			styleTag = document.createElement("style");
			styleTag.textContent = [
				// ---- 停靠栏主体：右侧全高，收起 = 平移出屏（保留内容与宽度） ----
				"#dsh-wk-dock{position:fixed;top:0;right:0;bottom:0;width:460px;max-width:70vw;z-index:2147482000;display:flex;flex-direction:column;background:#ffffff;color:#1f2328;border-left:1px solid #d8dee4;box-shadow:-8px 0 28px rgba(0,0,0,.10);font-family:-apple-system,'SF Pro Text','PingFang SC','Microsoft YaHei',sans-serif;transition:transform .18s ease}",
				"#dsh-wk-dock.dsh-wk-collapsed{transform:translateX(100%)}",
				// ---- 右缘展开把手：停靠栏展开时自动淡出（兄弟选择器，无需 JS 状态） ----
				"#dsh-wk-handle{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:2147482001;writing-mode:vertical-rl;padding:14px 5px 14px 7px;font-size:12px;letter-spacing:2px;color:#1f2328;background:#f6f8fa;border:1px solid #d8dee4;border-right:none;border-radius:8px 0 0 8px;cursor:pointer;user-select:none;transition:opacity .15s}",
				"#dsh-wk-handle:hover{background:#eaeef2}",
				"#dsh-wk-dock:not(.dsh-wk-collapsed) ~ #dsh-wk-handle{opacity:0;pointer-events:none}",
				// ---- 停靠栏头部：标题(可截断) + 元信息 + 截断徽标 + 收起按钮 ----
				".dsh-wk-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #d8dee4;flex:none;background:#f6f8fa}",
				".dsh-wk-title{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;direction:rtl;text-align:left}",
				".dsh-wk-meta{font-size:11.5px;color:#57606a;white-space:nowrap;flex:none}",
				".dsh-wk-badge{font-size:10.5px;color:#9a6700;background:rgba(154,103,0,.12);border-radius:6px;padding:2px 7px;flex:none}",
				".dsh-wk-btn{cursor:pointer;flex:none;width:26px;height:26px;border:none;border-radius:50%;background:transparent;color:inherit;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center}",
				".dsh-wk-btn:hover{background:rgba(110,118,129,.22)}",
				// ---- 左缘拖拽调宽热区 ----
				".dsh-wk-resize{position:absolute;left:0;top:0;bottom:0;width:6px;cursor:col-resize;flex:none}",
				".dsh-wk-resize:hover{background:rgba(9,105,218,.3)}",
				// ---- 内容区：pre 代码块 / 状态提示 / 目录列表 ----
				".dsh-wk-body{flex:1;min-height:0;overflow:auto;margin:0}",
				".dsh-wk-pre{margin:0;padding:12px 14px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6;color:#1f2328;white-space:pre;tab-size:4}",
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
				// ---- 小屏侧栏贴边把手：12×64 细条，平时半透明，悬停显形 ----
				"#dsh-wk-side-open{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147481999;width:12px;height:64px;border:none;border-radius:0 8px 8px 0;background:rgba(128,140,160,.26);color:#e8eaf0;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;opacity:.4;transition:opacity .15s;padding:0}",
				"#dsh-wk-side-open:hover{opacity:1;background:rgba(58,66,82,.85)}",
				"@media(prefers-color-scheme:light){#dsh-wk-side-open{color:#1f2328;background:rgba(160,174,192,.3);border:1px solid #d8dee4;border-left:none}#dsh-wk-side-open:hover{background:#eaeef2}}",
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
				"body[data-ds-dark-theme] #dsh-wk-handle:hover{background:#30363d}",
				"body[data-ds-dark-theme] .dsh-wk-head{background:#1c2128;border-bottom-color:#30363d}",
				"body[data-ds-dark-theme] .dsh-wk-meta,body[data-ds-dark-theme] .dsh-wk-size,body[data-ds-dark-theme] .dsh-wk-status,body[data-ds-dark-theme] .dsh-wk-hint{color:#8b949e}",
				"body[data-ds-dark-theme] .dsh-wk-badge{color:#e3b341;background:rgba(187,128,9,.15)}",
				"body[data-ds-dark-theme] .dsh-wk-btn:hover{background:rgba(110,118,129,.3)}",
				"body[data-ds-dark-theme] .dsh-wk-resize:hover{background:rgba(56,139,253,.35)}",
				"body[data-ds-dark-theme] .dsh-wk-pre{color:#c9d1d9}",
				"body[data-ds-dark-theme] .hl-cm{color:#8b949e}body[data-ds-dark-theme] .hl-st{color:#a5d6ff}body[data-ds-dark-theme] .hl-key{color:#7ee787}body[data-ds-dark-theme] .hl-kw{color:#ff7b72}body[data-ds-dark-theme] .hl-nu{color:#79c0ff}body[data-ds-dark-theme] .hl-fn{color:#d2a8ff}",
				"body[data-ds-dark-theme] .dsh-wk-row:hover{background:rgba(56,139,253,.15)}",
				"body[data-ds-dark-theme] .dsh-wk-ico{color:#e3b341}"
			].join("\n");
			document.head.appendChild(styleTag);
		}

		// ====================================================================
		// 二、停靠栏状态（单例；hasContent 区分"空提示"与"有内容"，收起不清内容）
		// ====================================================================
		var dock = null, handle = null, headEl = null, bodyEl = null;
		var expanded = false;
		var hasContent = false;
		var WIDTH_KEY = "dsh-wk-width"; // 拖拽宽度持久化（v1 的 dsh-fv-width 已废弃）

		// ====================================================================
		// 三、小工具：体积格式化 / 路径截取
		// ====================================================================
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

		// ====================================================================
		// 四、轻量语法高亮（零依赖）
		//    策略：先整段转义，再按语言正则把"普通段"喂给 hlNormal 包 span；
		//    注释/字符串优先于正则（避免关键字在字符串里被误染）。
		//    语言表 LANGS：re 必须带 /g 且永不返回空匹配（空匹配会死循环，
		//    hlNormal 里有 lastIndex++ 防线，但正则本身也别写出空匹配）。
		// ====================================================================
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

		// ====================================================================
		// 五、停靠栏开合 + 全局交互（Esc / 外点收起）
		// ====================================================================
		function setExpanded(on) {
			expanded = on;
			if (dock !== null) dock.classList.toggle("dsh-wk-collapsed", !on);
		}

		function onKey(e) {
			if (e.key === "Escape" && expanded) setExpanded(false);
		}

		// 外点收起：pointerdown 只观察不拦截 —— 拦截会吞掉本次点击，
		// 用户就点不开聊天里的路径了（点击后渲染流程会重新展开）
		function onOutside(e) {
			if (!expanded) return;
			if (dock !== null && dock.contains(e.target)) return;
			if (handle !== null && handle.contains(e.target)) return;
			setExpanded(false);
		}

		// ====================================================================
		// 六、DOM 构建（ensureDock：单例创建停靠栏 + 双把手 + 侧栏贴边把手）
		// ====================================================================
		function ensureDock() {
			ensureStyles();
			if (dock !== null) return;
			dock = document.createElement("div");
			dock.id = "dsh-wk-dock";
			dock.className = "dsh-wk-collapsed";

			// —— 左缘拖拽调宽：320~760px，pointerup 落盘 localStorage ——
			var resize = document.createElement("div");
			resize.className = "dsh-wk-resize";
			resize.title = "拖拽调宽";
			var dragWidth = function (e) {
				if (e.buttons !== 1) return;
				var w = Math.min(Math.max(window.innerWidth - e.clientX, 320), 760);
				dock.style.width = w + "px";
			};
			var saveWidth = function () {
				try { localStorage.setItem(WIDTH_KEY, dock.style.width); } catch { }
				document.removeEventListener("pointermove", dragWidth);
			};
			resize.addEventListener("pointerdown", function () {
				document.addEventListener("pointermove", dragWidth);
			});
			document.addEventListener("pointerup", saveWidth);

			headEl = document.createElement("div");
			headEl.className = "dsh-wk-head";
			bodyEl = document.createElement("div");
			bodyEl.className = "dsh-wk-body";
			showHint();

			// —— 右缘竖排把手：停靠栏收起时可见，点击展开（主动打开入口） ——
			handle = document.createElement("div");
			handle.id = "dsh-wk-handle";
			handle.textContent = "文件预览 ›";
			handle.title = "展开文件预览";
			handle.addEventListener("click", function () { setExpanded(true); });

			// —— 功能二：小屏侧栏贴边把手 ——
			// 官方收起细条被隐藏后，这里是唯一入口；点击转发给官方 toggle：
			//  优先选收起态（[data-sidebar-collapsed] 作用域）里的 toggle 按钮，
			//  找不到（侧栏展开态）再全局找 —— 正好实现开↔关切换。
			// 类名用 [class*="_toggle"] 后缀匹配：CSS Modules 哈希在构建间会变，
			// 但 "_toggle"/"_root" 这类源码名后缀稳定。
			var sideOpen = document.createElement("div");
			sideOpen.id = "dsh-wk-side-open";
			sideOpen.textContent = "›";
			sideOpen.title = "侧栏";
			sideOpen.setAttribute("role", "button");
			sideOpen.setAttribute("aria-label", "侧栏开关");
			sideOpen.addEventListener("click", function () {
				var t = document.querySelector('[data-sidebar-collapsed] button[class*="_toggle"]')
					|| document.querySelector('button[class*="_toggle"]');
				if (t !== null) t.click();
			});

			dock.appendChild(resize);
			dock.appendChild(headEl);
			dock.appendChild(bodyEl);
			document.body.appendChild(dock);
			document.body.appendChild(handle);
			document.body.appendChild(sideOpen);
			// 恢复上次拖拽宽度（限三位数 px，防脏数据）
			try {
				var w = localStorage.getItem(WIDTH_KEY);
				if (w !== null && /^\d{3}px$/.test(w)) dock.style.width = w;
			} catch { }
			document.addEventListener("keydown", onKey);
			document.addEventListener("pointerdown", onOutside);
		}

		// ====================================================================
		// 七、头部空态（首次建栏时的操作提示）
		// ====================================================================
		function showHint() {
			headEl.textContent = "";
			var t = document.createElement("div");
			t.className = "dsh-wk-title";
			t.textContent = "文件预览";
			headEl.appendChild(t);
			var fold = document.createElement("button");
			fold.className = "dsh-wk-btn";
			fold.setAttribute("aria-label", "收起");
			fold.title = "收起（Esc）";
			fold.textContent = "»";
			fold.addEventListener("click", function () { setExpanded(false); });
			headEl.appendChild(fold);
			bodyEl.textContent = "";
			var hint = document.createElement("div");
			hint.className = "dsh-wk-hint";
			hint.textContent = "点击聊天消息里的文件路径，即可在此预览\n目录可以直接下钻浏览";
			bodyEl.appendChild(hint);
		}

		// ====================================================================
		// 八、数据加载与渲染
		// ====================================================================
		/** 已知能看时的直接加载（目录下钻 / 上一级用）；失败静默保持原状。 */
		async function loadPath(path) {
			var res = await fetch("/web-kit?path=" + encodeURIComponent(path), {
				headers: { accept: "application/json" }
			});
			if (!res.ok) throw new Error("HTTP " + res.status);
			var data = await res.json();
			if (data === null || typeof data !== "object" || data.ok !== true) throw new Error("bad payload");
			render(path, data);
		}

		/** 渲染一次预览：头部（返回/标题/徽标/元信息/收起）+ 主体（目录列表或代码）。 */
		function render(path, data) {
			ensureDock();
			hasContent = true;
			headEl.textContent = "";
			if (data.kind === "dir") {
				var up = document.createElement("button");
				up.className = "dsh-wk-btn";
				up.setAttribute("aria-label", "上一级");
				up.title = "上一级";
				up.textContent = "↑";
				up.addEventListener("click", function () { loadPath(parentPath(path)).catch(function () { }); });
				headEl.appendChild(up);
			}
			var title = document.createElement("div");
			title.className = "dsh-wk-title";
			title.textContent = data.kind === "dir" ? basename(path) + "/" : basename(path);
			title.title = path; // 悬停看全路径
			var meta = document.createElement("div");
			meta.className = "dsh-wk-meta";
			if (data.kind === "dir") {
				meta.textContent = data.entries.length + " 项" + (data.truncated ? "（>500 截断）" : "");
			} else {
				meta.textContent = fmtSize(data.size) + (data.truncated ? "（已截断）" : "");
			}
			var fold = document.createElement("button");
			fold.className = "dsh-wk-btn";
			fold.setAttribute("aria-label", "收起");
			fold.title = "收起（Esc）";
			fold.textContent = "»";
			fold.addEventListener("click", function () { setExpanded(false); });
			headEl.appendChild(title);
			if (data.kind === "file" && data.truncated) {
				var badge = document.createElement("span");
				badge.className = "dsh-wk-badge";
				badge.textContent = "> 1 MB";
				headEl.appendChild(badge);
			}
			headEl.appendChild(meta);
			headEl.appendChild(fold);

			bodyEl.textContent = "";
			if (data.kind === "dir") {
				// —— 目录：行点击下钻（名字拼路径；服务端已排序、已过滤噪音） ——
				var list = document.createElement("div");
				list.className = "dsh-wk-list";
				if (data.entries.length === 0) {
					var empty = document.createElement("div");
					empty.className = "dsh-wk-status";
					empty.textContent = "空目录（.git / node_modules / .DS_Store 已隐藏）";
					list.appendChild(empty);
				}
				for (var idx = 0; idx < data.entries.length; idx++) {
					(function (entry) {
						var row = document.createElement("div");
						row.className = "dsh-wk-row" + (entry.type === "dir" ? " dsh-wk-rowdir" : "");
						var icon = document.createElement("span");
						icon.className = "dsh-wk-ico";
						icon.textContent = entry.type === "dir" ? "▸" : "▫";
						var name = document.createElement("span");
						name.className = "dsh-wk-name";
						name.textContent = entry.name + (entry.type === "dir" ? "/" : "");
						var size = document.createElement("span");
						size.className = "dsh-wk-size";
						size.textContent = entry.type === "file" && entry.size !== null ? fmtSize(entry.size) : "";
						row.appendChild(icon);
						row.appendChild(name);
						row.appendChild(size);
						row.addEventListener("click", function () {
							loadPath(path + "/" + entry.name).catch(function () { });
						});
						list.appendChild(row);
					})(data.entries[idx]);
				}
				bodyEl.appendChild(list);
			} else {
				// —— 文件：有语言 → innerHTML 注入高亮 span；否则纯文本（textContent 防注入） ——
				var pre = document.createElement("pre");
				pre.className = "dsh-wk-pre";
				var lang = langOf(path);
				if (lang !== null) {
					pre.innerHTML = tokenize(data.content, lang);
				} else {
					pre.textContent = data.content;
				}
				bodyEl.appendChild(pre);
			}
			setExpanded(true);
		}

		/**
		 * 尝试在页内查看：能看 → 渲染并返回 true；不能（二进制/超大/围栏外/
		 * 路由缺失）→ false，调用方回退原 openPath。所有异常一律吞掉返回 false。
		 */
		async function tryView(path) {
			if (typeof path !== "string" || path === "") return false;
			try {
				var res = await fetch("/web-kit?path=" + encodeURIComponent(path), {
					headers: { accept: "application/json" }
				});
				if (!res.ok) return false;
				var data = await res.json();
				if (data === null || typeof data !== "object" || data.ok !== true) return false;
				if (data.kind === "file" && typeof data.content !== "string") return false;
				if (data.kind === "dir" && !Array.isArray(data.entries)) return false;
				if (data.kind !== "file" && data.kind !== "dir") return false;
				render(path, data);
				return true;
			} catch {
				return false;
			}
		}

		// ====================================================================
		// 九、openPath 拦截（apply：dsh 客户端生命周期入口）
		//    服务代理（guardedService）只有 get 陷阱 → 对实例赋自有属性即可
		//    遮蔽原型方法；必须先 bind 原方法（内部读 this.api，裸调用会崩）。
		// ====================================================================
		function apply(ctx) {
			var ws = ctx.get("workspaces");
			if (ws === null || ws === undefined || typeof ws.openPath !== "function") return;
			var original = ws.openPath.bind(ws);
			ws.openPath = function (path) {
				return tryView(path).then(function (shown) {
					if (shown) return undefined; // 页内已预览，不再触发原生打开
					return original(path);       // 回退：本机原生打开 / 远端 403（官方行为）
				});
			};
			// 预建停靠栏与把手：首帧就具备"主动打开"能力，不依赖第一次点击
			ensureDock();
		}

		module.exports = { name: "web-kit", inject: ["workspaces"], apply: apply };
		return module.exports;
	}
});
