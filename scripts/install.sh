#!/usr/bin/env bash
# install.sh — 把本仓库的 @apanoo/dsh-web-kit 部署到本机 dsh 的 web profile。
#
# 用法（在目标机 clone 本仓库后执行）：
#   bash scripts/install.sh
#
# 行为：
#   1. 把 lib/ + package.json 复制到 $DSH_HOME/profiles/web/node_modules/@apanoo/dsh-web-kit/
#   2. node --check 校验两个入口文件
#   3. 幂等地向 cordis.patch.yml 追加 web-kit 的 insert 块（已存在则跳过）
#
# 幂等：重复执行安全，只会覆盖插件文件。
# 生效：安装后需重启 dsh 进程，并强制刷新浏览器（⌘⇧R）。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="$DSH_HOME/profiles/web"
PATCH="$PROFILE/cordis.patch.yml"
DEST="$PROFILE/node_modules/@apanoo/dsh-web-kit"

# ── 前置检查 ────────────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "✗ 未找到 node，请先安装 Node.js"; exit 1; }

if [ ! -f "$PROFILE/package.json" ]; then
  echo "✗ 未找到 dsh web profile：$PROFILE"
  echo "  请先启动一次 dsh web 完成初始化，再运行本脚本。"
  exit 1
fi

[ -f "$REPO_ROOT/lib/index.js" ] || { echo "✗ 仓库缺少 lib/index.js，请在完整的仓库 clone 中运行"; exit 1; }
[ -f "$REPO_ROOT/lib/client.js" ] || { echo "✗ 仓库缺少 lib/client.js，请在完整的仓库 clone 中运行"; exit 1; }

# ── 1. 部署插件文件 ─────────────────────────────────────────────────────────
mkdir -p "$DEST"
rm -rf "$DEST/lib"
cp -R "$REPO_ROOT/lib" "$DEST/lib"
cp "$REPO_ROOT/package.json" "$DEST/package.json"

VERSION="$(node -p "require('$DEST/package.json').version")"
echo "• 插件文件已复制：@apanoo/dsh-web-kit v$VERSION"

# ── 2. 语法自检 ────────────────────────────────────────────────────────────
node --check "$DEST/lib/index.js"
node --check "$DEST/lib/client.js"
echo "• lib/index.js 与 lib/client.js 语法校验通过"

# ── 3. patch 注册（幂等） ───────────────────────────────────────────────────
# 注意：insert 块必须位于 patch 文件顶层；重复追加会导致 duplicate loader
# entry id 启动失败，因此先检查再追加。
if grep -q "id: web-kit" "$PATCH" 2>/dev/null; then
  echo "• cordis.patch.yml 已包含 web-kit，跳过 patch 追加"
else
  cat >> "$PATCH" <<'EOF'

# @apanoo/dsh-web-kit: 网页增强套件（聊天文件路径预览停靠栏 + 小屏侧栏管理）
- insert:
    - id: web-kit
      name: '@apanoo/dsh-web-kit'
EOF
  echo "• 已追加 web-kit 到 cordis.patch.yml"
fi

echo "✓ 部署完成：$DEST"
echo "  下一步：重启 dsh 进程加载新插件，然后浏览器强制刷新（⌘⇧R）。"
