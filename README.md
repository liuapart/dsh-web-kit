# @apanoo/dsh-web-kit

dsh Web 界面增强套件（自包含的双面插件：服务端 host plugin + 浏览器 client module）。
零 npm 依赖：源码分模块放在 `src/`（CommonJS），由自研打包器 `scripts/bundle.mjs`
生成单文件构建物 `lib/`。

## 版本历史要点

- **v2.5.x 及之前**：含文件预览停靠栏（语法高亮 / 目录浏览 / 图片预览）+ 服务端
  `/web-kit` 文件读取路由
- **v2.6.0**：文件预览停靠栏移除——dsh 0.1.5 官方新增右侧文件预览栏，能力重叠；
  服务端路由一并下线
- **v2.6.1**：Session log 窄屏紧凑化移除——官方页面改版，结构标记失效

## 功能（v2.6.1）

### 一、小屏侧栏管理（视口 <1024px，与官方 `SIDEBAR_AUTO_COLLAPSE` 对齐）
- 隐藏官方收起态的 56px 图标细条（含内容与其网格轨道，真正回收宽度）
- 左缘贴边细把手「›」（12px 宽、半透明、悬停显形）转发官方 toggle 开合侧栏
- PC 端（≥1024px）完全不受影响

### 二、PWA 顶区下拉刷新（v2.3.0）
- iOS 主屏幕 PWA 无原生下拉刷新：屏幕顶部 120px 内下滑（滚动位置无关，
  同安卓壳 TopZoneSwipeLayout）→ 越阈松手整页刷新
- 仅独立模式（`navigator.standalone` / `display-mode: standalone`）生效，
  浏览器模式保持 Safari 原生行为
- 指示器：状态栏下方居中小圆盘，拖拽实时跟手，松手回弹/旋转反馈

## 目录结构（源码与构建物分离）

```
├── package.json          # 双面插件声明：exports[./client] + dsh.client.platform=web
├── src/                  # ★ 源码（CommonJS，编辑只改这里）
│   ├── package.json      # {"type":"commonjs"}：让编辑器按 CJS 解析 src
│   ├── server/           # 服务端半部（entry: index.js）
│   │   └── index.js      #   v2.6.0 起无职责（/web-kit 路由已下线），骨架保留
│   └── client/           # 浏览器半部（entry: index.js）
│       ├── styles.js     #   全部 CSS（亮/暗主题）
│       ├── dock.js       #   小屏侧栏贴边把手（v2.6.0 起仅此职责）
│       ├── pullrefresh.js#   PWA 顶区下拉刷新
│       └── index.js      #   入口：apply(ctx)
├── lib/                  # ★ 构建物（bundle.mjs 生成，勿手改）
│   ├── index.js          #   ESM（dsh 以 ES module 加载服务端半部）
│   └── client.js         #   __ModuleLoader__.load 包装的浏览器模块
└── scripts/
    ├── bundle.mjs        # 零依赖打包器：CJS 注册表 + 微型 require
    ├── build.mjs         # 打包 → 语法校验 → 部署到 dsh profile
    ├── install.sh        # 部署辅助
    └── safe-mode.sh      # 安全模式：禁用/恢复/回滚 web-kit
```

> v2.5.x 的 `openpath.js` / `browser.js` / `highlight.js` 与 server 端
> `fence/listing/readfile/workspace/reply` 已从构建中摘除，源码暂留仓库
> （git 历史可查），需要时从 v2.5.2 tag 恢复。

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
  `launchctl kickstart -k gui/501/com.dsh.web`，最后验证聊天可用；
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

## 调试要点（历史踩坑，详见代码头部注释）

- 深色主题用 `body[data-ds-dark-theme]` 属性选择器（优先级高于官方 media 规则）
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
