# ToolBox 逐步执行计划

> 编制日期：2026-08-22
> 本文档将改进计划拆分为一个个独立、可执行的小任务，每个任务可在一次对话中完成。
> 使用方式：告诉 AI「执行任务 T001」即可开始。
> 状态标记：`[ ]` 待执行 | `[x]` 已完成 | `[-]` 已跳过

---

## 使用说明

- 每个任务编号格式为 `TXXX`，按推荐执行顺序排列
- 任务之间存在少量依赖关系，已在对应任务中标注
- 建议按 Phase 顺序推进，同 Phase 内的任务可灵活调整
- 每个任务包含：目标、涉及文件、具体步骤、验收标准

---

## Phase 1：安全加固（最高优先级）

### T001 - JWT_SECRET 生产环境强制校验 `[x]`

**目标**：生产环境启动时若未配置 `JWT_SECRET` 则抛出错误终止启动，杜绝硬编码密钥上线。

**涉及文件**：
- `src/lib/auth.js` — 修改 JWT_SECRET 初始化逻辑

**具体步骤**：
1. 修改 `src/lib/auth.js`，将 JWT_SECRET 的初始化改为：
   - 若 `process.env.JWT_SECRET` 存在，使用它
   - 若 `NODE_ENV === 'production'` 且无环境变量，抛出 `Error('JWT_SECRET environment variable is required in production')`
   - 开发环境保留兜底值（但打印 console.warn 提醒）
2. 验证：`npm run dev` 能正常启动（开发环境兜底）

**验收标准**：
- 开发环境正常启动，控制台输出 warning 提醒配置 JWT_SECRET
- 代码中不再有硬编码密钥直接作为生产用途

**依赖**：无

---

### T002 - 创建 .env.example 环境变量文档 `[x]`

**目标**：为项目创建环境变量模板文件，方便新开发者快速配置。

**涉及文件**：
- `.env.example`（新建）

**具体步骤**：
1. 在项目根目录创建 `.env.example`
2. 列出所有需要的环境变量及注释说明：
   - `JWT_SECRET` — JWT 签名密钥，附生成命令提示
   - `DATABASE_URL` — 数据库连接字符串
   - `NODE_ENV` — 运行环境
3. 确认 `.gitignore` 已包含 `.env*`（排除 `.env.example`）

**验收标准**：
- `.env.example` 文件存在且内容清晰
- `.gitignore` 正确排除 `.env` 但保留 `.env.example`

**依赖**：无（可与 T001 并行）

---

### T003 - 管理员自我保护机制 `[x]`

**目标**：防止管理员误操作将自己降级/封禁，或把最后一个管理员降级导致系统锁死。

**涉及文件**：
- `src/app/api/admin/users/route.js` — PATCH handler 增加保护逻辑

**具体步骤**：
1. 在 `update_role` 操作中增加校验：
   - 若 `userId === currentUser.id` 且 `role !== 'ADMIN'`（即降级自己），返回 403 错误「不能降级自己的管理员权限」
   - 若目标用户是最后一个 ADMIN（查库 `db.user.count({ where: { role: 'ADMIN' } }) === 1`）且操作是降级，返回 403 错误「不能降级系统唯一的管理员」
2. 在 `update_status` 操作中增加校验：
   - 若 `userId === currentUser.id` 且 `status === 'BANNED'`（即封禁自己），返回 403 错误「不能封禁自己的账号」
3. 前端 `admin/users/page.jsx` 同步处理：对当前用户自身行隐藏「设为USER」和「冻结」按钮（UI 优化，非安全边界）

**验收标准**：
- 管理员无法通过 API 降级自己
- 管理员无法通过 API 封禁自己
- 最后一个管理员无法被降级
- 前端对当前用户不显示危险操作按钮

**依赖**：无

---

### T004 - SMTP 密码 API 返回脱敏 `[x]`

**目标**：GET /api/admin/settings 返回的 SMTP 配置中，密码字段不再原样返回，而是脱敏显示。

**涉及文件**：
- `src/app/api/admin/settings/route.js` — GET handler 增加脱敏逻辑
- `src/app/admin/settings/page.jsx` — 前端适配脱敏后的密码字段

**具体步骤**：
1. 后端 GET handler 中，读取 settings 后对 `smtp_config` 的 `pass` 字段脱敏：
   - 若密码存在且长度 > 4，返回 `'****' + pass.slice(-4)`（如 `****a1b2`）
   - 若密码存在且长度 <= 4，返回 `'****'`
   - 若密码为空，返回空字符串
2. 后端 POST handler 中增加判断：
   - 若前端传来的 `smtp_config.pass` 以 `****` 开头，说明用户未修改密码，从数据库读取原值保留
   - 否则视为用户输入了新密码，正常保存
3. 前端 `settings/page.jsx` 适配：
   - 加载设置后，密码框显示脱敏值
   - 用户点击密码框编辑时，清空输入框让用户输入新密码
   - 保存时若密码框为空或以 `****` 开头，传原脱敏值（后端会自动还原）

**验收标准**：
- GET 接口返回的 smtp_config.pass 是脱敏值（如 `****xxxx`）
- 用户不修改密码直接保存，原密码不丢失
- 用户输入新密码保存，新密码正确存储

**依赖**：无

---

### T005 - 全局 Middleware 鉴权 `[x]`

**目标**：创建 Next.js Middleware 统一拦截管理接口，避免新增 API 时遗漏鉴权。

**涉及文件**：
- `src/middleware.js`（新建）

**具体步骤**：
1. 创建 `src/middleware.js`
2. 配置 matcher 匹配 `/api/admin/:path*` 和 `/api/user/:path*`
3. 对 `/api/admin/*`：
   - 解析 cookie 中的 JWT token
   - 校验 token 有效性 + `role === 'ADMIN'`
   - 不满足返回 403 JSON 响应
4. 对 `/api/user/*`：
   - 校验 JWT token 有效性（已登录）
   - 不满足返回 401 JSON 响应
5. 注意：middleware 运行在 Edge Runtime，需要用 `jose` 直接校验 JWT（不能用 `getSessionUser` 因为它依赖 `next/headers` 的 cookies() 和 Prisma 查库）
6. 仅做 token 签名校验和角色检查，不做数据库查询（保持 middleware 轻量）
7. route handler 内的鉴权代码保留作为第二道防线

**验收标准**：
- 未登录访问 `/api/user/checkin` 返回 401
- 非 ADMIN 访问 `/api/admin/dashboard` 返回 403
- ADMIN 正常访问所有接口不受影响
- 现有功能不受影响

**依赖**：无（但建议在 T001 之后执行）

---

### T006 - 验证码过期记录清理 `[x]`

**目标**：定期清理过期的邮箱验证码记录，避免数据库无限膨胀。

**涉及文件**：
- `src/lib/verification.js` — 在 issueCode 中增加批量清理

**具体步骤**：
1. 在 `issueCode()` 函数中，清理该邮箱旧验证码之后，额外执行一次全局过期清理：
   ```js
   await db.emailVerification.deleteMany({
     where: { expiresAt: { lt: new Date() } }
   });
   ```
2. 为避免每次发送验证码都执行清理的性能开销，可用概率触发（如 10% 概率执行全局清理），或在 `verifyEmailCode` 失败时附带清理

**验收标准**：
- 过期验证码会被自动清理
- 不影响正常的验证码发送和校验流程

**依赖**：无

---

### T007 - 请求体校验基础设施（zod）`[x]`

**目标**：引入 zod 库，为 API 请求体提供 schema 校验。

**涉及文件**：
- `package.json` — 安装 zod
- `src/lib/validate.js`（新建）— 封装校验工具函数
- `src/app/api/auth/register/route.js` — 第一个接入校验的接口
- `src/app/api/auth/login/route.js` — 接入校验

**具体步骤**：
1. `npm install zod`
2. 创建 `src/lib/validate.js`：
   - 导出 `validateBody(req, schema)` 函数：解析 JSON body → schema.parse → 返回 `{ data }` 或 `{ error }`
   - 错误时返回 400 + 友好的错误信息
3. 定义 auth 相关 schema：
   - `registerSchema`：email(max 255)、password(min 6, max 128)、nickname(max 50, optional)、code(6位数字, optional)
   - `loginSchema`：email(max 255)、password(max 128)
4. 在 register 和 login route 中接入 `validateBody`
5. 验证：发送非法请求体（如超长字符串、缺字段）返回 400

**验收标准**：
- zod 已安装
- register/login 接口能正确校验输入并返回友好错误
- 正常请求不受影响

**依赖**：无

---

### T008 - 剩余 API 接入请求体校验 `[x]`

**目标**：为所有 POST/PATCH 接口补充 zod 请求体校验。

**涉及文件**：
- `src/lib/validate.js` — 补充更多 schema
- `src/app/api/admin/users/route.js` — PATCH 接入校验
- `src/app/api/admin/settings/route.js` — POST 接入校验
- `src/app/api/auth/send-code/route.js` — POST 接入校验
- `src/app/api/user/checkin/route.js` — POST 无 body 可不改

**具体步骤**：
1. 在 `validate.js` 中定义 schema：
   - `adminUserPatchSchema`：userId(uuid)、action(enum)、role(enum, optional)、status(enum, optional)、pointsDelta(number, optional)、reason(string max 200, optional)
   - `adminSettingsSchema`：各设置字段的类型和长度限制
   - `sendCodeSchema`：email(max 255)
2. 在各 route handler 中接入 `validateBody`
3. 验证所有接口正常功能和异常输入

**验收标准**：
- 所有 POST/PATCH 接口都有 schema 校验
- 非法输入返回 400 + 清晰错误信息
- 正常请求不受影响

**依赖**：T007（需要先建立校验基础设施）

---

### T009 - API 速率限制 `[x]`

**目标**：为敏感接口添加速率限制，防止暴力破解和滥用。

**涉及文件**：
- `src/lib/rateLimit.js`（新建）— 自实现基于内存的速率限制
- `src/app/api/auth/login/route.js` — 接入限流
- `src/app/api/auth/register/route.js` — 接入限流
- `src/app/api/auth/send-code/route.js` — 接入限流

**具体步骤**：
1. 创建 `src/lib/rateLimit.js`：
   - 使用 `Map` 存储 `{ key: { count, resetTime } }`
   - 导出 `checkRateLimit(key, { maxRequests, windowMs })` 函数
   - 返回 `{ allowed: boolean, retryAfter: number }`
   - 定期清理过期条目（可在每次检查时惰性清理）
2. 定义限流规则：
   - 登录：每 IP 每分钟 5 次
   - 注册：每 IP 每小时 10 次
   - 发送验证码：每 IP 每小时 5 次（邮箱级别的 60s 限制已有）
3. 在各 route 中获取客户端 IP（`req.headers.get('x-forwarded-for')` 或 `req.headers.get('x-real-ip')`）
4. 超限时返回 429 Too Many Requests

**验收标准**：
- 短时间内大量请求会触发 429
- 正常频率的请求不受影响
- 不同 IP 独立计数

**依赖**：无

---

## Phase 2：功能补全

### T010 - 404 和错误页面 `[x]`

**目标**：创建与应用风格统一的 404 页面和错误处理页面。

**涉及文件**：
- `src/app/not-found.jsx`（新建）
- `src/app/error.jsx`（新建）

**具体步骤**：
1. 创建 `not-found.jsx`：
   - 使用应用主题变量（`var(--theme-accent)` 等）
   - 展示友好的 404 提示 + 「返回首页」按钮
   - 简洁设计，与整体 UI 风格一致
2. 创建 `error.jsx`（需 `'use client'`）：
   - 接收 `error` 和 `reset` props
   - 展示错误信息 + 「重试」按钮（调用 reset）
   - 展示「返回首页」按钮

**验收标准**：
- 访问 `/nonexistent` 显示自定义 404 页面
- 组件渲染错误时显示自定义错误页面
- 样式与应用主题一致

**依赖**：无

---

### T011 - Error Boundary 组件 `[x]`

**目标**：添加 React Error Boundary，防止子组件崩溃导致整个应用白屏。

**涉及文件**：
- `src/components/ErrorBoundary.jsx`（新建）
- `src/app/layout.jsx` — 包裹 main 内容

**具体步骤**：
1. 创建 `ErrorBoundary.jsx`（class component）：
   - `componentDidCatch` 捕获错误
   - fallback UI：显示错误信息 + 「重新加载」按钮
   - 支持 `resetErrorBoundary` 重置
2. 在 `layout.jsx` 中用 `<ErrorBoundary>` 包裹 `{children}`
3. 样式与应用风格一致

**验收标准**：
- 子组件抛出错误时显示 ErrorBoundary 的 fallback UI
- 点击「重新加载」能恢复
- 不会导致整个页面白屏

**依赖**：T010（复用类似的 UI 风格）

---

### T012 - 全局 Toast 通知系统 `[x]`

**目标**：创建统一的 Toast 通知组件，替代各组件中自行实现的消息提示。

**涉及文件**：
- `src/components/ui/Toast.jsx`（新建）
- `src/context/ToastContext.jsx`（新建）
- `src/app/layout.jsx` — 接入 ToastProvider

**具体步骤**：
1. 创建 `ToastContext.jsx`：
   - 提供 `toast.success(msg)` / `toast.error(msg)` / `toast.info(msg)` 方法
   - 管理 toast 列表状态（最多同时显示 3 个）
   - 自动消失（默认 3 秒，error 5 秒）
2. 创建 `Toast.jsx`：
   - 从右上角堆叠显示
   - 不同类型不同颜色（success 绿 / error 红 / info 蓝）
   - 支持手动关闭按钮
   - 进入/退出动画（slide-in / fade-out）
3. 在 `layout.jsx` 中添加 `<ToastProvider>` 包裹

**验收标准**：
- 任意组件可调用 `useToast().success('xxx')` 显示通知
- 通知自动消失
- 样式统一美观

**依赖**：无

---

### T013 - 用户个人资料 API `[x]`

**目标**：实现用户修改昵称和密码的后端接口。

**涉及文件**：
- `src/app/api/user/profile/route.js`（新建）

**具体步骤**：
1. 创建 `src/app/api/user/profile/route.js`
2. GET handler：返回当前用户信息（复用 getSessionUser）
3. PATCH handler：
   - 接收 `{ action: 'update_nickname' | 'update_password', ... }`
   - `update_nickname`：校验 nickname 非空且 ≤ 50 字符 → 查重 → 更新
   - `update_password`：校验 oldPassword 正确 → 校验 newPassword ≥ 6 位 → hash → 更新
4. 所有操作需先验证登录态

**验收标准**：
- 能成功修改昵称（重复昵称返回错误）
- 能成功修改密码（旧密码错误返回错误）
- 未登录返回 401

**依赖**：T007（使用 zod 校验输入）

---

### T014 - 用户个人资料前端页面 `[x]`

**目标**：在 Topbar 用户菜单中增加「个人设置」入口，点击弹出设置弹窗。

**涉及文件**：
- `src/components/auth/ProfileModal.jsx`（新建）
- `src/context/AuthContext.jsx` — 增加 showProfileModal 状态
- `src/shell/Topbar.jsx` — 用户菜单增加「个人设置」入口

**具体步骤**：
1. 创建 `ProfileModal.jsx`：
   - 两个区域：修改昵称、修改密码
   - 修改昵称：输入框 + 保存按钮
   - 修改密码：旧密码 + 新密码 + 确认密码 + 保存按钮
   - 操作成功/失败显示提示
2. 在 `AuthContext.jsx` 中增加 profile modal 的开关状态
3. 在 `Topbar.jsx` 用户菜单中增加「个人设置」菜单项
4. 在 `layout.jsx` 中渲染 `<ProfileModal />`
5. 修改成功后调用 `refreshUser()` 更新全局用户状态

**验收标准**：
- 用户菜单中有「个人设置」入口
- 弹窗能修改昵称和密码
- 修改后全局用户状态同步更新

**依赖**：T013（后端 API）

---

### T015 - 密码重置 API `[x]`

**目标**：实现「忘记密码」流程的后端接口。

**涉及文件**：
- `src/app/api/auth/forgot-password/route.js`（新建）
- `src/app/api/auth/reset-password/route.js`（新建）
- `src/lib/auth.js` — 增加密码重置 token 生成/校验函数
- `prisma/schema.prisma` — 可能需要 PasswordResetToken 模型（或复用 EmailVerification）

**具体步骤**：
1. 方案选择：复用 `EmailVerification` 模型（将用途扩展为「验证码」和「密码重置」），或新建模型。建议复用，增加 `type` 字段。
2. `forgot-password` POST：
   - 接收 email → 检查用户是否存在（不存在也返回成功，防枚举）
   - 若存在，生成 6 位验证码，存入 EmailVerification（15 分钟有效）
   - 通过 SMTP 发送验证码邮件
3. `reset-password` POST：
   - 接收 email + code + newPassword
   - 校验验证码 → 更新密码 → 删除验证码记录
4. 限流：forgot-password 每 IP 每小时 3 次

**验收标准**：
- 输入注册邮箱能收到重置验证码邮件
- 输入正确验证码 + 新密码能成功重置
- 不存在的邮箱也返回「已发送」（防枚举）

**依赖**：T007（zod 校验）、T009（限流）

---

### T016 - 密码重置前端 UI `[x]`

**目标**：在登录弹窗中增加「忘记密码？」链接和重置流程。

**涉及文件**：
- `src/components/auth/AuthModal.jsx` — 增加忘记密码流程

**具体步骤**：
1. 在 AuthModal 登录表单底部增加「忘记密码？」链接
2. 点击后切换到「密码重置」模式（新增第三种 mode）
3. 密码重置流程：
   - 第一步：输入邮箱 → 发送验证码
   - 第二步：输入验证码 + 新密码 → 提交重置
   - 成功后自动切换到登录模式
4. 复用已有的验证码发送 UI（倒计时等）

**验收标准**：
- 登录弹窗有「忘记密码？」入口
- 能完成完整的密码重置流程
- 重置成功后能用新密码登录

**依赖**：T015（后端 API）

---

### T017 - 全局搜索功能 `[x]`

**目标**：实现 Ctrl+K 唤起的全局搜索弹层，支持搜索工具并快速跳转。

**涉及文件**：
- `src/components/SearchModal.jsx`（新建）
- `src/shell/Topbar.jsx` — 搜索按钮接入
- `src/app/layout.jsx` — 渲染 SearchModal

**具体步骤**：
1. 创建 `SearchModal.jsx`：
   - 全屏遮罩 + 居中搜索框
   - 输入时实时过滤工具列表（匹配 name / desc / tags / category）
   - 键盘上下键选择 + Enter 跳转
   - ESC 关闭
2. 在 Topbar 中：
   - 搜索按钮点击打开 SearchModal
   - 注册全局快捷键 `Ctrl+K` / `Cmd+K`
3. 搜索结果点击后使用 `router.push()` 跳转

**验收标准**：
- Ctrl+K 能唤起搜索
- 输入关键词能过滤出匹配的工具
- 点击/Enter 能跳转到对应工具页面
- ESC 能关闭搜索

**依赖**：无

---

### T018 - 账号注销功能 `[x]`

**目标**：允许用户在个人设置中注销（删除）自己的账号。

**涉及文件**：
- `src/app/api/user/profile/route.js` — 增加 `delete_account` action
- `src/components/auth/ProfileModal.jsx` — 增加注销账号 UI

**具体步骤**：
1. 后端 PATCH profile 增加 `delete_account` action：
   - 需验证密码（二次确认）
   - 若用户是唯一的 ADMIN，拒绝删除
   - 删除用户（cascade 会自动删除 PointTransaction）
   - 清除 session cookie
2. 前端 ProfileModal 增加「危险区域」：
   - 红色「注销账号」按钮
   - 点击弹出二次确认弹窗（需输入密码）
   - 确认后执行注销并跳转首页

**验收标准**：
- 用户能成功注销自己的账号
- 唯一管理员不能注销自己
- 注销后 session 被清除，跳转首页

**依赖**：T014（个人设置页面已存在）

---

## Phase 3：代码重构

### T019 - 抽取公共工具函数 `[x]`

**目标**：将重复的工具函数抽取到公共模块。

**涉及文件**：
- `src/lib/utils.js`（新建）
- `src/tools/html-editor/HtmlEditor.jsx` — 替换内部 countWords
- `src/tools/markdown-editor/MarkdownEditor.jsx` — 替换内部 countWords

**具体步骤**：
1. 创建 `src/lib/utils.js`：
   - `countWords(text)` — 中文单字 + 英文单词（从 HtmlEditor 中抽取）
   - `debounce(fn, delay)` — 防抖
   - `throttle(fn, delay)` — 节流
   - `formatDate(date, format)` — 日期格式化
   - `getLocalDateStr(date)` — 获取本地时区日期字符串（从 checkin/route.js 中抽取）
2. 修改 HtmlEditor 和 MarkdownEditor 中的 countWords 引用
3. 确保所有功能正常

**验收标准**：
- `utils.js` 导出公共函数
- HtmlEditor 和 MarkdownEditor 使用公共 countWords
- 词数统计结果与之前一致

**依赖**：无

---

### T020 - 抽取公共 UI 组件：Modal `[ ]`

**目标**：创建通用 Modal 组件，替代各处的重复实现。

**涉及文件**：
- `src/components/ui/Modal.jsx`（新建）
- `src/components/auth/AuthModal.jsx` — 使用公共 Modal
- `src/components/auth/CheckInModal.jsx` — 使用公共 Modal
- `src/tools/html-editor/HtmlEditor.jsx` — 使用公共 Modal

**具体步骤**：
1. 创建 `src/components/ui/Modal.jsx`：
   - Props：`isOpen`, `onClose`, `title`, `children`, `maxWidth`
   - 功能：遮罩层 + ESC 关闭 + 关闭按钮 + 动画
   - 使用 portal 渲染到 body
   - 支持主题变量
2. 逐个替换 AuthModal、CheckInModal、HtmlEditor 中的 Modal 使用
3. 确保所有弹窗功能正常

**验收标准**：
- 公共 Modal 组件存在
- 所有使用 Modal 的地方功能正常
- 样式统一

**依赖**：无

---

### T021 - 抽取公共 UI 组件：Toolbar `[ ]`

**目标**：将 HtmlEditor 和 MarkdownEditor 中重复的工具栏组件抽取为公共组件。

**涉及文件**：
- `src/components/ui/Toolbar.jsx`（新建）— ToolbarBtn / ToolbarDivider / ToolbarSelect / ToolbarGroup
- `src/tools/html-editor/HtmlEditor.jsx` — 替换内部 ToolbarBtn 等
- `src/tools/markdown-editor/MarkdownEditor.jsx` — 替换内部 ToolbarBtn 等

**具体步骤**：
1. 创建 `src/components/ui/Toolbar.jsx`：
   - 导出 `ToolbarBtn`（icon + onClick + active + title）
   - 导出 `ToolbarDivider`
   - 导出 `ToolbarSelect`（value + options + onChange + title + width）
   - 导出 `ToolbarGroup`（可选，用于分组）
2. 从 HtmlEditor 中移除内部 ToolbarBtn/ToolbarDivider/ToolbarSelect 定义，改为 import
3. 从 MarkdownEditor 中同样替换
4. 确保两个编辑器工具栏功能正常

**验收标准**：
- 公共 Toolbar 组件存在
- HtmlEditor 和 MarkdownEditor 使用公共 Toolbar 组件
- 工具栏外观和功能与之前一致

**依赖**：无

---

### T022 - HtmlEditor 拆分：提取 HTML 工具函数 `[ ]`

**目标**：将 HtmlEditor.jsx 中的纯函数（sanitizeHtml, formatHtml, cleanHtml, escapeHtml, isSafeUrl, countWords）提取到独立文件。

**涉及文件**：
- `src/tools/html-editor/lib/htmlUtils.js`（新建）
- `src/tools/html-editor/HtmlEditor.jsx` — 移除函数定义，改为 import

**具体步骤**：
1. 创建 `src/tools/html-editor/lib/htmlUtils.js`
2. 从 HtmlEditor.jsx 中移动以下函数：
   - `sanitizeHtml(html)`
   - `formatHtml(html)`
   - `cleanHtml(html)`
   - `escapeHtml(str)`
   - `isSafeUrl(url)`
   - `countWords(html)` — 或改用 T019 中的公共版本
3. 在 HtmlEditor.jsx 中 import 这些函数
4. 确保编辑器所有功能正常（格式化、清理、XSS 防护等）

**验收标准**：
- htmlUtils.js 包含所有 HTML 相关工具函数
- HtmlEditor.jsx 行数减少约 100 行
- 所有功能正常

**依赖**：T019（countWords 统一）

---

### T023 - HtmlEditor 拆分：提取模态框组件 `[ ]`

**目标**：将 HtmlEditor.jsx 中的链接/图片/表格模态框提取为独立组件。

**涉及文件**：
- `src/tools/html-editor/components/LinkModal.jsx`（新建）
- `src/tools/html-editor/components/ImageModal.jsx`（新建）
- `src/tools/html-editor/components/TableModal.jsx`（新建）
- `src/tools/html-editor/HtmlEditor.jsx` — 移除模态框 JSX，改为引用组件

**具体步骤**：
1. 创建 `LinkModal.jsx`：
   - Props：`isOpen`, `onConfirm({ url, text })`, `onCancel`, `initialData`
   - 包含 URL 输入 + 文本输入 + 确认/取消
2. 创建 `ImageModal.jsx`：
   - Props：`isOpen`, `onConfirm({ url, alt, isBase64 })`, `onCancel`
   - 包含本地上传/网络图片 tab + 预览 + alt 输入
3. 创建 `TableModal.jsx`：
   - Props：`isOpen`, `onConfirm({ rows, cols })`, `onCancel`
   - 包含行列数输入
4. 从 HtmlEditor.jsx 中移除对应模态框的 JSX 代码
5. 确保所有模态框功能正常

**验收标准**：
- 三个模态框组件独立存在
- HtmlEditor.jsx 行数减少约 200 行
- 插入链接/图片/表格功能正常

**依赖**：无

---

### T024 - HtmlEditor 拆分：提取查找替换和图片缩放逻辑 `[ ]`

**目标**：将查找替换和图片缩放逻辑提取为自定义 hooks。

**涉及文件**：
- `src/tools/html-editor/hooks/useFindReplace.js`（新建）
- `src/tools/html-editor/hooks/useImageResize.js`（新建）
- `src/tools/html-editor/HtmlEditor.jsx` — 使用 hooks 替代内联逻辑

**具体步骤**：
1. 创建 `useFindReplace.js`：
   - 管理 findText, replaceText, findMatches, currentMatchIndex 状态
   - 导出 performFind, findNext, findPrevious, replaceCurrent, replaceAll, closeFindReplace
   - 接收 editorRef 参数
2. 创建 `useImageResize.js`：
   - 管理 selectedImage, imageSize, dragStateRef 状态
   - 导出 handleResizeStart, handleImagePresetSize, handleImageAlign, handleEditorClick, handleEditorScroll
   - 接收 editorRef 参数
3. 在 HtmlEditor 中使用 hooks
4. 确保查找替换和图片缩放功能正常

**验收标准**：
- 两个 hooks 独立存在
- HtmlEditor.jsx 行数减少约 300 行
- 查找替换和图片缩放功能正常

**依赖**：T022, T023（先提取函数和模态框）

---

### T025 - HtmlEditor 拆分：提取工具栏和编辑区组件 `[ ]`

**目标**：将 HtmlEditor.jsx 的工具栏 JSX 和编辑区 JSX 提取为独立组件。

**涉及文件**：
- `src/tools/html-editor/components/EditorToolbar.jsx`（新建）
- `src/tools/html-editor/components/EditorArea.jsx`（新建）
- `src/tools/html-editor/components/FindReplaceBar.jsx`（新建）
- `src/tools/html-editor/HtmlEditor.jsx` — 使用组件替代内联 JSX

**具体步骤**：
1. 创建 `EditorToolbar.jsx`：
   - 接收 formatState, exec 函数, theme 等 props
   - 包含完整的工具栏按钮布局
2. 创建 `FindReplaceBar.jsx`：
   - 接收 useFindReplace hook 的返回值
   - 包含查找替换 UI
3. 创建 `EditorArea.jsx`：
   - 接收 editorRef, contentEditable 相关 handlers
   - 包含编辑区 + 空状态提示 + 源码视图切换
4. 在 HtmlEditor 中组合这些组件
5. 确保所有功能正常

**验收标准**：
- HtmlEditor.jsx 行数减少到 500 行以内
- 所有编辑功能正常
- 组件间 props 传递清晰

**依赖**：T022, T023, T024

---

### T026 - 抽取公共 hooks `[ ]`

**目标**：将各组件中重复的 hooks 模式抽取为公共 hooks。

**涉及文件**：
- `src/hooks/useClickOutside.js`（新建）
- `src/hooks/useDebounce.js`（新建）
- `src/hooks/useLocalStorage.js`（新建）
- 相关文件 — 替换内部实现

**具体步骤**：
1. 创建 `useClickOutside.js`：
   - 接收 ref + callback
   - 监听 mousedown 事件，点击 ref 外部时触发 callback
   - 替换 Topbar 中的 pickerRef/userMenuRef 点击外部关闭逻辑
2. 创建 `useDebounce.js`：
   - 接收 value + delay
   - 返回 debouncedValue
   - 或创建 `useDebouncedCallback(fn, delay)`
3. 创建 `useLocalStorage.js`：
   - 封装 `safeGetItem` / `safeSetItem`
   - 返回 `[storedValue, setValue]`
   - 替换 ThemeProvider 中的 localStorage 读写
4. 在对应组件中替换

**验收标准**：
- 三个公共 hooks 存在
- 对应组件使用公共 hooks 后功能正常

**依赖**：无

---

## Phase 4：性能优化

### T027 - 工具组件懒加载 `[ ]`

**目标**：使用 next/dynamic 动态导入工具组件，减少首页包体积。

**涉及文件**：
- `src/app/novel-formatter/page.jsx` — 改为 dynamic import
- `src/app/html-editor/page.jsx` — 改为 dynamic import
- `src/app/markdown-editor/page.jsx` — 改为 dynamic import

**具体步骤**：
1. 在每个工具的 `page.jsx` 中：
   ```jsx
   import dynamic from 'next/dynamic';
   const NovelFormatter = dynamic(() => import('@/tools/novel-formatter/NovelFormatter'), {
     loading: () => <SkeletonLoader />
   });
   ```
2. 创建通用的 `SkeletonLoader` 组件（简单的骨架屏动画）
3. 注意：page.jsx 中需要导出 metadata，但 dynamic import 的组件是 client component，metadata 需要在 page 层面导出（当前已经是这样）
4. 验证构建后各工具页面的 chunk 是否独立

**验收标准**：
- 首页加载时不包含工具组件代码
- 进入工具页面时显示骨架屏然后加载组件
- 所有工具功能正常

**依赖**：无

---

### T028 - highlight.js 按需加载优化 `[ ]`

**目标**：减少 highlight.js 的包体积，仅加载常用语言。

**涉及文件**：
- `src/tools/markdown-editor/MarkdownEditor.jsx` — 修改 highlight.js 导入方式

**具体步骤**：
1. 评估当前 7 种语言的使用频率，精简为 4 种（JavaScript, CSS, XML/HTML, JSON）
2. 修改导入方式：
   ```js
   import hljs from 'highlight.js/lib/core';
   import javascript from 'highlight.js/lib/languages/javascript';
   import css from 'highlight.js/lib/languages/css';
   import xml from 'highlight.js/lib/languages/xml';
   import json from 'highlight.js/lib/languages/json';
   hljs.registerLanguage('javascript', javascript);
   hljs.registerLanguage('css', css);
   hljs.registerLanguage('xml', xml);
   hljs.registerLanguage('json', json);
   ```
3. 验证代码高亮功能正常

**验收标准**：
- highlight.js 仅注册必要语言
- 代码块高亮功能正常
- 包体积减小（可通过 build 输出对比）

**依赖**：无

---

## Phase 5：文档与 DevOps

### T029 - 更新 README 文档 `[ ]`

**目标**：更新 README.md，补充所有功能模块的说明。

**涉及文件**：
- `README.md`

**具体步骤**：
1. 在现有 README 基础上补充：
   - 用户系统功能（注册/登录/JWT 会话/邮箱验证码）
   - 积分签到系统（连续签到/整月全勤/积分规则）
   - 后台管理系统（仪表盘/用户管理/系统设置/SMTP 测试）
   - 环境变量配置说明（引用 .env.example）
   - 数据库初始化步骤（`npx prisma migrate dev`）
   - 部署指南（Vercel / Docker）
2. 更新项目结构树（补充 api/, lib/, context/, components/ 等目录）
3. 保持文档简洁，不过度冗长

**验收标准**：
- README 涵盖所有功能模块
- 新开发者能根据 README 完成项目搭建
- 文档结构清晰

**依赖**：T002（.env.example 已创建）

---

### T030 - Docker 部署配置 `[ ]`

**目标**：创建 Docker 相关文件，支持容器化部署。

**涉及文件**：
- `Dockerfile`（新建）
- `docker-compose.yml`（新建）
- `.dockerignore`（新建）

**具体步骤**：
1. 创建 `Dockerfile`：
   - 多阶段构建：deps → prisma generate → build → production
   - 基于 `node:20-alpine`
   - 暴露 PORT 3000
2. 创建 `docker-compose.yml`：
   - 应用服务
   - 可选 PostgreSQL 服务（注释状态，默认用 SQLite）
3. 创建 `.dockerignore`：
   - 排除 node_modules, .next, .git, dev.db 等
4. 测试 `docker build` 和 `docker run` 能正常启动

**验收标准**：
- `docker build -t toolbox .` 成功
- `docker run -p 3000:3000 toolbox` 能正常访问
- 数据持久化（SQLite 文件通过 volume 挂载）

**依赖**：T002（环境变量配置）

---

### T031 - GitHub Actions CI 配置 `[ ]`

**目标**：创建 CI 流水线，每次提交自动运行测试和构建。

**涉及文件**：
- `.github/workflows/ci.yml`（新建）

**具体步骤**：
1. 创建 `.github/workflows/ci.yml`
2. 流程：
   - trigger：push to main, pull request
   - steps：checkout → setup node → npm ci → npx prisma generate → npm run build → npm test
3. 可选：添加 lint step（需先配置 ESLint）

**验收标准**：
- 推送到 GitHub 后 CI 自动运行
- build 和 test 通过

**依赖**：无

---

## Phase 6：进阶改进

### T032 - 键盘快捷键体系 `[ ]`

**目标**：建立全局键盘快捷键系统。

**涉及文件**：
- `src/hooks/useKeyboardShortcut.js`（新建）
- `src/shell/Topbar.jsx` — 注册快捷键
- `src/components/SearchModal.jsx`（若 T017 已完成）

**具体步骤**：
1. 创建 `useKeyboardShortcut.js`：
   - 接收 `{ 'ctrl+k': callback, 'ctrl+shift+d': callback }` 映射
   - 自动处理 Mac 的 Cmd 键
2. 注册全局快捷键：
   - `Ctrl+K`：打开搜索
   - `Ctrl+Shift+D`：切换暗色模式
3. 确保不与浏览器默认快捷键冲突

**验收标准**：
- 全局快捷键能正常工作
- 不冲突浏览器默认行为

**依赖**：T017（搜索功能）

---

### T033 - 数据库备份脚本 `[ ]`

**目标**：创建数据库备份脚本，防止数据丢失。

**涉及文件**：
- `scripts/backup-db.js`（新建）
- `package.json` — 添加 `npm run db:backup` 命令

**具体步骤**：
1. 创建 `scripts/backup-db.js`：
   - 复制 `prisma/dev.db` 到 `backups/dev.db.{timestamp}`
   - 保留最近 10 个备份文件，自动清理旧的
2. 在 package.json 中添加命令

**验收标准**：
- `npm run db:backup` 能成功创建备份
- 备份文件带时间戳
- 自动清理旧备份

**依赖**：无

---

### T034 - Prisma 迁移配置 `[ ]`

**目标**：使用 Prisma Migrate 管理数据库 schema 变更，替代直接操作 dev.db。

**涉及文件**：
- `prisma/migrations/`（自动生成）

**具体步骤**：
1. 运行 `npx prisma migrate dev --name init` 生成初始迁移文件
2. 确认迁移文件正确包含所有现有模型
3. 后续 schema 变更统一通过 `prisma migrate dev` 管理
4. 在 README 中补充迁移命令说明

**验收标准**：
- 迁移文件存在且正确
- `prisma migrate deploy` 能在空数据库上重建所有表
- 现有数据不受影响

**依赖**：无

---

### T035 - CSRF 防护增强 `[ ]`

**目标**：对敏感操作增加额外的安全检查。

**涉及文件**：
- `src/middleware.js` — 增加 Origin/Referer 检查（若 T005 已完成）
- `src/app/api/admin/users/route.js` — 敏感操作增加额外校验
- `src/app/api/user/profile/route.js` — 密码修改增加额外校验

**具体步骤**：
1. 在 middleware 中增加 POST 请求的 Origin 检查（可选，需考虑反向代理场景）
2. 对敏感操作（角色变更、密码修改）增加 `referer` 检查作为辅助
3. 评估 `sameSite: 'strict'` 的可行性（可能影响从外部链接进入的体验）

**验收标准**：
- 跨域 POST 请求被拒绝
- 正常操作不受影响

**依赖**：T005（Middleware）

---

### T036 - API 文档编写 `[ ]`

**目标**：为所有 API 接口编写文档。

**涉及文件**：
- `API_DOC.md`（新建）或直接在 README 中增加 API 章节

**具体步骤**：
1. 列出所有 API 路由
2. 每个接口记录：
   - 方法 + 路径
   - 请求体格式
   - 响应格式
   - 错误码说明
   - 权限要求
3. 按模块分组（auth / user / admin）

**验收标准**：
- 所有接口都有文档
- 文档格式统一清晰

**依赖**：无

---

## 任务依赖关系图

```
T001 (JWT) ──────────────────────────────────────┐
T002 (.env.example) ─────────────────────────────┤
T003 (管理员保护) ────────────────────────────────┤
T004 (SMTP 脱敏) ────────────────────────────────┤
T006 (验证码清理) ────────────────────────────────┤
T010 (404 页面) ─────────────────────────────────┤
T019 (公共工具函数) ─────────────────────────────┤
T020 (公共 Modal) ───────────────────────────────┤
T021 (公共 Toolbar) ─────────────────────────────┤
T026 (公共 hooks) ───────────────────────────────┤
T028 (highlight.js) ─────────────────────────────┤
T033 (数据库备份) ───────────────────────────────┤
T034 (Prisma 迁移) ──────────────────────────────┤
                                                  │
T007 (zod 基础设施) ──┬──→ T008 (剩余 API 校验) │
                       ├──→ T013 (个人资料 API) ──→ T014 (个人资料 UI) ──→ T018 (账号注销)
                       ├──→ T015 (密码重置 API) ──→ T016 (密码重置 UI)
                       └──→ T009 (速率限制)
                          
T005 (Middleware) ────→ T035 (CSRF)

T010 (404 页面) ──────→ T011 (Error Boundary)

T017 (全局搜索) ──────→ T032 (快捷键)

T022 (提取 HTML 函数) ─┐
T023 (提取模态框) ─────┤──→ T025 (提取工具栏/编辑区)
T024 (提取 hooks) ─────┘

T002 (.env.example) ──→ T029 (更新 README)
                       ──→ T030 (Docker)
```

---

## 快速参考

| 任务 | 一句话描述 | 涉及文件数 | 难度 |
|------|-----------|-----------|------|
| T001 | JWT_SECRET 生产环境强制校验 | 1 | 低 |
| T002 | 创建 .env.example | 1-2 | 低 |
| T003 | 管理员自我保护 | 2 | 低 |
| T004 | SMTP 密码脱敏 | 2 | 中 |
| T005 | 全局 Middleware 鉴权 | 1 | 中 |
| T006 | 验证码过期清理 | 1 | 低 |
| T007 | zod 请求体校验基础设施 | 3-4 | 中 |
| T008 | 剩余 API 接入校验 | 4-5 | 低 |
| T009 | API 速率限制 | 4-5 | 中 |
| T010 | 404 和错误页面 | 2 | 低 |
| T011 | Error Boundary | 2 | 低 |
| T012 | Toast 通知系统 | 3 | 中 |
| T013 | 用户个人资料 API | 1 | 中 |
| T014 | 用户个人资料 UI | 4 | 中 |
| T015 | 密码重置 API | 3-4 | 中 |
| T016 | 密码重置 UI | 1 | 中 |
| T017 | 全局搜索 | 3 | 中 |
| T018 | 账号注销 | 2 | 低 |
| T019 | 公共工具函数 | 3 | 低 |
| T020 | 公共 Modal 组件 | 4 | 中 |
| T021 | 公共 Toolbar 组件 | 3 | 中 |
| T022 | HtmlEditor 提取函数 | 2 | 低 |
| T023 | HtmlEditor 提取模态框 | 4 | 中 |
| T024 | HtmlEditor 提取 hooks | 3 | 中 |
| T025 | HtmlEditor 提取组件 | 4 | 中 |
| T026 | 公共 hooks | 3+ | 低 |
| T027 | 工具懒加载 | 3-4 | 低 |
| T028 | highlight.js 优化 | 1 | 低 |
| T029 | 更新 README | 1 | 低 |
| T030 | Docker 配置 | 3 | 中 |
| T031 | CI 配置 | 1 | 低 |
| T032 | 键盘快捷键 | 3 | 低 |
| T033 | 数据库备份脚本 | 2 | 低 |
| T034 | Prisma 迁移 | 1 | 低 |
| T035 | CSRF 防护 | 2-3 | 中 |
| T036 | API 文档 | 1 | 低 |
