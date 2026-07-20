# 用户系统与管理后台架构及开发文档 (Development Plan)

本文档针对 **ToolBox 在线工具箱** 项目，设计并规划了一套包含 **邮箱注册/登录、全功能管理后台（仪表盘/用户管理/系统设置）、SEO 动态配置、SMTP 邮箱控制（含黑白名单）、注册开关控制、以及稀缺型积分签到机制** 的完整技术方案。

---

## 💡 整体架构设计 (Architecture Overview)

```
+-----------------------------------------------------------------------+
|                          Front-end Shell                              |
|  [ Topbar: 用户头像/签到/积分/管理后台入口 ]   [ Sidebar: 仪表盘 & 管理路由 ] |
+-----------------------------------------------------------------------+
|                       Next.js App Router Pages                        |
|   / (Tools)  |  /login  |  /register  |  /profile  |  /admin/*         |
+-----------------------------------------------------------------------+
|                       App Router API Routes                           |
|  /api/auth/*  |  /api/user/*  |  /api/checkin  |  /api/admin/*        |
+-----------------------------------------------------------------------+
|                   Services & Security Layer                           |
|  Auth (JWT/Cookie) | Password (bcrypt) | Email (Nodemailer) | SEO Sync  |
+-----------------------------------------------------------------------+
|                      Data Storage Layer                               |
|            SQLite / Prisma ORM (Users, Settings, Logs, Points)        |
+-----------------------------------------------------------------------+
```

---

## 🛠️ 技术选型 (Tech Stack Choice)

1. **数据库层**：`SQLite` + `Prisma ORM` (或 `better-sqlite3`)
   - **理由**：轻量级、零配置依赖、单文件存储，完美贴合工具箱项目“本地极速运行、开箱即用”的核心设计原则；后期部署服务器时也可无缝切换 PostgreSQL。
2. **安全与认证**：`JOSE` (JWT) + `httpOnly Cookie` + `bcryptjs`
   - 使用无状态但安全的高效 Session 方案，客户端无需保存明文 Token，防止 XSS 截获。
3. **邮件发送引擎**：`Nodemailer`
   - 用于处理用户注册验证码/激活链接、密码重置及管理员测试邮件发送。
4. **前端状态与 UI**：扩展现有的 `ThemeProvider` 与新建 `AuthProvider`，UI 风格沿用 CSS 变量及微交互设计。

---

## 🗄️ 数据库模型设计 (Database Schemas)

### 1. 用户表 (`User`)
- `id`: String (UUID / CUID, 主键)
- `email`: String (唯一, 索引)
- `passwordHash`: String (加密散列)
- `nickname`: String (昵称)
- `avatar`: String? (头像 URL)
- `role`: Enum (`USER` | `ADMIN`)
- `status`: Enum (`ACTIVE` | `BANNED` | `UNVERIFIED`)
- `points`: Int (当前可用积分，默认 0)
- `continuousCheckIn`: Int (当前连续签到天数，默认 0)
- `lastCheckInDate`: String? (上一次签到日期，格式 `YYYY-MM-DD`)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### 2. 积分交易日志表 (`PointTransaction`)
- `id`: String (主键)
- `userId`: String (关联 User)
- `amount`: Int (变动数值，如 `+3`, `+5`)
- `balance`: Int (变动后结余)
- `type`: Enum (`CHECKIN` | `CHECKIN_BONUS` | `ADMIN_ADJUST` | `CONSUME`)
- `description`: String (变动说明，如 "每日连续签到奖励")
- `createdAt`: DateTime

### 3. 系统配置表 (`SystemSetting`)
采用 Key-Value 形式存储全局系统配置，支持后台动态实时读取与更新：
- `site_title`: 站点 Title (默认: "ToolBox · 在线工具箱")
- `site_description`: 站点描述
- `site_keywords`: 站点 SEO 关键词
- `allow_registration`: 是否开放注册 (`true` | `false`)
- `email_mode`: 邮箱校验模式 (`none` | `whitelist` | `blacklist`)
- `email_whitelist`: 白名单规则 (JSON 数组，如 `["@gmail.com", "@qq.com"]`)
- `email_blacklist`: 黑名单规则 (JSON 数组，如 `["*@tempmail.com"]`)
- `smtp_config`: SMTP 部署信息 (JSON: `{ host, port, secure, user, pass, fromName, fromEmail }`)
- `checkin_config`: 签到积分规则配置 (JSON 格式，详见下文预设机制)

---

## 💎 稀缺型积分与签到规则预设机制 (Check-in & Points Design)

根据要求，**积分在本项目中定位为稀缺资源**，避免数值过度膨胀与过度发放。预设控制机制如下：

### 1. 积分发放机制 (Reward Schedule)
* **基础每日签到**：`+3` 积分
* **连续签到奖励 (阶梯式)**：
  - 连续签到 `3 ~ 6` 天：每日额外 `+2` 积分（即单日获得 `5` 积分）
  - 连续签到 `7` 天及以上：每日额外 `+4` 积分（单日封顶上限为 `7` 积分）
* **月度全勤奖励**：当月满勤额外赠送一次性 `+20` 积分（稀缺限制：单月额外上限 20 分）
* **断签重置规则**：若间隔超过 1 天未签到，连续签到天数重置为 `1`。

### 2. 积分稀缺性保护机制
- **单日上限保护**：任何用户单日通过签到及连签机制获得的总积分严格封顶为 **7 积分**。
- **每日防重复签到**：使用数据库事务 (`Transaction`) 与 `YYYY-MM-DD` 唯一约束防止并发重放请求。
- **管理员调账防爆**：后台对用户积分进行手动加减时，日志明细强制留痕，支持单测调账上限告警。

---

## 🖥️ 管理后台模块设计 (`/admin`)

后台提供独立简洁的控制面板，自动进行 `ADMIN` 身份校验，非管理员请求自动重定向至首页。

### 1. 仪表盘 (Dashboard - `/admin`)
- **核心指标卡片**：用户总数、今日新增用户、今日签到人数、系统累计发放积分总量。
- **趋势图表 / 简报**：近 7 天用户注册与签到趋势图。
- **系统状态**：SMTP 发信服务状态、数据库连接状态、注册通道开启状态。

### 2. 用户管理 (User Management - `/admin/users`)
- **用户列表**：支持按邮箱/昵称搜索，按状态（正常/禁用/未激活）、角色（管理员/普通用户）筛选，支持分页。
- **用户操作**：
  - 切换用户角色（设为管理员 / 降级为普通用户）
  - 账户冻结与解封（禁用后无法登录及调用接口）
  - 手动管理积分（增加/扣减积分，需填写变动备注）

### 3. 系统设置 (System Settings - `/admin/settings`)
拆分为 4 个清晰的配置页签：
- **SEO 设置**：
  - 站点标题 Title、Meta Description、Meta Keywords 配置
  - 保存后全局 Layout 动态同步展示
- **注册与邮箱限制**：
  - 开放/关闭注册开关 (`allowRegistration`)
  - 邮箱域名限制模式（关闭 / 白名单模式 / 黑名单模式）
  - 白名单/黑名单列表管理（支持通配符如 `*@dispostable.com`）
- **SMTP 邮箱配置**：
  - 发信服务器 Host、Port、是否开启 SSL/TLS
  - 账号 User、授权码/密码 Pass、发件人名称与邮箱
  - **内置“测试发送”按钮**：输入接收邮箱即可一键验证 SMTP 是否联通
- **签到机制配置**：
  - 可动态修改基础签到积分、连签奖励阶梯、单日封顶上限及规则说明。

---

## 🎨 前端 UI 与用户体验设计 (UX / UI Design)

1. **Topbar 增强**：
   - 增加用户未登录时的【登录 / 注册】快捷按钮
   - 登录后显示【📅 签到】按钮（未签到闪烁/高亮提示，已签到置灰）、积分余额 badge、用户头像下拉菜单（含【个人中心】、【管理后台】（若为管理员）、【退出登录】）
2. **签到 Modal / Drawer 弹窗**：
   - 包含月度打卡日历组件、连续签到天数计数器、预估明日签到可得积分。
   - 点击“立即签到”触发礼花微动画（CSS Particle 效果），直观反馈获取积分数。
3. **后台设计**：
   - 风格继承现有暗黑模式/浅色模式与全局主题色（mint/rose/amber/sky/violet）。

---

## 📋 模块划分与代码文件规划 (Proposed File Structure)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.jsx             # 登录页面
│   │   └── register/page.jsx          # 注册页面
│   ├── admin/
│   │   ├── layout.jsx                 # 管理后台布局 (含 ADMIN 权限拦截)
│   │   ├── page.jsx                   # 仪表盘 Dashboard
│   │   ├── users/page.jsx             # 用户管理
│   │   └── settings/page.jsx          # 系统设置 (SEO / SMTP / 邮箱限制 / 签到规则)
│   └── api/
│       ├── auth/
│       │   ├── register/route.js      # 注册接口 (含黑白名单/SMTP验证)
│       │   ├── login/route.js         # 登录接口
│       │   ├── logout/route.js        # 登出接口
│       │   └── me/route.js            # 当前用户信息接口
│       ├── user/
│       │   └── checkin/route.js       # 签到接口 & 签到历史
│       └── admin/
│           ├── dashboard/route.js     # 仪表盘统计接口
│           ├── users/route.js         # 用户列表与状态更新
│           └── settings/route.js      # 系统设置读取与保存 / 测试 SMTP
├── lib/
│   ├── db.js                          # Prisma/SQLite 数据库单例
│   ├── auth.js                        # JWT 签发、校验与 Cookie 操作
│   ├── mailer.js                      # Nodemailer SMTP 发信工具类
│   └── settings.js                    # 系统设置获取与缓存工具类
├── components/
│   ├── auth/
│   │   ├── AuthModal.jsx              # 登录注册弹窗
│   │   └── CheckInModal.jsx           # 签到日历弹窗
│   └── admin/                         # 后台专用组件 (图表、表格、设置表单)
└── context/
    └── AuthContext.jsx                # 前端用户登录状态 Context
```

---

## 🔒 安全性考量 (Security Controls)

1. **密码安全**：使用 `bcryptjs` 配合 Salt 进行哈希存储，绝不保存明文密码。
2. **Session 安全**：JWT Token 放置在 `httpOnly; SameSite=Lax; Secure` 的 Cookie 中，彻底杜绝 JavaScript 读取与 XSS 攻击。
3. **接口越权防御 (RBAC)**：所有 `/api/admin/*` 路由强制校验 `JWT.role === 'ADMIN'`，防止平行与垂直越权。
4. **防刷机制与限流**：签到接口使用数据库锁机制，防止高并发连击造成重复加分；注册接口实施 IP 及邮箱频控。
