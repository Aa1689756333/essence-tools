# ToolBox · 在线工具箱

一个基于 Next.js 15 (App Router) + React 19 的全栈在线工具箱。前台内置多款**纯前端**文本工具（数据不离开浏览器），后台提供完整的**用户账户体系、积分签到系统与管理后台**。

- 前端框架：Next.js 15（App Router + Turbopack）+ React 19
- 样式：Tailwind CSS v4
- 数据库：Prisma ORM + SQLite（可切换 PostgreSQL）
- 认证：JWT（jose）+ bcryptjs，HttpOnly Cookie 会话
- 邮件：nodemailer（SMTP 验证码 / 找回密码）

## 功能概览

### 前台工具（纯前端，本地运行）

| 工具 | 路径 | 说明 |
|------|------|------|
| 📖 小说排版器 | `/novel-formatter` | 29 条排版规则一键规范化中文小说文本 |
| 📝 HTML 编辑器 | `/html-editor` | Word 式富文本编辑，可导出 HTML 代码 |
| 📄 Markdown 编辑器 | `/markdown-editor` | 实时预览的 Markdown 编辑器，支持导出 |

### 平台能力（需数据库 / 服务端）

| 模块 | 说明 |
|------|------|
| 用户账户 | 邮箱注册 / 登录、JWT 会话、个人资料修改、改密、注销账号 |
| 邮箱验证 | 可选开启注册验证码、找回密码验证码（依赖 SMTP） |
| 积分签到 | 每日签到得积分、连续签到加成、整月全勤奖励、积分流水 |
| 管理后台 | 仪表盘统计、用户管理（角色/封禁/积分调整）、系统设置 |
| 系统设置 | 站点 SEO、注册开关、邮箱黑白名单、SMTP 配置、签到规则 |
| 主题系统 | 5 套主题色 + 亮色/暗黑模式，localStorage 持久化 |

## 前台工具详解

### 📖 小说排版器

一键将混乱的 TXT 文本规范化为符合中文排版标准的阅读格式。

- **29 条排版规则**，按 4 阶段流水线顺序执行：
  - 阶段 1 — 字符级转换：全角数字/字母转半角、间隔号统一
  - 阶段 2 — 标点统一：中文语境标点转全角（保护小数点、时间、URL）、省略号 `……`、破折号 `——`、引号状态机（`"` → `""`）、波浪号、书名号及嵌套、重复标点合并
  - 阶段 3 — 空格处理：中英文间距（pangu）、数字与单位间距、全角标点去空格、括号间距、`&` 间距、拆行保护
  - 阶段 4 — 段落/行级处理：行首尾去空格、全角空格规范化、合并多余空行、首行缩进、章节标题识别、段落去重（防盗版水印）、对话格式规范
- **实时高亮联动**：鼠标悬停输入区或输出区，双向高亮对应段落
- **三面板同步滚动**：输入区、高亮覆盖层、输出区按比例同步
- **4 阶段进度动画**：排版时展示当前处理阶段
- **一键复制**：保留完整空行与换行结构

### 📝 HTML 编辑器

像 Word 一样编辑富文本，支持源码视图与 HTML 导出。

- **富文本格式化**：粗体/斜体/下划线/删除线、H1–H3/正文、左中右/两端对齐、有序/无序列表、缩进、引用块、代码块、分割线
- **字体与颜色**：9 种字体族、10 档字号、50 色调色板（文字色/背景色）
- **图片**：本地上传（base64）或网络 URL 插入、四角拖拽调整大小、预设尺寸（25/50/75/100%）、左中右对齐
- **表格**：可视化插入、右键菜单增删行列/删除表格
- **查找替换**：`Ctrl+F` 唤起，支持区分大小写、上/下一个、单个/全部替换
- **源码视图**：一键切换 HTML 源码编辑，支持代码格式化（美化缩进）与恢复
- **智能粘贴清理**：移除事件属性（防 XSS）、`<font>` → `<span>`、`<center>` → `<div>`、清理空包装元素
- **自动保存**：2 秒防抖写入 localStorage，下次进入提示恢复
- **全屏编辑**、**导出 HTML 文件**、**词数统计**（中文单字 + 英文单词）

### 📄 Markdown 编辑器

实时预览的 Markdown 编辑器，支持 GFM 语法与代码高亮。

- **三种视图**：纯编辑 / 纯预览 / 分屏（默认）
- **实时预览**：`marked` 解析 + `DOMPurify` 消毒 + `highlight.js` 代码语法高亮
- **工具栏**：粗体/斜体/删除线、H1–H3、有序/无序列表、任务列表、引用、行内代码、代码块、链接、图片、分割线
- **撤销/重做**：历史记录栈（上限 200 条，500ms 防抖合并连续输入）
- **自动保存**：2 秒防抖写入 localStorage，下次进入提示恢复
- **查找替换**、**全屏编辑**、**分屏滚动同步**
- **导出**：Markdown 文件 / HTML 文件、**复制 HTML**
- **词数统计**（中文单字 + 英文单词）

## 用户与积分系统

### 账户

- **注册 / 登录**：邮箱 + 密码，密码经 bcrypt 加盐哈希存储
- **会话**：登录签发 7 天有效期 JWT，写入 `HttpOnly` Cookie（`toolbox_session`）
- **首个用户自动成为管理员**：数据库无用户时注册即分配 `ADMIN` 角色
- **个人设置**：修改昵称、修改密码、注销账号（唯一管理员不可注销）
- **找回密码**：通过邮箱验证码重置（依赖 SMTP 配置）

### 每日签到

签到规则由管理员在后台配置（`checkin_config`），默认：

- **基础积分**：每日签到 +3
- **连续加成**：连续 3–6 天额外 +2，连续 ≥7 天额外 +4
- **每日封顶**：单日最多 7 分
- **整月全勤**：当月每天均签到，且在月末当天签到，额外奖励 +20（不受每日封顶限制）
- **积分流水**：每次积分变动记录到 `PointTransaction`，签到弹层展示历史与当月日历进度

## 管理后台 `/admin`

仅 `ADMIN` 角色可访问（页面 + `middleware` 双重校验）。

- **仪表盘**：总用户数、今日新增、今日签到人数、累计发放积分，以及 SMTP / 注册开关 / 邮箱校验模式状态与最新注册用户列表
- **用户管理**：分页 + 搜索（邮箱/昵称）+ 按角色/状态筛选；调整角色、封禁/解封、手动增减积分
- **系统设置**（四个页签）：
  - **SEO**：站点标题、描述、关键词（服务端注入 `<head>` metadata）
  - **认证**：开放注册开关、注册邮箱验证码开关
  - **邮箱校验**：`none` / `whitelist` / `blacklist` 三种模式与规则列表（支持 `@domain.com` 与 `*@domain.com` 通配）
  - **SMTP**：发信服务器配置，可发送测试邮件验证连通性
  - **签到规则**：基础积分、连续加成规则、每日封顶、整月全勤奖励

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15（App Router + Turbopack） |
| UI 库 | React 19 |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`） |
| 数据库 | Prisma ORM + SQLite（默认，可切 PostgreSQL） |
| 认证 | jose（JWT）+ bcryptjs |
| 校验 | zod |
| 邮件 | nodemailer |
| 图标 | lucide-react |
| Markdown | marked + DOMPurify + highlight.js |
| 语言 | JavaScript (ES Modules) |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并按需填写：

```bash
# JWT 签名密钥（生产环境必须设置）
# 生成方式: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your-super-secret-jwt-key

# 数据库（默认 SQLite）
DATABASE_URL="file:./dev.db"

NODE_ENV=development
PORT=3000
```

### 3. 初始化数据库

```bash
# 根据 schema 生成 Prisma Client 并创建表
npx prisma generate
npx prisma db push
```

> SMTP 参数无需写入环境变量，登录管理后台后在「系统设置 → SMTP」中配置即可。

### 4. 启动开发服务器

```bash
npm run dev     # http://localhost:3000（Turbopack）
```

首个注册的账号将自动成为管理员，登录后可从右上角用户菜单进入 `/admin`。

### 生产构建

```bash
npm run build
npm run start
```

## 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（Turbopack，热更新） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run test` | 运行全部脚本测试（排版验收 + MD + HTML） |
| `npm run test:acceptance` | 小说排版器验收测试 |
| `npm run test:md` / `test:md2` | Markdown 编辑器测试 |
| `npm run test:html` | HTML 编辑器测试 |
| `npm run test:fixes` | 回归修复测试（`node --test`） |

## 数据模型（Prisma）

```
User                 用户：邮箱、密码哈希、昵称、头像、角色(USER/ADMIN)、
                     状态(ACTIVE/BANNED)、积分、连续签到天数、上次签到日期
PointTransaction     积分流水：金额、余额、类型(CHECKIN/MONTH_FULL_BONUS...)、描述
SystemSetting        系统设置：key-value 键值对（SEO/注册/邮箱/SMTP/签到）
EmailVerification    邮箱验证码：邮箱、验证码、类型(REGISTER/RESET_PASSWORD)、
                     尝试次数、过期时间
```

## API 路由一览

```
/api/auth
  POST   /register          注册（首个用户自动为管理员）
  POST   /login             登录
  POST   /logout            退出登录
  GET    /me                获取当前登录用户
  GET    /config            公开注册配置（是否开放注册 / 是否需验证码）
  POST   /send-code         发送注册验证码
  POST   /forgot-password   发送找回密码验证码
  POST   /reset-password    重置密码

/api/user                   （middleware 校验登录）
  GET/PATCH /profile        获取 / 修改资料、改密、注销
  GET/POST  /checkin        签到状态 / 执行签到

/api/admin                  （middleware 校验 ADMIN 角色）
  GET       /dashboard      仪表盘统计
  GET/PATCH /users          用户列表 / 角色·状态·积分调整
  GET/PATCH /settings       读取 / 更新系统设置
  POST      /settings/test-email  发送 SMTP 测试邮件
```

## 项目结构

```
novel-formatter/
├── prisma/
│   ├── schema.prisma           # 数据模型定义
│   └── dev.db                  # SQLite 数据库文件
├── next.config.mjs             # Next.js 配置
├── jsconfig.json               # 路径别名 @/* → ./src/*
├── postcss.config.mjs          # Tailwind v4 PostCSS 插件
├── .env.example                # 环境变量示例
├── package.json
│
└── src/
    ├── middleware.js           # /api/admin 与 /api/user 鉴权
    │
    ├── app/                    # Next.js App Router
    │   ├── layout.jsx          # 根布局：Theme + Toast + Auth + Sidebar Provider
    │   ├── page.jsx            # 首页：工具总览
    │   ├── globals.css         # Tailwind 指令 + 主题/暗黑变量 + 动画
    │   ├── novel-formatter/    # 三个工具页面路由
    │   ├── html-editor/
    │   ├── markdown-editor/
    │   ├── admin/              # 管理后台（layout + dashboard/users/settings）
    │   └── api/                # 服务端接口（auth / user / admin）
    │
    ├── shell/                  # 应用外壳
    │   ├── ThemeProvider.jsx   # 5 套主题色 + 亮/暗模式 + CSS 变量注入
    │   ├── Sidebar.jsx         # 侧边栏：桌面折叠 / 移动抽屉
    │   ├── Topbar.jsx          # 顶栏：面包屑 + 搜索 + 签到 + 主题 + 用户菜单
    │   └── useSidebar.js       # 侧边栏状态 Context
    │
    ├── context/
    │   ├── AuthContext.jsx     # 全局登录态、弹层控制（登录/签到/资料）
    │   └── ToastContext.jsx    # 全局提示
    │
    ├── components/
    │   ├── auth/               # AuthModal / CheckInModal / ProfileModal
    │   ├── ui/                 # Modal / Toast / Toolbar / SkeletonLoader
    │   ├── ToolCard.jsx        # 首页工具卡片
    │   ├── SearchModal.jsx     # Ctrl+K 工具搜索
    │   └── ErrorBoundary.jsx
    │
    ├── hooks/                  # useClickOutside / useDebounce / useLocalStorage
    │
    ├── lib/                    # 服务端工具库
    │   ├── db.js               # Prisma Client 单例
    │   ├── auth.js             # 密码哈希、JWT、会话读取
    │   ├── settings.js         # 系统设置读写 + 缓存 + 邮箱规则校验
    │   ├── mailer.js           # SMTP 发信、测试、验证码邮件
    │   ├── verification.js     # 邮箱验证码生成 / 校验
    │   ├── rateLimit.js        # 内存限流（登录/注册/验证码/找回密码）
    │   ├── validate.js         # zod 请求体校验 schema
    │   ├── storage.js          # localStorage 封装
    │   └── utils.js
    │
    └── tools/                  # 工具实现
        ├── registry.js         # 工具注册表（id/name/path/icon/tags/category）
        ├── novel-formatter/    # 排版引擎、字符工具、高亮/滚动 hooks、面板组件
        ├── html-editor/        # 主组件 + 工具栏/编辑区/模态框/图片手柄
        └── markdown-editor/    # 主组件 + 预览/查找替换
```

## 架构要点

### 应用外壳

`RootLayout` 组合 `ThemeProvider → ToastProvider → AuthProvider → SidebarProvider`，统一提供主题、提示、登录态与响应式侧边栏。

- **桌面端**：侧边栏固定（可折叠 56px ↔ 200px），平板宽度自动折叠
- **移动端**：抽屉式侧边栏，遮罩层 + ESC 关闭
- **工具注册**：所有工具在 `registry.js` 集中注册，Sidebar 与首页均从注册表读取，新增工具只需加一条配置 + 一个页面

### 主题系统

`ThemeProvider` 提供 5 套主题色（薄荷绿 / 樱花粉 / 柠檬黄 / 天空蓝 / 薰衣紫）与**亮色 / 暗黑双模式**，通过 CSS 变量注入 `:root`，全应用消费 `var(--theme-accent)` 等变量。主题与暗黑偏好分别持久化到 `localStorage('toolbox-theme')` 与 `localStorage('toolbox-dark')`，并通过内联脚本在首屏前应用暗黑模式，避免闪烁。

### 小说排版器 — 输入面板分层架构

输入面板采用 textarea + overlay 分层，兼顾原生编辑体验与视觉高亮：

- **交互层** `textarea`（`z-index:2`）：文字透明、仅光标可见，接收所有输入/粘贴事件
- **渲染层** `highlight-overlay`（`z-index:1`）：`pointer-events:none`，渲染可见文本与悬停行高亮
- **悬停高亮**：监听 `mousemove`，用 `getBoundingClientRect()` 检测鼠标落在哪一 `.line`；输出侧通过 `<p data-input-line="N">` 反查
- **内容匹配**：`normalizeForMatch()` 全角转半角并去标点，按前缀匹配得分，从上次位置向后搜索保证顺序
- **同步滚动**：三面板按 `scrollRatio` 比例映射，`requestAnimationFrame` 每帧只同步一次

### 安全设计

- **鉴权**：`middleware.js` 拦截 `/api/admin/*`（需 `ADMIN`）与 `/api/user/*`（需登录）并校验 JWT
- **限流**：`rateLimit.js` 对登录、注册、发送验证码、找回密码分别做内存级 IP 限流
- **输入校验**：所有写接口用 `zod` schema 校验请求体
- **密码安全**：bcrypt 加盐哈希；会话 Cookie 为 `HttpOnly` + 生产环境 `secure`
- **XSS 防护**：HTML 编辑器输出经 `escapeHtml` + `isSafeUrl`（拦截 `javascript:`/`data:`）；Markdown 经 `DOMPurify.sanitize`
- **SSR 安全**：依赖 `window` 的库加 `typeof window === 'undefined'` 防护
- **前端工具纯本地**：三个文本工具标记 `clientOnly`，数据不离开浏览器

## 新增工具

1. 在 `src/tools/registry.js` 增加一条工具配置
2. 在 `src/app/<tool-id>/page.jsx` 创建路由（导出 `metadata` + 渲染工具组件）
3. 在 `src/tools/<tool-id>/` 实现工具组件

Sidebar 与首页会自动读取注册表，无需额外改动。

## 部署

由于使用了服务端 API、数据库与文件型 SQLite，推荐部署到支持 Node.js 运行时与持久化存储的平台（如自有服务器、VPS、支持持久卷的容器平台）。

- 生产环境**必须**设置 `JWT_SECRET`，否则服务端会抛错
- 如需部署到无持久化文件系统的平台（如 Serverless），请将 `DATABASE_URL` 切换为托管的 PostgreSQL 并修改 `prisma/schema.prisma` 的 `provider`
- 部署前执行 `npx prisma generate` 与数据库迁移

## 许可

MIT
