#!/bin/bash
# dsh-web-kit 安全模式 / 回滚工具（macOS launchd）
# 用法：
#   ./scripts/safe-mode.sh install   安装安全模式 LaunchAgent（不切换）
#   ./scripts/safe-mode.sh enter     停止正常 dsh，启动禁用 web-kit 的安全模式
#   ./scripts/safe-mode.sh restore   停止安全模式，恢复正常 dsh
#   ./scripts/safe-mode.sh rollback  进入安全模式，恢复上一次 web-kit，再尝试正常启动
#   ./scripts/safe-mode.sh status    查看两个 LaunchAgent 与 3080 状态
set -u

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SAFE_PATCH="$ROOT/config/safe-mode.patch.yml"
SAFE_PLIST_SRC="$ROOT/ops/com.dsh.web-safe.plist"
SAFE_PLIST_DST="$HOME/Library/LaunchAgents/com.dsh.web-safe.plist"
MAIN_PLIST="$HOME/Library/LaunchAgents/com.dsh.web.plist"
PROFILE_DIR="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/web}"
TARGET="$PROFILE_DIR/node_modules/@apanoo/dsh-web-kit"
PREVIOUS="$PROFILE_DIR/node_modules/@apanoo/.dsh-web-kit.previous"
DOMAIN="gui/$(id -u)"
MAIN_LABEL="com.dsh.web"
SAFE_LABEL="com.dsh.web.safe"
NODE_BIN="${DSH_NODE:-/usr/local/bin/node}"
DSH_BIN="${DSH_BIN:-/Users/apanoo/.npm-global/lib/node_modules/@deepseek-ai/dsh/lib/bin.js}"

say() { printf '%s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

install_safe_plist() {
    [ -f "$SAFE_PLIST_SRC" ] || die "找不到安全模式 plist: $SAFE_PLIST_SRC"
    mkdir -p "$(dirname "$SAFE_PLIST_DST")" || die "无法创建 LaunchAgents 目录"
    cp "$SAFE_PLIST_SRC" "$SAFE_PLIST_DST" || die "无法安装安全模式 plist"
    chmod 644 "$SAFE_PLIST_DST"
    plutil -lint "$SAFE_PLIST_DST" >/dev/null || die "安全模式 plist 校验失败"
    say "✓ 安全模式 plist 已安装: $SAFE_PLIST_DST"
}

validate_safe_config() {
    [ -f "$SAFE_PATCH" ] || die "找不到安全模式 patch: $SAFE_PATCH"
    [ -x "$NODE_BIN" ] || [ -f "$NODE_BIN" ] || die "找不到 Node: $NODE_BIN"
    [ -f "$DSH_BIN" ] || die "找不到 dsh 启动器: $DSH_BIN"
    "$NODE_BIN" "$DSH_BIN" web --patch "$SAFE_PATCH" --dump-config >/dev/null \
        || die "安全模式配置校验失败，未切换当前服务"
    say "✓ 安全模式配置校验通过"
}

bootout() {
    launchctl bootout "$DOMAIN/$1" >/dev/null 2>&1 || true
}

wait_http() {
    local i code
    for i in $(seq 1 20); do
        code="$(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:3080/ 2>/dev/null || true)"
        case "$code" in
            2*|3*|4*) say "✓ dsh 已监听 127.0.0.1:3080（HTTP $code）"; return 0 ;;
        esac
        sleep 1
    done
    return 1
}

start_safe() {
    install_safe_plist
    validate_safe_config
    bootout "$SAFE_LABEL"
    bootout "$MAIN_LABEL"
    if ! launchctl bootstrap "$DOMAIN" "$SAFE_PLIST_DST"; then
        # 安全模式没能接管时，尽量恢复正常服务，避免留下停机状态。
        launchctl bootstrap "$DOMAIN" "$MAIN_PLIST" >/dev/null 2>&1 || true
        die "安全模式 LaunchAgent 启动失败"
    fi
    launchctl kickstart -k "$DOMAIN/$SAFE_LABEL" >/dev/null 2>&1 || true
    if ! wait_http; then
        bootout "$SAFE_LABEL"
        launchctl bootstrap "$DOMAIN" "$MAIN_PLIST" >/dev/null 2>&1 || true
        die "安全模式启动后 20 秒仍未监听 3080；已尝试恢复正常服务"
    fi
    say "✓ 已进入安全模式：web-kit 已禁用，聊天应可用"
}

start_normal() {
    bootout "$SAFE_LABEL"
    bootout "$MAIN_LABEL"
    launchctl bootstrap "$DOMAIN" "$MAIN_PLIST" || die "正常 dsh LaunchAgent 启动失败"
    launchctl kickstart -k "$DOMAIN/$MAIN_LABEL" >/dev/null 2>&1 || true
    if ! wait_http; then
        say "⚠ 正常 dsh 未在 20 秒内监听 3080，自动切回安全模式" >&2
        start_safe
        die "正常模式启动失败，已切回安全模式"
    fi
    say "✓ 已恢复正常模式：web-kit 已启用"
}

rollback_previous() {
    [ -d "$PREVIOUS" ] || die "没有找到上一次 web-kit 备份: $PREVIOUS"
    start_safe
    local tmp="$PROFILE_DIR/node_modules/@apanoo/.dsh-web-kit.rollback.tmp"
    rm -rf "$tmp"
    cp -R "$PREVIOUS" "$tmp" || die "复制上一次 web-kit 失败"
    rm -rf "$TARGET"
    mv "$tmp" "$TARGET" || die "替换 web-kit 失败"
    "$NODE_BIN" --check "$TARGET/lib/index.js" || die "上一次 web-kit 服务端产物语法校验失败"
    say "✓ 已恢复上一次 web-kit 文件，准备恢复正常模式"
    start_normal
}

status() {
    printf '%-20s ' "$MAIN_LABEL"
    launchctl print "$DOMAIN/$MAIN_LABEL" >/dev/null 2>&1 && say loaded || say not-loaded
    printf '%-20s ' "$SAFE_LABEL"
    launchctl print "$DOMAIN/$SAFE_LABEL" >/dev/null 2>&1 && say loaded || say not-loaded
    printf 'port 3080: '
    curl -sS --max-time 2 -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3080/ 2>/dev/null || say unavailable
}

case "${1:-status}" in
    install) install_safe_plist ;;
    enter) start_safe ;;
    restore) start_normal ;;
    rollback) rollback_previous ;;
    status) status ;;
    *) die "用法: $0 {install|enter|restore|rollback|status}" ;;
esac
