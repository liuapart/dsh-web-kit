# web-kit 插件更新、重启与安全回滚规范

本文是 `@apanoo/dsh-web-kit` 的操作规范。目标是：客户端小改动不重启 dsh；服务端改动可验证、可回滚；即使 web-kit 让正常 profile 无法启动，也能先恢复聊天。

## 1. 先判断改动属于哪一侧

| 改动位置/内容 | 是否需要重启 dsh | 生效动作 |
|---|---:|---|
| `src/client/**`、客户端 CSS、客户端交互 | 否 | `npm run build` 后刷新浏览器 |
| `src/server/**`、`/web-kit` 路由、权限/围栏 | 是 | 构建、检查、重启并做健康检查 |
| `src/client/**` 同时改了 server 注册/注入 | 是 | 按 server 改动流程 |
| `package.json`、exports、依赖、插件声明 | 是 | 安装/构建后重启 |
| `cordis.patch.yml`、bundle 顺序、`inject` | 是 | 配置校验后重启 |
| 只改 `lib/**` | 按其来源判断 | `lib` 是构建物，不手工编辑；回到 `src/` 判断 |

“插件动态加载”表示插件可由 profile 动态组合，并不表示正在运行的 Node 进程会自动重新读取已经 import 到内存中的 server 模块。正在运行的 client bundle 也只有在开发 HMR 或重新加载页面时才会更新。

## 2. 推荐更新流程

### 2.1 只改客户端

```bash
cd /Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit
npm run build
# 不重启 dsh，只刷新浏览器页面
```

`build.mjs` 会重新打包、执行 `node --check`，并把构建物部署到 profile。生产环境没有 HMR 时，浏览器刷新是必要的。

### 2.2 改了服务端、插件声明或 profile

```bash
cd /Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit
npm run build

# 先验证最终组合配置，不启动服务
node /Users/apanoo/.npm-global/lib/node_modules/@deepseek-ai/dsh/lib/bin.js \
  web --dump-config >/tmp/dsh-web-config.txt

# 确认配置后才重启
launchctl kickstart -k gui/501/com.dsh.web
```

重启后必须验证：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3080/
# 再通过正常域名打开聊天，确认聊天、会话历史和 web-kit 路由均可用
```

如果修改了 launchd plist 本身，不能只用 `kickstart`；按现有 runbook 执行 `bootout` + `bootstrap`。普通插件代码重启使用 `kickstart` 即可。

## 3. 构建备份与回滚

每次 `npm run build` 在部署前会把当前插件复制到：

```text
~/.dsh/profiles/web/node_modules/@apanoo/.dsh-web-kit.previous
```

它只保存最近一次成功部署前的版本。构建复制中途失败时，脚本会自动恢复这份备份；但**构建成功不等于 dsh 启动成功**，所以 server 改动仍必须重启后检查。

## 4. 安全模式

安全模式通过 `--patch` 叠加层禁用 `web-kit`，不修改正常的 `cordis.patch.yml`：

```text
config/safe-mode.patch.yml
```

安全模式使用独立的 launchd label：

```text
com.dsh.web.safe
```

它与正常模式共用 3080 端口，因此不能同时运行。脚本会先停止另一模式，再启动目标模式。

首次使用前安装安全模式 LaunchAgent（只安装，不切换当前服务）：

```bash
./scripts/safe-mode.sh install
```

进入安全模式（web-kit 禁用，聊天核心保留）：

```bash
./scripts/safe-mode.sh enter
```

恢复正常模式（重新启用当前 web-kit）：

```bash
./scripts/safe-mode.sh restore
```

查看状态：

```bash
./scripts/safe-mode.sh status
```

## 5. web-kit 更新后 dsh 无法启动时

从终端执行：

```bash
cd /Users/apanoo/worsp/codex-workspace/test/dsh-repair/dsh-web-kit
./scripts/safe-mode.sh enter
```

脚本会：

1. 校验安全 patch 和 dsh 最终配置；
2. 停止无法启动的正常 `com.dsh.web`；
3. 启动禁用 web-kit 的 `com.dsh.web.safe`；
4. 等待 3080 可访问；
5. 失败时尽量恢复正常 LaunchAgent，避免留下停机状态。

进入安全模式后，聊天入口应恢复，但 web-kit 文件预览和侧栏增强不可用。此时可以查看：

```bash
cat /tmp/dsh-web.err.log
cat /tmp/dsh-web-safe.err.log
```

## 6. 恢复上一个可用 web-kit

如果本次部署前存在备份，执行：

```bash
./scripts/safe-mode.sh rollback
```

脚本流程是：

```text
进入安全模式
→ 从 .dsh-web-kit.previous 恢复上一版插件
→ 对恢复后的 server 产物做 node --check
→ 尝试恢复正常 dsh
→ 正常模式启动失败则再次切回安全模式
```

如果没有备份，或者上一次备份也有问题，不要手工删除整个 profile。先保持安全模式，恢复仓库中已知可用的 `lib/` 和 `package.json`，重新执行 `npm run build`，再运行 `safe-mode.sh restore`。

## 7. 重要边界

- 安全模式是**人工触发的故障兜底**，不会自动监视并切换生产服务；这样不会因短暂网络故障或 dsh 启动较慢而误切换。
- 安全模式只禁用 `web-kit`。如果其他插件也损坏，需在安全 patch 中额外禁用对应的 loader，并先确认最终配置。
- 不要同时 bootstrap `com.dsh.web` 和 `com.dsh.web.safe`，否则两个进程会争抢 3080。
- 不要在服务端改动尚未通过构建/配置检查时执行 `kickstart`。
- 生产环境中不要把 `lib/` 当作源码编辑；所有改动回到 `src/`，再重新构建。
- 安全 plist 中包含当前本机路径。如果仓库移动，先修改 `ops/com.dsh.web-safe.plist`，再重新执行 `install`。
