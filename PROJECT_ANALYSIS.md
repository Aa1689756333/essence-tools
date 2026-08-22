# ToolBox 项目分析报告

> 分析日期：2026-08-22
> 代码库路径：`d:\11111111111111111111\novel-formatter`
> 本报告基于对源码的完整通读整理，覆盖架构、功能模块、技术实现、安全设计与可改进项。

---

## 1. 项目概述

**ToolBox** 是一个「在线工具箱」应用。项目目录名为 `novel-formatter`，但实际已演进为多工具聚合平台，`package.json` 中的包名为 `toolbox`。

核心定位：**纯前端工具运行 + 后端用户体系**。三个文本工具全部在浏览器本地运行、数据不上传；同时又叠加了一套完整的用户认证、积分签到、后台管理系统（基于 Next.js API Routes + SQLite）。

### 当前功能全景

| 模块 | 内容 |
|------|------|
| 文本工具 | 小说排版器、HTML 编辑器、Markdown 编辑器 |
| 用户体系 | 注册/登录/登出、JWT 会话、每日签到积分 |
| 后台管理 | 数据仪表盘、用户管理、系统设置、SMTP 邮件测试 |
| 应用外壳 | 响应式侧边栏、顶栏、5 主题色 × 明暗模式换肤 |

> 注意：根目录 `README.md` 描述的是项目早期「纯前端工具箱」阶段，**未涵盖后来新增的认证/积分/后台管理系统**，存在文档滞后。

---

## 2. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js（App Router + Turbopack） | ^15.3.5 |
| UI 库 | React | ^19.1.0 |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`） | ^4.1.11 |
| 数据库 | SQLite + Prisma ORM | ^5.22.0 |
| 认证 | jose（JWT）+ bcryptjs（密码哈希） | ^6.2.3 / ^3.0.3 |
| 邮件 | nodemailer | ^9.0.3 |
| Markdown | marked + DOMPurify + highlight.js | ^18 / ^3.4 / ^11.11 |
| 图标 | lucide-react | ^0.525.0 |
| 语言 | JavaScript（ES Modules，无 TypeScript） | — |

路径别名：`@/*` → `./src/*`（`jsconfig.json`）。

---

## 3. 目录结构

```
novel-formatter/
├── prisma/
│   ├── schema.prisma          # 数据模型：User / PointTransaction / SystemSetting
│   └── dev.db                 # SQLite 数据库文件
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.jsx         # 根布局：三层 Provider + 外壳 + 防闪烁脚本
│   │   ├── page.jsx           # 首页：工具网格 + 分类标签
│   │   ├── globals.css        # Tailwind + CSS 变量 + 明暗主题
│   │   ├── novel-formatter/   # 工具路由（薄包装）
│   │   ├── html-editor/
│   │   ├── markdown-editor/
│   │   ├── admin/             # 后台管理页面
│   │   │   ├── layout.jsx     # 管理员前端鉴权 + 页签导航
│   │   │   ├── page.jsx       # 仪表盘
│   │   │   ├── users/page.jsx # 用户管理
│   │   │   └── settings/page.jsx # 系统设置
│   │   └── api/               # 后端 API Routes
│   │       ├── auth/          # login / register / logout / me
│   │       ├── user/checkin/  # 每日签到
│   │       └── admin/         # dashboard / users / settings / settings/test-email
│   │
│   ├── shell/                 # 应用外壳（跨工具共享）
│   │   ├── ThemeProvider.jsx  # 5 主题色 × 明暗，CSS 变量注入
│   │   ├── Sidebar.jsx        # 侧边栏：桌面折叠 / 移动抽屉
│   │   ├── Topbar.jsx         # 顶栏：面包屑 + 主题切换 + 用户菜单
│   │   └── useSidebar.js      # 侧边栏响应式状态 Context
│   │
│   ├── context/AuthContext.jsx # 全局认证状态 + 弹窗管理
│   ├── components/
│   │   ├── ToolCard.jsx        # 首页工具卡片
│   │   └── auth/               # AuthModal / CheckInModal
│   │
│   ├── lib/                    # 基础设施
│   │   ├── auth.js             # JWT 签发/校验、密码哈希、会话解析
│   │   ├── db.js               # Prisma 单例
│   │   ├── mailer.js           # nodemailer 封装
│   │   ├── settings.js         # 系统设置读写 + 10s 缓存 + 邮箱规则
│   │   └── storage.js          # localStorage 安全封装
│   │
│   └── tools/                  # 工具实现
│       ├── registry.js         # 工具注册表（数据中枢）
│       ├── novel-formatter/    # 排版引擎 + 高亮/滚动联动
│       ├── html-editor/        # contentEditable 富文本编辑器
│       └── markdown-editor/    # textarea + 实时预览编辑器
│
├── acceptance-test.mjs         # Markdown 编辑器验收测试（已接入 npm run test:acceptance）
├── test-*.mjs / test-*.js      # 独立测试脚本（已接入 npm test 聚合命令）
└── README.md                   # 文档（内容滞后于当前功能）
```

---

## 4. 应用架构

### 4.1 三层 Provider 外壳

根布局 [layout.jsx](file:///d:/11111111111111111111/novel-formatter/src/app/layout.jsx) 以嵌套 Provider 组织全局状态，顺序为：

```
ThemeProvider → AuthProvider → SidebarProvider
  └─ Sidebar（左）+ [ Topbar + main（当前工具页面）]（右）
```

- `generateMetadata()` 为服务端组件，从 `getSystemSettings()` 异步读取站点 SEO 元数据。
- `<head>` 内注入内联脚本，在 React 水合前读取 `localStorage['toolbox-dark']` 给 `<html>` 加 `dark` 类，**避免暗色模式首屏闪白**；配合 `suppressHydrationWarning` 抑制水合告警。

### 4.2 工具注册机制（数据驱动）

[registry.js](file:///d:/11111111111111111111/novel-formatter/src/tools/registry.js) 是应用工具列表的**唯一数据源**：

- `tools[]`：每项含 `id / name / desc / icon / emoji / color / path / category / tags / clientOnly`。
- `categories`：从 tools 去重生成，头部固定加「全部」。
- `getToolsByCategory()`：按 category 聚合，供侧边栏分组渲染。

三个消费方：`layout.jsx`（传给 Sidebar）、`page.jsx`（首页卡片）、`Topbar.jsx`（面包屑反查）。

**新增工具流程**：注册表加一条配置 → `src/app/<id>/page.jsx` 建路由 → `src/tools/<id>/` 实现组件。注册表（元数据）与路由页面（渲染入口）分离，路由页仅是极薄包装器 + 声明 `metadata`。

### 4.3 主题系统

[ThemeProvider.jsx](file:///d:/11111111111111111111/novel-formatter/src/shell/ThemeProvider.jsx) 提供**双维度主题**：5 套主题色 × 明暗模式。

- 5 套配色：`mint / rose / amber / sky / violet`，每套含 `accent / hover / subtle / shadow / light`，并有对应的 `darkColors` 暗色变体。
- 运行机制：`useEffect` 根据 `isDark` 给 `<html>` 增删 `dark` 类，并把配色写入 CSS 自定义属性（`--theme-accent` / `--theme-hover` / `--theme-accent-rgb` / `--theme-gradient` 等）。全应用通过 `var(--theme-accent)` 消费。
- 持久化：`localStorage['toolbox-theme']` 与 `['toolbox-dark']`。
- 明暗基础色变量定义在 [globals.css](file:///d:/11111111111111111111/novel-formatter/src/app/globals.css)（`:root` 与 `:root.dark`）。

### 4.4 响应式侧边栏

[useSidebar.js](file:///d:/11111111111111111111/novel-formatter/src/shell/useSidebar.js) 用 `matchMedia` 监听两个断点：

- 移动端（≤767px）：抽屉式侧栏，遮罩层 + `translate-x` 滑入 + ESC 关闭。
- 平板（768–1023px）：自动折叠。
- 桌面端：固定侧栏，可折叠（56px ↔ 200px）。

侧边栏还含**管理员专属入口**（`user.role === 'ADMIN'` 才显示 `/admin`）。

---

## 5. 用户认证与权限系统

### 5.1 数据模型（[schema.prisma](file:///d:/11111111111111111111/novel-formatter/prisma/schema.prisma)）

| 模型 | 关键字段 |
|------|----------|
| `User` | `id`(uuid) / `email`(unique) / `passwordHash` / `nickname` / `role`(默认 USER) / `status`(默认 ACTIVE) / `points` / `continuousCheckIn` / `lastCheckInDate`(String, YYYY-MM-DD) |
| `PointTransaction` | `userId` / `amount`(变动) / `balance`(余额快照) / `type` / `description`（级联删除） |
| `SystemSetting` | `key`(主键) / `value`(字符串，复杂配置存 JSON) |

`role`（USER/ADMIN）与 `status`（ACTIVE/BANNED）在 schema 中为普通 String，取值约束靠应用层保证。

### 5.2 JWT 会话机制（[auth.js](file:///d:/11111111111111111111/novel-formatter/src/lib/auth.js)）

- 使用 `jose`（适配 Edge/Serverless）签发 HS256 JWT，有效期 **7 天**，载荷仅 `{ id, email, role }`。
- Cookie `toolbox_session`：`httpOnly` + `secure`(仅生产) + `sameSite: lax` + `maxAge 7d`。
- 密码用 `bcryptjs`，salt rounds = 10。
- `getSessionUser()`：校验 token 后用 `payload.id` **实时查库**取最新用户信息，因此积分/角色变更即时生效；**`status === 'BANNED'` 直接返回 null**（封禁即时失效）。

### 5.3 认证流程（`src/app/api/auth/`）

- **注册**：校验密码 ≥6 位 → 检查 `allow_registration` 开关 → 邮箱白/黑名单校验 → 邮箱验证码校验（开启且 SMTP 已配置时强制，否则自动降级跳过）→ 查重 → **首个注册用户自动成为 ADMIN** → 哈希入库 → 签发 token（注册即登录）。
- **登录**：邮箱不存在或密码错误统一返回「邮箱或密码错误」（防用户枚举）；BANNED 返回 403。
- **登出**：将 cookie 置空并 `expires: new Date(0)`。
- **me**：始终返回 200，`{ user }` 或 `{ user: null }`，前端据此判断登录态。

前端由 [AuthContext.jsx](file:///d:/11111111111111111111/novel-formatter/src/context/AuthContext.jsx) 提供全局状态与登录/签到弹窗管理；UI 见 `src/components/auth/AuthModal.jsx`。

### 5.4 权限校验模式

**无全局 middleware**（项目不存在 `src/middleware.js`）。所有受保护接口在 route handler 内部执行：

```js
const user = await getSessionUser();
if (!user || user.role !== 'ADMIN') return 403;
```

后台采用**前端软拦截 + 后端硬校验**双层：[admin/layout.jsx](file:///d:/11111111111111111111/novel-formatter/src/app/admin/layout.jsx) 前端判断角色渲染「无权限」卡片，真正的安全边界在每个 API 首行的 ADMIN 校验。

---

## 6. 积分与签到系统

核心逻辑：[checkin/route.js](file:///d:/11111111111111111111/novel-formatter/src/app/api/user/checkin/route.js)

- 日期用**本地时区** `YYYY-MM-DD` 字符串（`getFullYear/getMonth/getDate`，避免 UTC 偏差）。
- **连续天数**：`lastCheckInDate === 昨天` 则 +1，否则重置为 1。
- **积分规则**（从 `checkin_config` 读，带默认兜底）：基础分 `basePoints`(默认 3) + 遍历 `bonusRules` 满足连续天数区间的 `extraPoints`（连续 3–6 天 +2；≥7 天 +4），再受单日封顶 `dailyCap`(默认 7) 限制。
- **原子写入**：`db.$transaction` 同时更新 User 积分/连签/日期 + 写一条 `type: 'CHECKIN'` 的流水（记 balance 快照）；若触发整月全勤，追加一条 `type: 'MONTH_FULL_BONUS'` 流水。
- **整月全勤奖励**：本月最后一天签到、且当月每天均已签到时，额外发放 `monthFullBonus`（默认 20，不受 `dailyCap` 限制），后台设置页可配置该值。
- 签到 UI（`CheckInModal.jsx`）展示连续天数、当月日历（高亮全部已签到日）、整月全勤进度条、积分交易记录。

---

## 7. 后台管理系统

| 功能 | 前端 | API | 数据来源 |
|------|------|-----|----------|
| 仪表盘 | [admin/page.jsx](file:///d:/11111111111111111111/novel-formatter/src/app/admin/page.jsx) | `api/admin/dashboard` | User/PointTransaction 聚合 + 设置 |
| 用户管理 | `admin/users/page.jsx` | `api/admin/users` | User 查询/更新 + 流水（事务） |
| 系统设置 | `admin/settings/page.jsx` | `api/admin/settings` | SystemSetting（KV + JSON） |
| 邮件测试 | 同上（SMTP 页签） | `api/admin/settings/test-email` | 无落库，实时发信 |

- **仪表盘**：`Promise.all` 并行 5 个查询（总用户/今日新增/今日签到/累计发放积分/最近 6 用户），附 SMTP 是否配置、注册开关、邮箱模式等系统状态卡。
- **用户管理**：分页 + 搜索（email/nickname）+ 角色/状态过滤；PATCH 按 `action` 分派 `update_role` / `update_status` / `adjust_points`。积分调整用 `db.$transaction` 保证「改余额 + 记流水」原子性，并 `Math.max(0, ...)` 防负分。
- **系统设置**：四个页签（SEO / 注册与邮箱策略 / SMTP / 签到规则）。复杂配置以 JSON 字符串存单个 value；后端读用 `forceRefresh` 绕过缓存，前端保存时 `JSON.stringify` 序列化。
- **邮件测试**：用**前端表单实时配置**（而非已存库配置）测试，支持「先验证后保存」。

系统设置读写与缓存见 [settings.js](file:///d:/11111111111111111111/novel-formatter/src/lib/settings.js)：`getSystemSettings()` 带 **10 秒内存缓存** + 默认值兜底；邮箱规则支持 `none/whitelist/blacklist` 三模式与通配符匹配。邮件发送见 [mailer.js](file:///d:/11111111111111111111/novel-formatter/src/lib/mailer.js)（当前仅用于 SMTP 测试，注册流程未接入邮箱验证）。

---

## 8. 核心工具实现

### 8.1 小说排版器（技术亮点最集中）

**排版引擎** [formatter.js](file:///d:/11111111111111111111/novel-formatter/src/tools/novel-formatter/lib/formatter.js)：入口 `format(text)`，严格按 **4 阶段流水线 29 条规则**顺序执行（阶段顺序本身是算法的一部分）：

1. **字符级转换**（3 条）：全角数字/字母转半角（`charCodeAt - 0xFEE0`）、间隔号统一。
2. **标点统一**（11 条）：中文语境标点转全角（用「保护集」排除小数点/时间/URL，用 CJK 上下文判定）、省略号 `……`、破折号 `——`、**引号状态机**（带段落边界重置的 `""` 配对）、波浪号、书名号及嵌套、重复标点合并。
3. **空格处理**（7 条）：中英文间距、数字与单位间距（用占位符保护 hex 色值、负向前瞻排除 CSS 单位）、全角标点去空格、括号/`&` 间距、拆行保护。
4. **段落/行级处理**（8 条）：行首尾去空格、全角空格规范化（段首 `\u3000` 保留）、合并空行、首行缩进、章节标题识别、段落去重（防盗版水印）、对话格式修正。

每条规则包裹在 `isRuleEnabled()` 中（当前恒为 true），是为「规则开关配置化」预留的扩展钩子。

**高亮 / 滚动联动**（[NovelFormatter.jsx](file:///d:/11111111111111111111/novel-formatter/src/tools/novel-formatter/NovelFormatter.jsx) + hooks）：

- **映射底座**：`normalizeForMatch()` 归一化（全角转半角、去标点）后，在滑动窗口 `[lastMatch, lastMatch+30]` 内做**前缀匹配打分**，为每个输出段落反查输入行号（`data-input-line`），单调递增窗口保证顺序性、复杂度 O(n×30)。
- **输入面板分层**：透明 textarea（交互层，`color: transparent` 仅显光标）+ 高亮 overlay（渲染层，`pointer-events: none`）叠层，兼顾原生编辑与行高亮。
- **同步滚动** [useSyncScroll.js](file:///d:/11111111111111111111/novel-formatter/src/tools/novel-formatter/hooks/useSyncScroll.js)：以 `data-input-line` **中央行锚点定位**为主、比例映射兜底；`isSyncing` ref + RAF 防循环。因排版增删字符后行高不再等比，行锚点能让两侧「同一句话」始终对齐。
- **大文本防卡死**：>50000 字时先渲染「处理中」UI，再用 `setTimeout` 推迟同步计算，避免主线程阻塞。

### 8.2 HTML 编辑器

[HtmlEditor.jsx](file:///d:/11111111111111111111/novel-formatter/src/tools/html-editor/HtmlEditor.jsx)（约 2020 行）——基于 `contentEditable` + `document.execCommand` 的所见即所得富文本编辑器。

- 通过 `selectionchange` + `queryCommandState` 实时回读格式状态驱动工具栏高亮。
- **安全为核心**：`DOMPurify` 白名单 + `cleanHtml()` 双保险（移除 `on*` 事件属性、校验协议、`<font>`→`<span>`、`<center>`→`<div>`）+ `isSafeUrl()` 拦截 `javascript:`。
- 富媒体：链接/图片/表格模态框插入（含选区保存恢复）、图片四角拖拽缩放 + `createPortal` 浮动工具栏 + 预设尺寸/对齐、表格右键增删行列。
- 源码视图（自实现 HTML 美化器）、查找替换（TreeWalker + Range）、全屏、导出 HTML、防抖自动保存。

### 8.3 Markdown 编辑器

[MarkdownEditor.jsx](file:///d:/11111111111111111111/novel-formatter/src/tools/markdown-editor/MarkdownEditor.jsx)（约 790 行）——`textarea` 源码 + 实时 HTML 预览双栏。

- 渲染管线：`new Marked({ breaks, gfm })`（实例化避免全局污染）→ `md.parse` → `DOMPurify.sanitize` → `highlight.js` 按需注册 7 种语言高亮；链接强制 `target=_blank` + `rel=noopener`（防 tabnabbing）。
- **自实现撤销/重做历史栈**：`historyRef` + `historyIndexRef` 双 ref，上限 200，500ms 防抖合并连续输入，`flushHistory` 在撤销/卸载前冲刷。
- 三视图（edit/split/preview）、分屏滚动同步、移动端回退、查找替换、防抖自动保存、导出 MD。

### 8.4 共享基础设施

[storage.js](file:///d:/11111111111111111111/novel-formatter/src/lib/storage.js)：localStorage 安全封装，统一处理 SSR、隐私模式、`QuotaExceededError`；`safeSetItemWithRetry` 配额超限时删旧值重试，返回结果供 UI 显示「自动保存已暂停」。三个工具的自动保存/恢复均复用它。

---

## 9. 安全设计小结

**已具备：**
- 密码 bcrypt 哈希；JWT httpOnly cookie；生产环境 `secure`。
- 登录防用户枚举；封禁用户会话即时失效。
- HTML 编辑器 DOMPurify + 协议白名单 + 事件属性清理；Markdown DOMPurify + 防 tabnabbing。
- 积分变动全程事务 + 流水快照，防负分。
- SSR 安全防护（`typeof window` 判断）。

**需关注的风险：**
1. **JWT_SECRET 硬编码兜底值**（[auth.js](file:///d:/11111111111111111111/novel-formatter/src/lib/auth.js#L6-L8)）——生产环境必须通过环境变量 `JWT_SECRET` 覆盖。
2. **SMTP 密码明文存储**且 `GET /api/admin/settings` 原样返回前端表单，未脱敏（虽有 ADMIN 校验保护）。
3. **admin/users PATCH 缺自我保护**——未阻止管理员封禁/降级自身或移除最后一个管理员。
4. **无全局 middleware**——新增受保护接口需手动补 `getSessionUser()` 校验，易遗漏。

---

## 10. 代码质量与工程状况

**优点：**
- 架构清晰：数据驱动的工具注册、外壳与工具解耦、lib 分层合理。
- 关键路径有性能优化：`Promise.all` 并行查询、10s 设置缓存、大文本延迟计算、RAF 防抖。
- 数据一致性有保障：积分/签到均走事务 + 流水。
- 细节考究：防闪烁脚本、中文优先词数统计、marked 实例化、SSR 防护、localStorage 降级。

**待改进 / 技术债：**
1. **README 文档滞后**——未覆盖认证/积分/后台管理，建议更新。
2. ~~**遗留文件冗余**——`src_vite_backup/`、根目录 `index.html`（Vite 版入口）在 Next.js 架构下已无用。~~ ✅ 已清理（删除 `src_vite_backup/` 全部文件与根目录 `index.html`）。
3. ~~**测试脚本零散**——`acceptance-test.mjs`、`test-*.mjs`、`test-*.js` 为独立脚本，未集成到 `package.json` scripts。~~ ✅ 已集成（新增 `test` / `test:acceptance` / `test:md` / `test:md2` / `test:html` 命令，`npm test` 可一键聚合运行）。
4. **公共组件未抽取**——`ToolbarBtn` / `Modal` / `countWords` / `useSyncScroll` 在多个工具中重复实现（项目内部备忘录 `.workbuddy/memory` 已记录此待办 P3-4.12）。
5. **未实现功能**——~~签到 `monthFullBonus`（整月全勤奖励）配置已留但逻辑缺失~~ ✅ 已实现（月末最后一天且当月全勤时发放独立奖励流水，后台设置可配、签到弹窗展示全勤进度）；~~邮件仅用于测试，注册未接入邮箱验证~~ ✅ 已实现（6 位验证码 + 后台开关，开关初始关闭以确保首个用户可注册；SMTP 未配置时直接拒绝发送并提示管理员配置）。
6. **无 TypeScript**——全 JS，大型组件（HtmlEditor 约 2020 行）缺类型约束，维护成本较高。

---

## 11. 总结

ToolBox 是一个**从纯前端工具箱演进为「工具 + 用户体系 + 后台」的全栈 Next.js 应用**。其技术亮点集中在：

- **小说排版引擎**——4 阶段 29 规则的确定性文本处理器，配合归一化前缀匹配实现的高亮/滚动联动，工程含金量最高。
- **数据驱动的可扩展外壳**——注册表 + 三层 Provider + 双维度主题，新增工具成本极低。
- **完备的用户与积分闭环**——JWT 会话、事务化积分、可配置签到规则、后台可视化管理。

整体代码组织成熟、细节考究，主要改进方向是：**更新文档、加固生产安全配置（JWT 密钥/SMTP 脱敏）、抽取重复组件**。
