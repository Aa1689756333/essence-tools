# ToolBox 优化改进计划

> 编制日期：2026-08-22
> 基于对项目全部源码的完整审查，结合 `PROJECT_ANALYSIS.md` 的分析结论
> 优先级定义：**P0** 阻塞性问题（安全/数据丢失）| **P1** 高优先级（功能缺失/架构缺陷）| **P2** 中优先级（代码质量/可维护性）| **P3** 低优先级（锦上添花）

---

## 一、安全类问题

### P0-1. JWT_SECRET 硬编码兜底值

**文件**：`src/lib/auth.js` L5-7

```js
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'toolbox-secret-key-2026-secure-jwt-auth-token-super-secret'
);
```

**风险**：生产环境若未设置环境变量，攻击者可用公开的硬编码密钥伪造任意 JWT，获取 ADMIN 权限。

**改进方案**：
1. 启动时若 `NODE_ENV === 'production'` 且未配置 `JWT_SECRET`，直接抛出错误终止启动
2. 创建 `.env.example` 文件，列出所有必需的环境变量
3. 考虑使用 `crypto.randomUUID()` 生成随机密钥并提示用户保存

---

### P0-2. SMTP 密码明文存储且 API 原样返回前端

**文件**：`src/app/api/admin/settings/route.js` GET handler

**风险**：
- `SystemSetting` 表中 `smtp_config` 以 JSON 明文存储 SMTP 密码
- GET 接口将完整 `smtp_config`（含 `pass`）返回前端表单，虽有 ADMIN 校验，但任何 ADMIN 会话泄露即暴露密码
- 数据库备份文件泄露也会暴露密码

**改进方案**：
1. SMTP 密码使用 AES-256-GCM 对称加密存储，密钥从环境变量读取
2. GET 接口返回时对 `pass` 字段脱敏（如 `****xxxx`），仅在前端用户主动修改时才更新
3. 前端密码输入框使用 `placeholder="已配置"` 而非回显真实值

---

### P0-3. 管理员无自我保护机制

**文件**：`src/app/api/admin/users/route.js` PATCH handler

**风险**：
- 管理员可以将自己降级为 USER，导致系统无管理员
- 管理员可以封禁自己的账号
- 可以将最后一个 ADMIN 降级，导致管理后台永久不可访问

**改进方案**：
1. 在 `update_role` 操作中，若目标用户是当前操作者本人且操作是降级，拒绝执行
2. 在 `update_role` 操作中，若目标用户是系统最后一个 ADMIN 且操作是降级，拒绝执行
3. 在 `update_status` 操作中，禁止封禁当前操作者自身
4. 前端同步增加提示，但安全边界必须在后端

---

### P1-1. 无全局 Middleware 鉴权

**现状**：项目不存在 `src/middleware.js`，所有受保护接口需在 route handler 内部手动调用 `getSessionUser()` 并检查角色。

**风险**：新增 API 时容易遗漏鉴权检查，造成越权访问。

**改进方案**：
1. 创建 `src/middleware.js`，使用 Next.js Middleware 统一拦截 `/api/admin/*` 路径
2. 在 middleware 中校验 JWT 并检查 `role === 'ADMIN'`，不满足直接返回 403
3. 对 `/api/user/*` 路径校验登录态
4. 保留 route handler 内的细粒度校验作为第二道防线

---

### P1-2. 无 API 速率限制

**现状**：所有 API 均无限流，存在暴力破解密码、枚举邮箱、刷验证码等风险。

**改进方案**：
1. 引入 `upstash/ratelimit` 或自实现基于内存/IP 的限流（可存于 Map + TTL）
2. 登录接口：每 IP 每分钟最多 5 次
3. 注册接口：每 IP 每小时最多 10 次
4. 验证码发送：每邮箱每 60 秒 1 次（已有），每 IP 每小时最多 5 次
5. 签到接口：每用户每天 1 次（业务层已有），但接口层也应限流防滥用

---

### P1-3. 无请求体校验

**现状**：所有 POST/PATCH 接口直接 `await req.json()` 后使用，无 schema 校验。

**风险**：恶意请求可传入超长字符串、非法类型、额外字段，可能导致异常或注入。

**改进方案**：
1. 引入 `zod` 库进行请求体 schema 校验
2. 为每个 API 定义输入 schema，校验失败返回 400
3. 限制字符串最大长度（如 email ≤ 255, nickname ≤ 50, password ≤ 128）
4. 过滤未定义字段（strip unknown keys）

---

### P1-4. 无 CSRF 防护

**现状**：Cookie 使用 `sameSite: 'lax'`，对于 GET 请求有一定保护，但 POST 请求在某些场景下仍可能被 CSRF 攻击。

**改进方案**：
1. `sameSite: 'lax'` 已提供基本防护，可评估是否需要升级为 `strict`
2. 对敏感操作（修改密码、积分调整、角色变更）增加 CSRF token 验证
3. 检查 `Origin` / `Referer` header 作为辅助校验

---

### P1-5. EmailVerification 表无过期清理机制

**文件**：`src/lib/verification.js`

**问题**：验证码过期后仅在下次被查询时才删除，若从未被查询则永远留在数据库中。

**改进方案**：
1. 在 `issueCode` 中清理该邮箱过期记录时，顺便清理所有邮箱的过期记录（`expiresAt < now`）
2. 或在签到/仪表盘等定时查询中附带清理过期验证码
3. 考虑添加定时任务（cron）或在应用启动时清理

---

## 二、功能缺失类

### P1-6. 无用户个人资料页面

**现状**：用户登录后无法修改昵称、密码、头像。

**改进方案**：
1. 新增 `/api/user/profile` PATCH 接口
2. 支持修改昵称（需查重）、修改密码（需验证旧密码）
3. 头像上传（可先用首字母渐变方案，后续支持图片上传）
4. 在 Topbar 用户菜单中增加「个人设置」入口

---

### P1-7. 无密码重置功能

**现状**：用户忘记密码后无法找回，只能重新注册。

**改进方案**：
1. 利用已有的 SMTP 基础设施，实现「忘记密码」流程
2. 发送重置链接（含一次性 token，15 分钟有效）
3. 在 AuthModal 登录表单中增加「忘记密码？」链接
4. 新增 `/api/auth/forgot-password` 和 `/api/auth/reset-password` 接口

---

### P1-8. 无账号注销（删除）功能

**现状**：用户无法删除自己的账号。

**风险**：不符合 GDPR/个人信息保护法等合规要求。

**改进方案**：
1. 在用户个人设置中增加「注销账号」按钮
2. 需二次确认（输入密码或邮箱验证码）
3. 级联删除用户数据（PointTransaction 已配置 cascade）
4. 软删除 vs 硬删除策略选择（建议先软删除，30 天后硬删除）

---

### P1-9. 搜索功能未实现

**文件**：`src/shell/Topbar.jsx` — 搜索按钮仅渲染 UI，无实际功能。

**改进方案**：
1. 实现全局搜索弹层（`Cmd+K` / `Ctrl+K` 唤起）
2. 搜索工具名称/描述/标签，快速跳转
3. 可后续扩展搜索用户（管理员）、搜索设置项

---

### P2-1. 无 404 / 错误页面

**现状**：访问不存在的路由时，显示 Next.js 默认 404 页面，与应用风格不统一。

**改进方案**：
1. 创建 `src/app/not-found.jsx`，与应用主题风格一致
2. 创建 `src/app/error.jsx`，统一错误处理页面
3. 提供「返回首页」按钮

---

### P2-2. 无键盘快捷键支持

**现状**：工具内有一些快捷键（如 `Ctrl+F` 查找），但全局无快捷键体系。

**改进方案**：
1. `Ctrl+K` / `Cmd+K`：打开搜索
2. `Ctrl+Shift+D`：切换暗色模式
3. `Escape`：关闭弹窗（部分已实现）
4. 在设置页或帮助面板中展示快捷键列表

---

## 三、代码质量与架构类

### P2-3. HtmlEditor.jsx 过于庞大（~2000 行）

**文件**：`src/tools/html-editor/HtmlEditor.jsx`

**问题**：单个文件包含工具栏、编辑区、模态框、图片处理、查找替换、源码视图等全部逻辑，维护困难。

**改进方案**：
1. 拆分为独立模块：
   - `components/Toolbar.jsx` — 工具栏
   - `components/EditorArea.jsx` — 编辑区（contentEditable）
   - `components/SourceView.jsx` — 源码视图
   - `components/LinkModal.jsx` / `ImageModal.jsx` / `TableModal.jsx` — 模态框
   - `components/FindReplace.jsx` — 查找替换
   - `hooks/useEditorState.js` — 编辑器状态管理
   - `hooks/useImageResize.js` — 图片缩放
   - `lib/htmlSanitizer.js` — HTML 清理逻辑
   - `lib/htmlFormatter.js` — HTML 格式化/美化
2. 每个文件控制在 200-400 行以内

---

### P2-4. 公共组件未抽取，存在重复实现

**现状**：
- `ToolbarBtn` / `ToolbarDivider` / `ToolbarSelect` 在 HtmlEditor 和 MarkdownEditor 中各自实现
- `Modal` 组件在 HtmlEditor、AuthModal、CheckInModal 中重复
- `countWords` 函数在 HtmlEditor 和 MarkdownEditor 中各有一份
- `useSyncScroll` 仅在 NovelFormatter 中使用，但类似需求可能出现在其他工具

**改进方案**：
1. 创建 `src/components/ui/` 目录，抽取公共 UI 组件：
   - `Modal.jsx` — 通用模态框（含遮罩层、关闭按钮、ESC 关闭、焦点管理）
   - `Toolbar.jsx` — 工具栏基础组件（ToolbarBtn / ToolbarDivider / ToolbarSelect / ToolbarGroup）
   - `Toast.jsx` — 全局提示组件（替代各处的 msg/error 状态）
2. 创建 `src/lib/utils.js`，抽取公共工具函数：
   - `countWords(text)` — 统一词数统计
   - `debounce(fn, delay)` — 防抖
   - `throttle(fn, delay)` — 节流
   - `formatDate(date, format)` — 日期格式化
3. 创建 `src/hooks/` 目录，抽取公共 hooks：
   - `useLocalStorage.js` — localStorage 读写
   - `useDebounce.js` — 防抖 hook
   - `useClickOutside.js` — 点击外部关闭
   - `useKeyboardShortcut.js` — 键盘快捷键

---

### P2-5. 无 TypeScript

**现状**：全项目使用 JavaScript，大型组件（HtmlEditor ~2000 行）缺乏类型约束。

**改进方案**：
1. 渐进式迁移：新文件使用 `.tsx`/`.ts`，旧文件逐步迁移
2. 优先为 `src/lib/`、`src/tools/*/lib/` 等核心逻辑添加类型
3. 定义公共类型文件 `src/types/`（User, Settings, Tool 等）
4. 配置 `tsconfig.json`，开启 `strict` 模式

---

### P2-6. 测试体系不完善

**现状**：
- 测试为独立脚本（`test-*.mjs`、`acceptance-test.mjs`），非标准测试框架
- 无组件测试、无 E2E 测试、无覆盖率报告
- 测试命令聚合在 `npm test` 中，但无法单独运行某类测试

**改进方案**：
1. 引入 `Vitest` 作为单元测试框架（与 Next.js 兼容性好）
2. 迁移现有测试脚本到 Vitest 格式
3. 引入 `@testing-library/react` 进行组件测试
4. 引入 `Playwright` 进行 E2E 测试（登录/注册/签到/工具使用流程）
5. 配置 CI 在每次提交时自动运行测试

---

### P2-7. 无 Error Boundary

**现状**：React 组件树无错误边界，任何子组件崩溃会导致整个应用白屏。

**改进方案**：
1. 创建 `src/components/ErrorBoundary.jsx`
2. 在根布局中包裹 `<main>` 内容
3. 为每个工具页面单独添加 ErrorBoundary，避免一个工具崩溃影响其他页面
4. 提供「重新加载」按钮和错误信息展示

---

### P2-8. 数据库相关改进

**问题**：
1. SQLite 不适合生产环境多用户并发场景
2. 无数据库备份机制
3. Prisma 迁移未使用（直接操作 dev.db）
4. 无连接池配置

**改进方案**：
1. 短期：配置 Prisma 迁移（`prisma migrate dev`），生成迁移文件
2. 短期：添加数据库备份脚本（复制 dev.db 文件 + 时间戳）
3. 中期：评估迁移到 PostgreSQL（支持并发、连接池、更好的事务隔离）
4. 中期：若继续使用 SQLite，配置 `wal` 模式提升并发读写性能
5. 长期：引入数据库连接池（如 Prisma Accelerate 或自实现）

---

## 四、性能优化类

### P2-9. 工具组件未做懒加载

**现状**：所有工具组件在 `registry.js` 中被直接 import，首页加载时会打包所有工具代码。

**改进方案**：
1. 使用 `next/dynamic` 动态导入工具组件
2. 在各工具的 `page.jsx` 中使用 `dynamic(() => import('@/tools/...'))`
3. 配合 `loading` 选项展示加载骨架屏
4. 预期可减少首页 JS 包体积 50%+

---

### P2-10. highlight.js 全量注册 7 种语言

**文件**：`src/tools/markdown-editor/MarkdownEditor.jsx`

**现状**：注册了 JavaScript、CSS、XML、Markdown、Python、Bash、JSON 七种语言高亮。

**改进方案**：
1. 评估是否所有语言都常用，可精简为 3-4 种
2. 或使用 `highlight.js/lib/core` 按需加载，配合动态 `import()` 在首次遇到代码块时加载对应语言
3. 考虑替换为更轻量的 `shiki` 或 `prism.js`

---

### P2-11. 设置缓存为进程级内存

**文件**：`src/lib/settings.js`

**问题**：`settingsCache` 存储在 Node.js 进程内存中，多实例部署时各实例缓存不同步。

**改进方案**：
1. 短期：若单实例部署，当前方案可接受
2. 中期：引入 Redis 缓存或使用 Prisma 的 `datasource` 级缓存
3. 在 `updateSystemSettings` 时，通过广播机制（如 Redis Pub/Sub）通知所有实例清除缓存

---

### P2-12. 图片未优化

**现状**：
- 用户头像使用首字母渐变 div，无真实图片
- 工具中插入的图片未做压缩/优化
- 无 CDN 配置

**改进方案**：
1. 使用 `next/image` 替代原生 `<img>`，自动优化/懒加载
2. 配置图片域名白名单
3. 考虑接入 CDN（Cloudflare/阿里云 OSS）存储用户上传的图片
4. 图片上传时进行压缩（客户端 canvas 压缩）

---

## 五、DevOps 与部署类

### P2-13. 无环境变量文档

**现状**：`.gitignore` 包含 `.env*`，但无 `.env.example` 文件说明需要哪些环境变量。

**改进方案**：
创建 `.env.example`：
```env
# JWT 签名密钥（生产环境必须设置，可使用 openssl rand -base64 32 生成）
JWT_SECRET=

# 数据库连接（默认使用 SQLite，可切换 PostgreSQL）
DATABASE_URL=file:./dev.db

# 应用端口
PORT=3000

# Node 环境
NODE_ENV=development
```

---

### P2-14. 无 Docker 配置

**改进方案**：
1. 创建 `Dockerfile`（多阶段构建：deps → build → production）
2. 创建 `docker-compose.yml`（应用 + 可选 PostgreSQL）
3. 创建 `.dockerignore`
4. 提供 Docker 部署文档

---

### P2-15. 无 CI/CD 配置

**改进方案**：
1. 创建 `.github/workflows/ci.yml`（GitHub Actions）
2. 流程：lint → test → build → deploy
3. 配置分支保护规则，PR 必须通过 CI 才能合并
4. 可选：自动部署到 Vercel/Railway

---

### P2-16. README 文档滞后

**文件**：`README.md`

**问题**：README 仅描述了三个工具和前端架构，未涵盖：
- 用户认证系统（注册/登录/JWT 会话）
- 积分签到系统（连续签到奖励、整月全勤）
- 后台管理系统（仪表盘/用户管理/系统设置/SMTP 配置）
- 邮箱验证码功能
- 环境变量配置说明
- 部署指南

**改进方案**：
1. 更新 README，补充所有功能模块说明
2. 添加系统架构图（认证流程、数据流）
3. 补充环境变量配置说明
4. 添加部署指南（Vercel/Docker/手动部署）
5. 添加 API 文档（所有接口的请求/响应格式）

---

## 六、用户体验类

### P2-17. 无加载状态骨架屏

**现状**：页面切换时直接显示空白或 loading 文字。

**改进方案**：
1. 为每个页面创建 Skeleton 骨架屏组件
2. 使用 `next/dynamic` 的 `loading` 选项自动展示
3. 骨架屏应模拟真实布局，减少视觉跳动

---

### P2-18. 无 Toast 通知系统

**现状**：各组件自行实现消息提示（如 `msg` state + 手动渲染），样式不统一。

**改进方案**：
1. 创建全局 Toast 组件（`src/components/ui/Toast.jsx`）
2. 通过 Context 提供 `toast.success()` / `toast.error()` / `toast.info()` 方法
3. 支持自动消失、手动关闭、堆叠展示
4. 统一全应用的提示样式和动画

---

### P2-19. 无国际化（i18n）支持

**现状**：所有文本硬编码为中文。

**改进方案**：
1. 引入 `next-intl` 或 `react-i18next`
2. 抽取所有用户可见文本到语言包
3. 至少支持中文/英文双语
4. 语言切换持久化到 localStorage

---

## 七、优先级排序与实施建议

### 第一阶段（1-2 周）— 安全加固 + 基础文档

| 序号 | 任务 | 优先级 | 预估工时 |
|------|------|--------|----------|
| 1 | P0-1: JWT_SECRET 启动校验 | P0 | 0.5h |
| 2 | P0-2: SMTP 密码加密存储 + 脱敏返回 | P0 | 3h |
| 3 | P0-3: 管理员自我保护 | P0 | 2h |
| 4 | P2-13: 创建 .env.example | P2 | 0.5h |
| 5 | P2-16: 更新 README | P2 | 3h |

### 第二阶段（2-3 周）— 功能补全 + 架构改进

| 序号 | 任务 | 优先级 | 预估工时 |
|------|------|--------|----------|
| 6 | P1-1: 全局 Middleware 鉴权 | P1 | 2h |
| 7 | P1-2: API 速率限制 | P1 | 3h |
| 8 | P1-3: 请求体校验（zod） | P1 | 4h |
| 9 | P1-6: 用户个人资料页面 | P1 | 4h |
| 10 | P1-7: 密码重置功能 | P1 | 4h |
| 11 | P2-7: Error Boundary | P2 | 1h |

### 第三阶段（3-4 周）— 代码重构 + 性能优化

| 序号 | 任务 | 优先级 | 预估工时 |
|------|------|--------|----------|
| 12 | P2-3: HtmlEditor 拆分 | P2 | 6h |
| 13 | P2-4: 公共组件抽取 | P2 | 4h |
| 14 | P2-9: 工具懒加载 | P2 | 2h |
| 15 | P2-6: 测试体系搭建 | P2 | 6h |
| 16 | P2-18: Toast 通知系统 | P2 | 2h |

### 第四阶段（持续迭代）— 长期改进

| 序号 | 任务 | 优先级 |
|------|------|--------|
| 17 | P2-5: TypeScript 渐进迁移 | P2 |
| 18 | P2-8: 数据库迁移到 PostgreSQL | P2 |
| 19 | P2-14/15: Docker + CI/CD | P2 |
| 20 | P1-9: 全局搜索功能 | P1 |
| 21 | P2-19: 国际化支持 | P2 |
| 22 | P1-8: 账号注销功能 | P1 |

---

## 八、技术选型建议

| 需求 | 推荐方案 | 备选方案 |
|------|----------|----------|
| 请求校验 | `zod` | `joi`、`yup` |
| 速率限制 | `upstash/ratelimit` | 自实现（Map + TTL） |
| 测试框架 | `Vitest` | `Jest` |
| E2E 测试 | `Playwright` | `Cypress` |
| 状态管理 | React Context + useReducer | `zustand`（若状态复杂化） |
| 表单管理 | `react-hook-form` + `zod` | 原生受控组件 |
| 密码加密存储 | `crypto` AES-256-GCM | `node:crypto` 内置模块 |
| 缓存 | Redis（`ioredis`） | 进程内存（当前方案） |
| 部署 | Vercel / Railway | Docker + VPS |
| 数据库 | PostgreSQL | SQLite（小规模） |

---

## 九、总结

本项目从纯前端工具箱演进为全栈应用，架构清晰、功能完整，但在**安全加固、功能补全、代码质量、DevOps** 四个维度仍有明显改进空间。

**最紧迫的三件事**：
1. **修复 JWT_SECRET 硬编码**（P0-1）— 一行代码即可大幅提升生产安全性
2. **SMTP 密码脱敏**（P0-2）— 防止敏感信息泄露
3. **管理员自我保护**（P0-3）— 防止系统锁死

**最有价值的长期投入**：
1. **HtmlEditor 拆分**（P2-3）— 2000 行单文件是最大技术债
2. **测试体系搭建**（P2-6）— 为后续迭代提供安全网
3. **TypeScript 迁移**（P2-5）— 提升大型项目可维护性

建议按阶段推进，每个阶段完成后进行回顾，根据实际情况调整后续优先级。
