#!/usr/bin/env node
// ============================================================================
// dsh-web-kit 构建部署脚本
// ----------------------------------------------------------------------------
// 流程：src/（CommonJS 模块源码） --bundle.mjs--> lib/（单文件构建物）
//       --语法校验--> 部署到 dsh profile 的 node_modules
// 用法：
//   npm run build          # 打包 + 校验 + 部署到默认 profile（~/.dsh/profiles/web）
//   DSH_PROFILE_DIR=/path/to/profile npm run build   # 指定其他 profile
// 生效规则：只改 client 则刷新浏览器；改 server/profile 才按 docs/runbook 重启 dsh。
// 部署前会保留上一版，供 scripts/safe-mode.sh rollback 使用。
// ============================================================================
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { bundle } from "./bundle.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const profileDir = process.env.DSH_PROFILE_DIR ?? join(homedir(), ".dsh/profiles/web");
const target = join(profileDir, "node_modules/@apanoo/dsh-web-kit");
const previous = join(profileDir, "node_modules/@apanoo/.dsh-web-kit.previous");

// ① 打包：src/ → lib/（构建物；编辑请改 src/，lib 由打包器生成）
const client = await bundle({
	entry: join(root, "src/client/index.js"),
	out: join(root, "lib/client.js"),
	kind: "browser",
	banner: `// ============================================================================
// @apanoo/dsh-web-kit — 浏览器半部【构建物，勿手改；改 src/client/ 后 npm run build】
// ============================================================================
`
});
console.log("✓ 打包 lib/client.js:", client.modules, "个模块");

const server = await bundle({
	entry: join(root, "src/server/index.js"),
	out: join(root, "lib/index.js"),
	kind: "esm",
	banner: `// ============================================================================
// @apanoo/dsh-web-kit — 服务端半部【构建物，勿手改；改 src/server/ 后 npm run build】
// ============================================================================
`
});
console.log("✓ 打包 lib/index.js:", server.modules, "个模块,", server.externals, "个 node 内建");

// ② 语法校验：产物必须能被 node 解析（--check 只解析不执行）
for (const f of ["lib/index.js", "lib/client.js"]) {
	execFileSync(process.execPath, ["--check", join(root, f)], { stdio: "inherit" });
	console.log("✓ 语法 OK:", f);
}

// ③ 目标 profile 存在性检查（给出可操作的错误提示而不是堆栈）
if (!existsSync(profileDir)) {
	console.error(`✗ 未找到 dsh profile: ${profileDir}`);
	console.error("  可用环境变量指定：DSH_PROFILE_DIR=/path/to/profile npm run build");
	process.exit(1);
}

// ④ 部署：先保留上一版，再先删后拷（防止改名/删除的文件残留）
//    备份供 scripts/safe-mode.sh rollback 使用；部署失败时立即恢复旧版。
if (existsSync(target)) {
	rmSync(previous, { recursive: true, force: true });
	cpSync(target, previous, { recursive: true });
	console.log("✓ 已备份上一版:", previous);
}
try {
	rmSync(target, { recursive: true, force: true });
	cpSync(join(root, "package.json"), join(target, "package.json"));
	cpSync(join(root, "lib"), join(target, "lib"), { recursive: true });
} catch (error) {
	// 复制中途失败也不留下半套插件：恢复上一版，错误继续抛出让调用方感知。
	rmSync(target, { recursive: true, force: true });
	if (existsSync(previous)) cpSync(previous, target, { recursive: true });
	throw error;
}
console.log("✓ 已部署到:", target);
console.log("  纯 client 改动：构建后刷新浏览器即可；server/profile 改动：按 docs/PLUGIN-UPDATE-RUNBOOK.md 操作");
