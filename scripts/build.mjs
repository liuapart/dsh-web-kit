#!/usr/bin/env node
// ============================================================================
// dsh-web-kit 构建部署脚本
// ----------------------------------------------------------------------------
// 本插件是零依赖纯 JS（无需打包器），"构建" = 语法校验 + 原样部署到 dsh profile。
// 用法：
//   npm run build          # 校验 + 部署到默认 profile（~/.dsh/profiles/web）
//   DSH_PROFILE_DIR=/path/to/profile npm run build   # 指定其他 profile
// 部署后需重启 dsh 并刷新浏览器页面才生效：
//   launchctl kickstart -k gui/501/com.dsh.web
// ============================================================================
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const profileDir = process.env.DSH_PROFILE_DIR ?? join(homedir(), ".dsh/profiles/web");
const target = join(profileDir, "node_modules/@apanoo/dsh-web-kit");

// ① 语法校验：服务端半部与浏览器半部都必须能被 node 解析（--check 只解析不执行）
for (const f of ["lib/index.js", "lib/client.js"]) {
	execFileSync(process.execPath, ["--check", join(root, f)], { stdio: "inherit" });
	console.log("✓ 语法 OK:", f);
}

// ② 目标 profile 存在性检查（给出可操作的错误提示而不是堆栈）
if (!existsSync(profileDir)) {
	console.error(`✗ 未找到 dsh profile: ${profileDir}`);
	console.error("  可用环境变量指定：DSH_PROFILE_DIR=/path/to/profile npm run build");
	process.exit(1);
}

// ③ 部署：先删后拷（防止改名/删除的文件在目标目录残留旧版本）
rmSync(target, { recursive: true, force: true });
cpSync(join(root, "package.json"), join(target, "package.json"));
cpSync(join(root, "lib"), join(target, "lib"), { recursive: true });
console.log("✓ 已部署到:", target);
console.log("  生效步骤: launchctl kickstart -k gui/501/com.dsh.web 然后刷新浏览器页面");
