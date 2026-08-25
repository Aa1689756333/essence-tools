# 用户中心设计文档

> 版本：v1.0
> 日期：2026-08-24
> 状态：设计稿（未实施）
> 适用项目：ToolBox（novel-formatter 仓库）

---

## 1. 设计目标

### 1.1 背景

当前前台的用户功能全部以**全局浮层 Modal** 形式散落在 Topbar 中，缺少统一的承载页面：

| 功能 | 当前入口 | 承载形态 |
| --- | --- | --- |
| 登录 / 注册 / 忘记密码 | Topbar「登录」「注册」按钮 | `AuthModal` 浮层 |
| 修改昵称 / 修改密码 / 注销账号 | Topbar 用户菜单 →「个人设置」 | `ProfileModal` 浮层（3 Tab） |
| 签到打卡 / 签到日历 / 积分流水 | Topbar 火焰图标按钮 | `CheckInModal` 浮层 |
| 管理后台 | Topbar 用户菜单 / Sidebar | `/admin` 独立页面 |

存在的问题：

1. **无法直链与分享**：用户无法通过 URL 直达「修改密码」等具体功能，也无法刷新保持状态。
2. **浮层空间受限**：`ProfileModal` 宽度仅 `max-w-md`，3 个 Tab 已显拥挤，无法承载后续扩展。
3. **信息割裂**：积分余额在 Topbar、积分流水在签到弹窗、账号资料在设置弹窗，用户需在三处切换。
4. **移动端体验差**：浮层在小屏幕上占满视口，长表单滚动体验不佳。
5. **扩展无处落地**：头像上传、偏好设置、安全日志等规划中的能力没有明确归属位置。

### 1.2 目标

- 建立 `/user` 独立路由作为**前台用户功能的唯一聚合入口**，收拢除签到打卡外的全部用户功能。
- 复用 `/admin` 已验证的「Layout 守卫 + 页签导航 + 子路由」布局范式，保持产品视觉与交互一致。
- 为规划中的扩展能力（头像、偏好、安全日志、通知）预留清晰的模块位与数据契约，但不强制在首期实现。

### 1.3 非目标（明确不做）

- **不改动签到打卡入口**：Topbar 火焰按钮与 `CheckInModal` 完整保留，打卡动作仍在弹窗内完成。
- **不改造 `AuthModal`**：登录 / 注册 / 忘记密码继续走浮层，属于「未登录态」流程，不属于用户中心范畴。
- **不改动 `/admin`**：管理后台是独立的管理员域，与用户中心并列，互不影响。
- **不引入新的状态管理库**：继续使用现有 `AuthContext` + `ToastContext`。

---

## 2. 技术现状

| 维度 | 现状 |
| --- | --- |
| 框架 | Next.js 15.3（App Router）+ React 19 |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`），CSS 变量驱动主题 |
| 图标 | `lucide-react` |
| 数据层 | Prisma 5.22 + SQLite |
| 认证 | `jose` 签发 JWT，写入 HttpOnly Cookie（7 天有效） |
| 路由守卫 | `src/middleware.js` 拦截 `/api/admin/*`（需 ADMIN）与 `/api/user/*`（需登录） |
| 全局状态 | `AuthContext`（user / loading / login / logout / openAuth / openCheckIn / openProfileModal / updateUser / refreshUser） |
| 反馈组件 | `ToastContext` + `Toast`、`Modal`、`SkeletonLoader`、`ErrorBoundary` |

### 现有 User 模型字段

```
id / email / passwordHash / nickname / avatar / role / status
points / continuousCheckIn / lastCheckInDate / createdAt / updatedAt
```

关联模型：`PointTransaction`（积分流水）、`CheckInLog`（签到日志）、`EmailVerification`（邮箱验证码）。

> 注：`avatar` 字段已存在但从未被写入，前端一律以昵称首字母渐变块代替。

---

## 3. 整体架构

### 3.1 路由结构

```
/user                    → 概览（Overview）
/user/profile            → 个人资料
/user/points             → 积分与签到记录（只读）
/user/security           → 账号安全
/user/preferences        → 偏好设置        [预留]
/user/notifications      → 消息通知        [预留]
```

### 3.2 目录规划

```
src/app/user/
  layout.jsx                  # 登录守卫 + 页签导航 + Banner
  page.jsx                    # 概览
  profile/page.jsx            # 个人资料
  points/page.jsx             # 积分与签到记录
  security/page.jsx           # 账号安全
  preferences/page.jsx        # [预留] 偏好设置
  notifications/page.jsx      # [预留] 消息通知

src/components/user/
  UserBanner.jsx              # 头像 + 昵称 + 邮箱 + 角色 + 积分 + 连签
  StatCard.jsx                # 概览统计卡
  NicknameForm.jsx            # 昵称表单
  PasswordForm.jsx            # 密码表单
  DangerZone.jsx              # 注销账号危险区
  PointsTimeline.jsx          # 积分流水时间轴（分页）
  CheckInCalendar.jsx         # 月历（只读，从 CheckInModal 抽取）
  AvatarUploader.jsx          # [预留] 头像上传

src/app/api/user/
  checkin/route.js            # 已存在，不改动
  profile/route.js            # 已存在，扩展 update_avatar action
  points/route.js             # 新增：积分流水分页查询
  security-logs/route.js      # [预留] 安全日志
  preferences/route.js        # [预留] 偏好设置
```

### 3.3 页面骨架布局

沿用 `/admin` 的结构范式：`AdminLayout` 的守卫 + Banner + 页签三段式，用户中心对应为 `UserLayout`。

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar  │ Topbar（保留签到按钮 / 主题 / 用户菜单）            │
│          ├──────────────────────────────────────────────────┤
│  工具    │  ┌── UserBanner ──────────────────────────────┐  │
│  总览    │  │ [头像]  昵称                                │  │
│          │  │        邮箱 · 注册于 2026-01-01             │  │
│  个人    │  │        [积分 1280]  [连续签到 12 天]        │  │
│  中心 ←  │  └────────────────────────────────────────────┘  │
│          │  ┌── 页签导航 ────────────────────────────────┐  │
│  文本    │  │ 概览 │ 资料 │ 积分 │ 安全 │ …             │  │
│  工具    │  └────────────────────────────────────────────┘  │
│  ...     │  ┌── 内容区（子路由 children）────────────────┐  │
│          │  │                                            │  │
│          │  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

响应式：

- `≥ 768px`：页签横向排列在 Banner 右侧或下方，内容区双列栅格。
- `< 768px`：Banner 纵向堆叠；页签改为横向可滑动（`overflow-x-auto`，隐藏滚动条）；内容区单列。

---

## 4. 入口改造

### 4.1 Topbar 用户菜单

现有菜单项 `个人设置`（调用 `openProfileModal()`）→ 改为跳转 `/user`。

改造后的用户菜单结构：

| 菜单项 | 图标 | 行为 | 可见条件 |
| --- | --- | --- | --- |
| 用户信息头部（昵称 / 邮箱 / 角色标签） | — | 静态展示 | 已登录 |
| 个人中心 | `UserRound` | `→ /user` | 已登录 |
| 我的积分 | `Coins` | `→ /user/points` | 已登录 |
| 账号安全 | `ShieldCheck` | `→ /user/security` | 已登录 |
| 管理后台 Dashboard | `Shield` | `→ /admin` | `role === 'ADMIN'` |
| 退出登录 | `LogOut` | `logout()` | 已登录 |

> 「个人设置」这一项被「个人中心」取代；后两项为快捷直达，可按需精简。

### 4.2 Sidebar

在「管理后台」入口上方新增「个人中心」导航项，仅登录后显示：

```
导航
  ├─ 工具总览            (所有用户)
  ├─ 个人中心            (登录后显示，主题色高亮)
  └─ 管理后台            (ADMIN 显示，紫色高亮)

文本工具
  ├─ 小说排版器
  ├─ HTML 编辑器
  └─ Markdown 编辑器
```

激活态判定需用 `pathname.startsWith('/user')`，而非 `pathname === '/user'`，否则子路由下高亮会丢失。同理，`/admin` 的判定也建议同步为前缀匹配（当前为精确匹配，进入 `/admin/users` 时侧栏会失去高亮）。

### 4.3 签到入口（保持不变）

- Topbar 火焰按钮：**保留**，行为不变（`openCheckIn()` 打开 `CheckInModal`）。
- `CheckInModal`：**保留**，仍是唯一的打卡动作入口。
- `/user/points` 页面：**只读展示**签到统计（连续天数、本月日历、里程碑进度）与积分流水，**不提供打卡按钮**，避免两套打卡逻辑并存导致状态不一致。

### 4.4 `ProfileModal` 的处置

`ProfileModal` 的三个 Tab 完全被 `/user/profile` 与 `/user/security` 覆盖，因此：

- 从 `src/app/layout.jsx` 中移除 `<ProfileModal />` 挂载。
- 删除 `src/components/auth/ProfileModal.jsx`。
- 从 `AuthContext` 移除 `showProfileModal` / `openProfileModal` / `closeProfileModal`。

> 顺带修复：当前 `ProfileModal.jsx` 第 174 行使用了 `CheckCircle2`，但文件顶部导入的是 `CheckCircle`，这是一个未被触发的运行时错误（仅在成功提示渲染时崩溃）。迁移到新页面时需注意图标名称正确。

### 4.5 未登录访问处理

`/user/**` 由 `UserLayout` 做客户端守卫，三态处理：

| 状态 | 表现 |
| --- | --- |
| `loading === true` | 骨架屏 / Loading 图标 + 「正在加载账户信息…」 |
| `loading === false && !user` | 居中卡片：提示「请先登录后访问个人中心」+「立即登录」按钮（调用 `openAuth('login')`）+「返回首页」链接 |
| `user` 存在 | 正常渲染 Banner + 页签 + 内容区 |

样式参考 `AdminLayout` 的「访问权限不足」卡片，保持一致的视觉语言。

同时在 `src/middleware.js` 中为 `/user` 页面路径追加一条规则：未携带有效 JWT 时 `redirect` 到 `/`。这一层是服务端兜底，避免未登录用户看到页面骨架闪烁；客户端守卫仍需保留，用于处理 Cookie 过期等边界情况。

---

## 5. 模块详细设计

### 5.1 UserBanner（跨页公共组件）

位于 `UserLayout` 内，所有子页面共享，不随页签切换而重渲染。

**展示内容**

| 区域 | 内容 | 数据来源 |
| --- | --- | --- |
| 左侧头像 | 48×48 圆角方块。有 `avatar` 时显示图片，否则昵称首字母 + 主题渐变背景 | `user.avatar` / `user.nickname` |
| 主标题 | 昵称 + 角色徽章（ADMIN 显示紫色「管理员」标签） | `user.nickname` / `user.role` |
| 副标题 | 邮箱 · 注册于 YYYY-MM-DD | `user.email` / `user.createdAt` |
| 右侧指标 | 积分余额（金色 Coins 图标）、连续签到天数（火焰图标） | `user.points` / `user.continuousCheckIn` |

**交互**

- 积分指标可点击 → 跳转 `/user/points`。
- 连续签到指标可点击 → 跳转 `/user/points`（不直接触发打卡）。
- 头像区域悬浮显示相机图标 → 跳转 `/user/profile`（头像上传落地后改为直接打开上传器）。

**状态说明**

- `user.createdAt` 目前在 `/api/auth/me` 的返回中可能未包含，需确认 `getSessionUser` 的 `select` 字段是否包含 `createdAt`。若缺失，需在该处补上。

### 5.2 概览 `/user`

用户中心的落地页，作为信息聚合与快速跳转中枢。

**统计卡片区**（4 张，`grid-cols-2 md:grid-cols-4`）

| 卡片 | 主数值 | 副文案 | 点击行为 |
| --- | --- | --- | --- |
| 积分余额 | `user.points` | 「累计获得 N 分」 | → `/user/points` |
| 连续签到 | `user.continuousCheckIn` | 今日已签 / 今日未签（红点提示） | → 打开 `CheckInModal` |
| 账号状态 | `ACTIVE` / `BANNED` | 状态说明文案 | → `/user/security` |
| 加入天数 | `今天 - createdAt` | 注册日期 | 无 |

> 「连续签到」卡片是概览页唯一允许直接唤起 `CheckInModal` 的位置——它只是复用了现有弹窗，未重复实现签到 UI，符合「签到入口保持现状」的约束。

**快捷入口区**（宫格 / 列表）

个人资料、账号安全、积分明细、偏好设置（置灰标注「即将上线」）。

**最近积分动态**

展示最近 5 条 `PointTransaction`，底部「查看全部」→ `/user/points`。数据可复用 `GET /api/user/checkin` 返回的 `history` 字段（已含最近 20 条），首期无需额外接口。

### 5.3 个人资料 `/user/profile`

**表单项**

| 字段 | 类型 | 可编辑 | 校验规则 |
| --- | --- | --- | --- |
| 头像 | 图片上传 | 是 [预留] | ≤ 2MB，jpg/png/webp，正方形裁剪 |
| 昵称 | 文本 | 是 | 1–50 字符，全局唯一，去除首尾空格 |
| 邮箱 | 文本 | 否（只读） | 展示并标注「邮箱暂不支持修改」 |
| 用户 ID | 文本 | 否（只读） | 提供复制按钮，便于反馈问题时提供 |
| 注册时间 | 日期 | 否（只读） | `YYYY-MM-DD HH:mm` |
| 角色 | 徽章 | 否（只读） | USER / ADMIN |

**交互流程（昵称）**

1. 输入框默认填充当前昵称，未修改时提交按钮禁用。
2. 提交 → `PATCH /api/user/profile { action: 'update_nickname', nickname }`。
3. 成功 → Toast「昵称更新成功」+ `refreshUser()`，页面停留（**不再像 Modal 那样 1.5 秒后自动关闭**）。
4. 失败（409 昵称重复）→ 输入框下方红色错误提示，不弹 Toast。

**与现有实现的差异**

现有 `ProfileModal` 使用组件内 `message` state 展示提示；新页面统一改用 `ToastContext` 的全局 Toast，表单级校验错误则内联显示，职责更清晰。

### 5.4 积分与签到记录 `/user/points`（只读）

**区块 1：积分概况**

- 大号积分余额数字 + 主题渐变。
- 三个小指标：本月获得、累计获得、累计消耗（消耗类目前恒为 0，因无消费场景，可先隐藏或显示占位）。

**区块 2：签到状态（只读）**

从 `CheckInModal` 抽取展示逻辑，去掉打卡按钮：

- 连续签到天数、当前循环第几天。
- 签到规则说明（`currentTier` 文案）。
- 下一里程碑进度条（`nextMilestone.daysRemaining`）。
- 本月签到日历（`checkedDays` 高亮）。
- 右上角文字提示：「点击顶部导航栏的签到按钮完成今日打卡」+ 一个次要按钮「去签到」（调用 `openCheckIn()`）。

> 该按钮不实现任何签到逻辑，仅唤起已有的 `CheckInModal`，保证打卡链路唯一。

**区块 3：积分流水**

现有 `GET /api/user/checkin` 只返回最近 20 条且不支持分页，因此新增独立接口。

- 列表列：时间、类型徽章、描述、变动金额（正绿负红）、变动后余额。
- 类型筛选：全部 / 签到 / 里程碑奖励 / 其他。
- 分页：每页 20 条，游标或页码分页均可；建议页码分页，实现简单且可显示总数。
- 空态：「暂无积分记录，快去签到赚取第一笔积分吧」。

### 5.5 账号安全 `/user/security`

**区块 1：修改密码**

沿用现有逻辑（当前密码 + 新密码 + 确认新密码 → `PATCH /api/user/profile { action: 'update_password' }`）。

增强点（可选）：

- 新密码强度指示条（弱 / 中 / 强），纯前端计算，不改接口。
- 修改成功后提示「密码已更新，其他设备的登录状态不受影响」——因当前 JWT 无版本号机制，改密不会使旧 token 失效。若要实现「改密后强制下线」，需在 User 表增加 `tokenVersion` 字段并在签发/校验时比对，属于后续增强。

**区块 2：登录信息**（只读）

- 最近登录时间、当前会话有效期（7 天）。
- 需要新增字段 `lastLoginAt` 才能展示，属于扩展项；首期可仅展示「会话有效期 7 天」。

**区块 3：安全日志** [预留]

登录、改密、注销等敏感操作的审计记录。需要新增 `SecurityLog` 表，首期以「即将上线」占位卡片呈现。

**区块 4：危险区（注销账号）**

沿用现有两步确认逻辑：

1. 红色边框区块说明后果（积分、签到记录永久删除，不可恢复；唯一管理员不可注销）。
2. 点击「我要注销账号」→ 展开密码确认输入框。
3. 提交 → `PATCH /api/user/profile { action: 'delete_account', password }`。
4. 成功 → Toast + 清除 session → `router.push('/')`。

页面化后可比 Modal 更充分地展示告知内容，建议增加一行「注销前请确认已导出需要保留的数据」。

### 5.6 偏好设置 `/user/preferences` [预留]

拟收纳当前散落在 `localStorage` 中的用户偏好，实现跨设备同步：

| 偏好项 | 当前存储 | 迁移后 |
| --- | --- | --- |
| 暗色模式 | `localStorage: toolbox-dark` | 服务端同步 + 本地缓存 |
| 主题色 | ThemeProvider 本地存储 | 服务端同步 + 本地缓存 |
| 侧边栏折叠状态 | `useSidebar` 本地存储 | 保持本地（设备相关，不宜同步） |
| 默认工具 | 无 | 登录后自动跳转指定工具 |

需要新增 `UserPreference` 表或在 User 表增加 JSON 字段。首期以占位卡片呈现。

### 5.7 消息通知 `/user/notifications` [预留]

系统公告、积分变动提醒、管理员通知。需要新增 `Notification` 表 + 未读计数接口 + Topbar 铃铛角标。首期以占位卡片呈现。

---

## 6. API 设计

### 6.1 复用（不改动）

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/auth/me` | 获取当前用户（需确认返回含 `createdAt`） |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/user/checkin` | 签到统计 + 最近 20 条流水（供概览与积分页只读展示） |
| POST | `/api/user/checkin` | 执行签到（仅 `CheckInModal` 调用） |
| GET | `/api/user/profile` | 获取用户完整资料 |
| PATCH | `/api/user/profile` | `update_nickname` / `update_password` / `delete_account` |

### 6.2 新增

#### `GET /api/user/points`

积分流水分页查询。

**Query 参数**

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | number | 1 | 页码，从 1 开始 |
| `pageSize` | number | 20 | 每页条数，上限 100 |
| `type` | string | 空 | 类型筛选：`CHECKIN` / `MILESTONE_BONUS` / 空表示全部 |

**响应**

```json
{
  "items": [
    {
      "id": "uuid",
      "amount": 10,
      "balance": 1280,
      "type": "CHECKIN",
      "description": "签到成功 (+10 积分，已连续 12 天)",
      "createdAt": "2026-08-24T02:11:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 137,
  "totalPages": 7,
  "summary": {
    "balance": 1280,
    "totalEarned": 1350,
    "totalSpent": 70,
    "monthEarned": 120
  }
}
```

**实现要点**

- 通过 `src/middleware.js` 已有的 `/api/user/*` 规则自动获得登录校验，路由内仍需调用 `getSessionUser()` 取 `userId`。
- `total` 用 `db.pointTransaction.count()`；`summary` 用 `aggregate` 分别对 `amount > 0` 与 `amount < 0` 求和。
- 严格按 `userId` 过滤，禁止接受客户端传入的 `userId` 参数，防止越权。

### 6.3 扩展 [预留]

#### `PATCH /api/user/profile` 新增 action

```json
{ "action": "update_avatar", "avatar": "<url 或 base64>" }
```

需先确定存储方案（本地 `public/uploads` / 对象存储 / Base64 直存数据库）。考虑到项目当前是 SQLite 单机部署且无对象存储依赖，建议方案：服务端接收后写入 `public/uploads/avatars/{userId}.{ext}`，数据库存相对路径。需注意 Next.js 生产构建下 `public` 目录只读的部署环境（如 Vercel）不适用此方案。

#### `GET /api/user/security-logs`

安全日志分页查询，依赖新增的 `SecurityLog` 表。

#### `GET | PATCH /api/user/preferences`

偏好设置读写，依赖新增的 `UserPreference` 表或 User 表 JSON 字段。

---

## 7. 数据模型变更

### 7.1 首期（无变更）

`/user` 首期功能全部基于现有 `User` 与 `PointTransaction` 模型，**无需任何 schema 迁移**。

### 7.2 扩展项 [预留]

```prisma
model User {
  // ... 现有字段
  lastLoginAt  DateTime?      // 最近登录时间
  tokenVersion Int    @default(0)  // 改密后强制下线用
  preferences  String?        // JSON 字符串，存偏好设置
  securityLogs SecurityLog[]
}

model SecurityLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action    String   // LOGIN / LOGOUT / PASSWORD_CHANGE / NICKNAME_CHANGE / DELETE_ACCOUNT
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

> 注意：`PointTransaction` 当前缺少 `@@index([userId, createdAt])`，在流水分页查询下会随数据量增长而变慢，建议在实现分页接口时一并补上索引。

---

## 8. 视觉与交互规范

### 8.1 复用现有设计语言

| 元素 | 规范 |
| --- | --- |
| 卡片 | `bg-card border border-border rounded-2xl` |
| 输入框 | `px-4 py-2.5 bg-bg border border-border rounded-xl text-sm` |
| 主按钮 | `rounded-xl text-white`，背景 `var(--theme-gradient)` |
| 次按钮 | `rounded-xl border border-border bg-card text-text` |
| 危险按钮 | `bg-rose-500 text-white hover:bg-rose-600` |
| 页签导航 | `bg-bg-primary border border-border p-1 rounded-xl`，激活项 `bg-card shadow-xs` |
| 入场动画 | `animate-fade-up` |
| 主题色 | 一律通过 CSS 变量 `var(--theme-gradient)` / `theme.accent`，禁止硬编码色值 |

### 8.2 色彩语义

| 语义 | 色值 |
| --- | --- |
| 用户中心主色 | 跟随全局主题色（不固定，与 `/admin` 的紫色形成区分） |
| 积分 / 奖励 | `amber-500` |
| 签到 / 成功 | `emerald-500` |
| 危险 / 注销 | `rose-500` |
| 管理员标识 | `purple-500` |

### 8.3 加载与空态

- 页面级加载：`SkeletonLoader` 骨架屏，避免布局跳动。
- 列表空态：图标 + 一句说明 + 一个引导操作按钮。
- 请求失败：内联错误卡片 + 「重试」按钮，不使用 alert。

### 8.4 无障碍

- 所有图标按钮提供 `aria-label`。
- 页签导航使用 `role="tablist"` 语义，当前项标注 `aria-current="page"`。
- 表单 `label` 与 `input` 通过 `htmlFor` / `id` 关联。
- 危险操作按钮需可键盘聚焦，且焦点环清晰可见。

---

## 9. 实施步骤

| 阶段 | 内容 | 依赖 |
| --- | --- | --- |
| S1 | 搭建 `src/app/user/layout.jsx`：登录守卫 + UserBanner + 页签导航 | 无 |
| S2 | 实现 `/user` 概览页（统计卡 + 快捷入口 + 最近动态） | S1 |
| S3 | 实现 `/user/profile`（昵称表单 + 只读信息） | S1 |
| S4 | 实现 `/user/security`（改密 + 危险区） | S1 |
| S5 | 新增 `GET /api/user/points` + 补 `PointTransaction` 索引 | 无 |
| S6 | 实现 `/user/points`（概况 + 只读签到 + 流水分页） | S1, S5 |
| S7 | 改造入口：Topbar 用户菜单、Sidebar 导航项、前缀匹配激活态 | S1 |
| S8 | 下线 `ProfileModal`：移除挂载、删除组件、清理 `AuthContext` | S3, S4, S7 |
| S9 | middleware 增加 `/user` 页面路由守卫 | S1 |
| S10 | [预留] 头像上传、偏好设置、安全日志、消息通知 | — |

---

## 10. 影响面与风险

### 10.1 需要改动的现有文件

| 文件 | 改动 |
| --- | --- |
| `src/shell/Topbar.jsx` | 用户菜单「个人设置」改为「个人中心」链接；移除 `openProfileModal` 引用 |
| `src/shell/Sidebar.jsx` | 新增「个人中心」导航项；激活态改前缀匹配 |
| `src/context/AuthContext.jsx` | 移除 `showProfileModal` / `openProfileModal` / `closeProfileModal` |
| `src/app/layout.jsx` | 移除 `<ProfileModal />` 挂载与 import |
| `src/middleware.js` | 新增 `/user` 页面路径守卫 |
| `src/lib/auth.js` | 确认 `getSessionUser` 的 select 含 `createdAt` |
| `prisma/schema.prisma` | 补 `PointTransaction` 复合索引（可选但建议） |

### 10.2 需要删除的文件

- `src/components/auth/ProfileModal.jsx`

### 10.3 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 用户习惯了弹窗式设置 | 短期困惑 | 菜单项文案改为「个人中心」，语义明确指向页面跳转 |
| 签到状态在两处展示可能不同步 | 数据不一致观感 | `/user/points` 每次进入重新拉取 `GET /api/user/checkin`；`CheckInModal` 打卡成功后调用 `updateUser` 更新全局 state |
| 删除 `ProfileModal` 后遗留调用 | 运行时报错 | 全局搜索 `openProfileModal` / `showProfileModal` 确认无残留引用 |
| `middleware` 拦截页面路由影响静态资源 | 页面 404 / 死循环 | `matcher` 精确限定为 `/user/:path*`，排除 `_next` 与静态文件 |
| 积分流水数据量增长后查询变慢 | 页面卡顿 | 实现分页接口时同步补 `@@index([userId, createdAt])` |

---

## 11. 验收标准

### 功能

1. 未登录访问 `/user` → 被引导至登录，不出现页面报错或空白。
2. 登录后 Topbar 用户菜单点击「个人中心」→ 正确跳转 `/user`。
3. Sidebar「个人中心」在 `/user` 及其所有子路由下均保持高亮。
4. 各子页面可直链访问、刷新后状态保持。
5. 修改昵称成功后，Topbar 与 UserBanner 的昵称同步更新。
6. 修改密码成功后可用新密码重新登录。
7. 注销账号后 session 清除并跳转首页。
8. `/user/points` 分页、类型筛选正常，金额正负色彩正确。
9. **Topbar 签到按钮与 `CheckInModal` 行为完全未变**；`/user/points` 无独立打卡按钮。
10. 签到成功后，`/user/points` 与概览页的积分、连续天数同步刷新。

### 非功能

1. 移动端（375px）下 Banner、页签、表单均无横向溢出。
2. 暗色模式下所有文字对比度符合 WCAG AA。
3. 切换主题色时，用户中心的主色随之变化。
4. 所有接口严格按当前 session 的 `userId` 取数，不接受客户端传入的用户标识。

---

## 12. 附录：页面功能归属总表

| 功能 | 改造前 | 改造后 |
| --- | --- | --- |
| 登录 / 注册 / 忘记密码 | `AuthModal` | `AuthModal`（不变） |
| 签到打卡 | `CheckInModal` | `CheckInModal`（不变） |
| 签到日历 / 里程碑 | `CheckInModal` | `CheckInModal` + `/user/points` 只读镜像 |
| 积分余额 | Topbar 徽章 | Topbar 徽章 + UserBanner + `/user/points` |
| 积分流水 | `CheckInModal`（20 条） | `/user/points`（分页全量） |
| 修改昵称 | `ProfileModal` Tab1 | `/user/profile` |
| 修改密码 | `ProfileModal` Tab2 | `/user/security` |
| 注销账号 | `ProfileModal` Tab3 | `/user/security` 危险区 |
| 账号基础信息 | 无 | `/user/profile` 只读区 |
| 头像 | 无（首字母代替） | `/user/profile` [预留] |
| 偏好设置 | `localStorage` | `/user/preferences` [预留] |
| 安全日志 | 无 | `/user/security` [预留] |
| 消息通知 | 无 | `/user/notifications` [预留] |
| 管理后台 | `/admin` | `/admin`（不变） |
