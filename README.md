# @apanoo/dsh-web-kit

dsh Web 界面增强套件（自包含的双面插件：服务端 host plugin + 浏览器 client module）。
零 npm 依赖：源码分模块放在 `src/`（CommonJS），由自研打包器 `scripts/bundle.mjs`
生成单文件构建物 `lib/`。

## 功能

### 一、文件预览停靠栏（双入口）
- **入口 A · 精确直达**：点击聊天消息里的文件路径 → 右侧停靠栏内查看，
  不再跳系统原生打开
- **入口 B · 主动浏览**（v2.1）：点右缘把手「文件」→ 从 dsh 工作区根开始
  浏览文件树，选文件即预览；面包屑任意层可点跳回；位置记忆（localStorage
  记住上次浏览处，重开面板回到原处，失效自动回退工作区列表）
- 轻量语法高亮（js/ts、json、py、sh、C 系、css、yaml），零依赖
- **图片预览**（v2.4）：png / jpg / gif / webp / bmp / ico 按文件头魔数识别，
  svg 按扩展名识别（`<img>` 上下文脚本不执行）；棋盘格衬底适应窗口，点击在
  适应 / 1:1 原始尺寸间切换；元信息展示体积 + MIME + 分辨率。>20MB 回退原生打开
- **目录图片选中即预览**（v2.5.1）：单击图片行选中（行高亮 + `▣` 图标标记）后，
  底部才出现小图预览区——未选中时不占空间，↑↓ 移到非图片行自动收起；
  再击同一行 / 双击 / Enter 进详情；点预览小图直接进详情；会话级缓存最近
  8 张，来回切换瞬时显示；目录与非图片文件保持单击直达，无图片的目录无预览区
- 目录可下钻浏览（目录优先排序，自动隐藏 `.git` / `node_modules` / `.DS_Store`）
- 交互：左缘拖拽调宽（320–760px，持久化）、Esc / 点外部 / « 按钮收起；
  收起后内容与宽度保留，把手随时再展开
- 渐进增强：二进制 / 超大 / 不可读等无法页内查看的路径，自动回退官方
  `openPath` 原生行为（本机原生打开 / 远端 403），不做破坏性接管
  （v2.4 起常见图片格式不再属于"无法查看"，先走页内图片预览）

### 二、小屏侧栏管理（视口 <1024px，与官方 `SIDEBAR_AUTO_COLLAPSE` 对齐）
- 隐藏官方收起态的 56px 图标细条（含内容与其网格轨道，真正回收宽度）
- 左缘贴边细把手「›」（12px 宽、半透明、悬停显形）转发官方 toggle 开合侧栏
- PC 端（≥1024px）完全不受影响

## 目录结构（源码与构建物分离）

```
├── package.json          # 双面插件声明：exports[./client] + dsh.client.platform=web
├── src/                  # ★ 源码（CommonJS，编辑只改这里）
│   ├── package.json      # {"type":"commonjs"}：让编辑器按 CJS 解析 src
│   ├── server/           # 服务端半部（entry: index.js）
│   │   ├── fence.js      #   信任围栏（回环/私网字面量/部署域名白名单）
│   │   ├── reply.js      #   统一 JSON 响应
│   │   ├── listing.js    #   目录列表（排序/噪音过滤/500 条上限）
│   │   ├── readfile.js   #   文件读取（二进制嗅探/1MB 截断）
│   │   ├── workspace.js  #   工作区根列表（宽容解析 workspace.json）
│   │   └── index.js      #   路由分发：无 path→roots；有 path→目录/文件
│   └── client/           # 浏览器半部（entry: index.js）
│       ├── styles.js     #   全部 CSS（亮/暗主题）
│       ├── util.js       #   fmtSize / basename / parentPath
│       ├── highlight.js  #   轻量语法高亮（零依赖）
│       ├── dock.js       #   停靠栏壳：DOM/开合/拖宽/把手/外点收起
│       ├── browser.js    #   数据加载+渲染：loadPath/roots/面包屑/位置记忆
│       ├── openpath.js   #   openPath 拦截（渐进增强回退）
│       └── index.js      #   入口：apply(ctx)
├── lib/                  # ★ 构建物（bundle.mjs 生成，勿手改）
│   ├── index.js          #   ESM（dsh 以 ES module 加载服务端半部）
│   └── client.js         #   __ModuleLoader__.load 包装的浏览器模块
└── scripts/
    ├── bundle.mjs        # 零依赖打包器：CJS 注册表 + 微型 require
    └── build.mjs         # 打包 → 语法校验 → 部署到 dsh profile
```

### 打包器约定（违反会在构建期报错）

- 源码只允许相对 `require("./x.js")`（显式 `.js` 后缀）
- node 内建只允许 `require("node:xxx")`，服务端产物会提升为顶部 `import`
- 禁止循环依赖（构建期 DFS 检测）

## 构建、部署与安全回滚

```bash
npm run build           # 打包 + 校验 + 部署到 ~/.dsh/profiles/web
DSH_PROFILE_DIR=/path/to/profile npm run build   # 指定其他 profile
```

不要每次改动都重启 dsh：

- 只改 `src/client/**`：构建后刷新浏览器即可；
- 改 `src/server/**`、`package.json`、exports、依赖、注入关系或 profile：先做配置检查，再
  `launchctl kickstart -k gui/501/com.dsh.web`，最后验证聊天和 `/web-kit`；
- 完整更新/重启/失败恢复规范见
  [`docs/PLUGIN-UPDATE-RUNBOOK.md`](docs/PLUGIN-UPDATE-RUNBOOK.md)。

安全模式和回滚脚本（首次使用先安装安全 LaunchAgent）：

```bash
./scripts/safe-mode.sh install   # 只安装，不切换当前服务
./scripts/safe-mode.sh enter     # 禁用 web-kit，恢复聊天核心
./scripts/safe-mode.sh restore   # 恢复正常模式
./scripts/safe-mode.sh rollback  # 恢复最近一次部署前的 web-kit，再尝试正常模式
./scripts/safe-mode.sh status
```

> 本插件作为组合行挂在 profile 用户层（`~/.dsh/profiles/web/cordis.patch.yml`
> 的 insert 块，行 id `web-kit`），与 dsh 升级无关；重装系统/重置 profile 后
> 把本仓库复制回 profile `node_modules/@apanoo/dsh-web-kit` 并补一行
> `- insert: [- id: web-kit, name: '@apanoo/dsh-web-kit']` 即可恢复。
> `npm run build` 会在部署前保留最近一版到 `.dsh-web-kit.previous`，供安全回滚使用。

## 安全模型（服务端 /web-kit 路由）

- 仅 GET；`sec-fetch-site: cross-site`、Origin 与 Host 不一致、Host 非回环/
  私网字面量/部署域名白名单 → 一律 403（语义对齐 `dsh-client-connection`
  的 `isTrustedApiRequest`；域名白名单的安全依据：请求必经 Caddy 白名单 +
  basic_auth，3080 只绑回环）
- 允许任意可读路径是有意取舍：LAN 用户已过 Caddy basic auth，文件可见面与
  SSH 登录本机一致；权限最终由文件系统裁决
- 工作区根列表（无 path 请求）宽容解析 `~/.dsh/storages/workspace.json`：
  注册表缺失/格式变化/条目失效 → 空数组，绝不让主路由 500
- 限额：二进制嗅探（头 8KB 含 NUL → 415）、读取 1MB 截断、stat 64MB 上限、
  目录 500 条截断；`realpath` 解析符号链接

## 调试要点（历史踩坑，详见代码头部注释）

- `openPath` 拦截必须 `bind(this)`（内部读 `this.api`，裸调用 TypeError）
- 深色主题用 `body[data-ds-dark-theme]` 属性选择器（优先级高于官方 media 规则）
- 外点收起用 `pointerdown` 仅观察不拦截（拦截会吞掉点击）
- 官方收起细条的 56px 是 `computeColumns` 写进内联 grid 模板的，CSS 必须
  `!important` 才能覆盖回收
- CSS Modules 类名用 `[class*="_toggle"]` 后缀匹配（哈希前缀跨构建会变）
- [状态栏颜色] 不要自写 theme-color 同步：官方 ThemePresenter 已管理
  （浏览器下两主题均正常；PWA 启动色实验在用户设备无效，2026-08-31 已还原）

## 卸载

```bash
rm -rf ~/.dsh/profiles/web/node_modules/@apanoo/dsh-web-kit
# 再删 cordis.patch.yml 里 id: web-kit 的组合行，kickstart 重启
```
