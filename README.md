# @apanoo/dsh-web-kit

dsh Web 界面增强套件（自包含的双面插件：服务端 host plugin + 浏览器 client module）。
零依赖纯 JS，无需打包器。

## 功能

### 一、文件预览停靠栏
- 点击聊天消息里的文件路径 → 右侧停靠栏内查看，不再跳系统原生打开
- 轻量语法高亮（js/ts、json、py、sh、C 系、css、yaml），零依赖
- 目录可下钻浏览（目录优先排序，自动隐藏 `.git` / `node_modules` / `.DS_Store`）
- 交互：左缘拖拽调宽（320–760px，持久化）、Esc / 点外部 / « 按钮收起；
  收起后内容与宽度保留，右缘竖排把手「文件预览 ›」随时再展开
- 渐进增强：二进制 / 超大 / 不可读等无法页内查看的路径，自动回退官方
  `openPath` 原生行为（本机原生打开 / 远端 403），不做破坏性接管

### 二、小屏侧栏管理（视口 <1024px，与官方 `SIDEBAR_AUTO_COLLAPSE` 对齐）
- 隐藏官方收起态的 56px 图标细条（含内容与其网格轨道，真正回收宽度）
- 左缘贴边细把手「›」（12px 宽、半透明、悬停显形）转发官方 toggle 开合侧栏
- PC 端（≥1024px）完全不受影响

## 目录结构

```
├── package.json        # 双面插件声明：exports[./client] + dsh.client.platform=web
├── lib/
│   ├── index.js        # 服务端半部：/web-kit 路由（信任围栏/目录/文件读取）
│   └── client.js       # 浏览器半部：停靠栏 + 语法高亮 + 侧栏管理（分节注释）
└── scripts/
    └── build.mjs       # 构建 = 语法校验 + 原样部署到 dsh profile
```

## 构建与部署

```bash
npm run lint            # 只做语法校验
npm run build           # 校验 + 部署到 ~/.dsh/profiles/web
DSH_PROFILE_DIR=/path/to/profile npm run build   # 指定其他 profile
```

部署后重启 dsh 并刷新浏览器页面：

```bash
launchctl kickstart -k gui/501/com.dsh.web
```

> 本插件作为组合行挂在 profile 用户层（`~/.dsh/profiles/web/cordis.patch.yml`
> 的 insert 块，行 id `web-kit`），与 dsh 升级无关；重装系统/重置 profile 后
> 把本仓库复制回 profile `node_modules/@apanoo/dsh-web-kit` 并补一行
> `- insert: [- id: web-kit, name: '@apanoo/dsh-web-kit']` 即可恢复。

## 安全模型（服务端 /web-kit 路由）

- 仅 GET；`sec-fetch-site: cross-site`、Origin 与 Host 不一致、Host 非回环/私网
  字面量 → 一律 403（语义对齐 `dsh-client-connection` 的 `isTrustedApiRequest`）
- 允许任意可读路径是有意取舍：LAN 用户已过 Caddy basic auth，文件可见面与
  SSH 登录本机一致；权限最终由文件系统裁决
- 限额：二进制嗅探（头 8KB 含 NUL → 415）、读取 1MB 截断、stat 64MB 上限、
  目录 500 条截断；`realpath` 解析符号链接

## 调试要点（历史踩坑，详见代码头部注释）

- `openPath` 拦截必须 `bind(this)`（内部读 `this.api`，裸调用 TypeError）
- 深色主题用 `body[data-ds-dark-theme]` 属性选择器（优先级高于官方 media 规则）
- 外点收起用 `pointerdown` 仅观察不拦截（拦截会吞掉点击）
- 官方收起细条的 56px 是 `computeColumns` 写进内联 grid 模板的，CSS 必须
  `!important` 才能覆盖回收
- CSS Modules 类名用 `[class*="_toggle"]` 后缀匹配（哈希前缀跨构建会变）

## 卸载

```bash
rm -rf ~/.dsh/profiles/web/node_modules/@apanoo/dsh-web-kit
# 再删 cordis.patch.yml 里 id: web-kit 的组合行，kickstart 重启
```
