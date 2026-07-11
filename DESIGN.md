## ToolBox 多工具聚合平台 — 设计文档

### 一、项目定位

ToolBox 是一个全栈在线工具箱网站。前端工具在浏览器本地运行，需要后端能力的工具（如 AI 相关）通过 API 接口提供支持。每个工具独立开发、独立路由，通过统一的 Shell 外壳共享导航和布局。

当前第一个工具：小说排版器（novel-formatter），后续会持续增加文本、图片、AI、开发类等工具。

技术栈：Next.js 15（App Router）+ React 19 + Tailwind CSS v4，全栈一体化，部署到 Vercel 或自托管 Node.js 服务器。

---

### 二、架构设计

整体采用 **Shell + Tool Registry** 模式，分三层：

```
┌───────────────────────────────────────────────────┐
│  Shell（外壳）— app/layout.jsx                     │
│  侧边栏 + 顶部栏 + {children}                      │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │  工具页面（由 App Router 文件路由填充）      │    │
│  │                                           │    │
│  │  /novel-formatter  → NovelFormatter       │    │
│  │  /md-converter     → MdConverter          │    │
│  │  /api/ai/xxx       → Route Handler        │    │
│  └───────────────────────────────────────────┘    │
└───────────────────────────────────────────────────┘
```

**Shell 层**负责：侧边栏导航、面包屑、全局样式。所有工具页面共享同一个 Shell，不重复渲染。使用 Next.js 的 Layout 机制实现。

**Registry 层**负责：集中声明所有工具的元信息（名称、图标、描述、路由、分类），驱动侧边栏和首页自动生成。

**Tool 层**负责：每个工具是一组自包含的 React 组件，拥有自己的状态、样式和子组件，互不干扰。需要后端能力的工具在 `app/api/` 下定义对应的 Route Handler。

---

### 三、技术选型

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | 全栈一体，文件路由，SSR/SSG，API Routes |
| 语言 | JavaScript（后续可渐进迁移 TypeScript） | 降低初期门槛 |
| UI | React 19 + Tailwind CSS v4 | 延续现有技术栈 |
| 图标 | lucide-react | 轻量、风格统一 |
| 部署 | Vercel（推荐）或自托管 Node.js | Vercel 零配置，自托管用 `next start` |

**为什么用 Next.js 而不是继续 Vite + React：**
- 全栈一体：前端页面和后端 API 在同一个项目，部署在一起，类似 PHP 框架的体验
- 文件路由：`app/novel-formatter/page.jsx` 就是 `/novel-formatter` 路由，不需要手动配置
- API Routes：`app/api/xxx/route.js` 就是后端接口，支持流式响应（AI 场景需要）
- SSR/SSG：工具总览页可以做服务端渲染，有利于 SEO
- 现有 React 组件几乎不用改，只是外面套了 Next.js 的壳

**Server Component vs Client Component 划分：**
- Shell（layout.jsx）→ Server Component（默认，读取 registry 数据）
- Sidebar、Topbar → Client Component（`"use client"`，有交互状态）
- 工具总览页 → Server Component（渲染卡片列表，从 registry 读数据）
- 各工具页面 → Client Component（有交互逻辑）
- Route Handler → 纯后端（不渲染页面）

---

### 四、目录结构

```
src/
├── app/                              ← Next.js App Router
│   ├── layout.jsx                    ← 全局布局（Shell：侧边栏 + 顶部栏）
│   ├── page.jsx                      ← 首页（工具总览，Server Component）
│   ├── globals.css                   ← 全局样式、设计系统变量
│   │
│   ├── novel-formatter/
│   │   └── page.jsx                  ← 小说排版器页面（Client Component）
│   │
│   ├── api/                          ← 后端 API（Route Handlers）
│   │   └── novel-formatter/
│   │       └── route.js              ← 排版器 API（如未来需要后端处理）
│   │
│   └── [tool-id]/                    ← 未来工具的通用路由（可选）
│       └── page.jsx
│
├── shell/                            ← 外壳组件
│   ├── Sidebar.jsx                   ← 侧边栏（Client Component）
│   ├── Topbar.jsx                    ← 顶部栏（Client Component）
│   └── useSidebar.js                 ← 侧边栏状态 hook
│
├── components/                       ← 全局共用组件
│   └── ToolCard.jsx                  ← 首页工具卡片
│
├── tools/                            ← 工具代码（纯组件，不直接参与路由）
│   ├── registry.js                   ← 工具注册表（元信息唯一数据源）
│   │
│   ├── novel-formatter/
│   │   ├── NovelFormatter.jsx        ← 工具主组件（Client Component）
│   │   ├── components/
│   │   │   ├── EditorPanel.jsx
│   │   │   ├── OutputPanel.jsx
│   │   │   ├── ActionBar.jsx
│   │   │   ├── DiffStats.jsx
│   │   │   └── ProgressPanel.jsx
│   │   ├── hooks/
│   │   │   ├── useHighlight.js
│   │   │   └── useSyncScroll.js
│   │   └── lib/
│   │       ├── formatter.js
│   │       ├── charUtils.js
│   │       └── sampleText.js
│   │
│   └── future-tool/                  ← 未来工具
│       ├── FutureTool.jsx
│       ├── components/
│       └── lib/
│
└── lib/                              ← 全局共用工具函数
    └── utils.js
```

**路由映射关系：**

```
src/app/page.jsx                    →  /
src/app/novel-formatter/page.jsx    →  /novel-formatter
src/app/api/novel-formatter/route.js →  /api/novel-formatter
```

**关键原则：**
- `src/app/` 只管路由和页面壳，不放业务逻辑
- `src/tools/` 放工具的实际组件和逻辑，通过 `src/tools/registry.js` 注册
- 每个工具的 `components/`、`hooks/`、`lib/` 归该工具私有
- 后端 API 放在 `src/app/api/` 下，与前端页面路由平行

---

### 五、路由设计

使用 Next.js App Router 的文件路由，不需要 react-router-dom。

**页面路由：**
```
/                        → app/page.jsx（工具总览，SSR）
/novel-formatter         → app/novel-formatter/page.jsx（小说排版器，CSR）
/md-converter            → app/md-converter/page.jsx（未来）
```

**API 路由：**
```
POST /api/novel-formatter    → app/api/novel-formatter/route.js（未来扩展）
POST /api/ai/xxx             → app/api/ai/xxx/route.js（未来 AI 工具）
```

**布局嵌套：**
```
app/layout.jsx    → Shell（侧边栏 + 顶部栏），包裹所有页面
  app/page.jsx    → 首页内容
  app/novel-formatter/page.jsx → 排版器内容
```

工具页面的 `page.jsx` 只是一个薄壳，实际组件在 `src/tools/` 下：

```jsx
// app/novel-formatter/page.jsx
import NovelFormatter from '@/tools/novel-formatter/NovelFormatter';

export const metadata = {
  title: '小说排版器 - ToolBox',
  description: '一键规范化小说文本的标点、间距、段落格式',
};

export default function Page() {
  return <NovelFormatter />;
}
```

---

### 六、工具注册表（registry.js）

```js
export const tools = [
  {
    id: 'novel-formatter',
    name: '小说排版器',
    desc: '一键规范化标点、间距、段落，29 条排版规则',
    icon: 'BookOpen',              // lucide-react 图标名
    color: 'amber',                // 主题色标识
    path: '/novel-formatter',
    category: '文本',
    tags: ['写作', '排版'],
    clientOnly: true,              // 纯前端工具，无需后端
  },
  // 后续工具在这里添加...
];

// 分类列表（从工具中自动提取）
export const categories = ['全部', ...new Set(tools.map(t => t.category))];

// 按分类分组（供侧边栏使用）
export function getToolsByCategory() {
  const map = {};
  for (const tool of tools) {
    if (!map[tool.category]) map[tool.category] = [];
    map[tool.category].push(tool);
  }
  return map;
}
```

registry 只存储元信息（名称、图标、描述等），不存储组件引用。组件引用由 `src/app/工具名/page.jsx` 各自 import，保持路由文件和工具组件之间的直接关联。

新增一个工具的标准流程：

```
1. 创建工具组件
   src/tools/my-tool/
   ├── MyTool.jsx           ← 工具主组件
   ├── components/          ← 工具私有组件
   ├── hooks/               ← 工具私有 hooks
   └── lib/                 ← 工具私有逻辑

2. 创建路由页面
   src/app/my-tool/page.jsx
   → import MyTool from '@/tools/my-tool/MyTool'
   → export metadata（SEO 标题、描述）
   → export default → <MyTool />

3. 注册工具
   在 src/tools/registry.js 的 tools 数组中添加一条元信息记录

4. 如需后端 API
   src/app/api/my-tool/route.js
   → export async function POST(request) { ... }

5. 完成
   侧边栏和首页卡片自动从 registry 生成，无需改其他文件。
```

---

### 七、后端 API 设计

#### 7.1 API 路由规范

API 使用 Next.js Route Handlers，放在 `src/app/api/` 下：

```js
// src/app/api/ai/summary/route.js

export async function POST(request) {
  const { text } = await request.json();

  // 调用 AI 服务
  const result = await callAI(text);

  return Response.json({ result });
}

// 流式响应（适用于 AI 长文本生成）
export async function POST_stream(request) {
  const { text } = await request.json();

  const stream = await callAIStream(text);
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

#### 7.2 环境变量

敏感配置（API Key 等）放在 `.env.local`，不提交到 git：

```env
# .env.local
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

代码中通过 `process.env.OPENAI_API_KEY` 读取，只在 Route Handler（服务端）中使用，不会暴露给前端。

#### 7.3 工具的后端需求标识

registry 中的 `clientOnly` 字段标识工具是否需要后端：
- `clientOnly: true` — 纯前端工具，所有逻辑在浏览器运行（如小说排版器）
- `clientOnly: false`（默认）— 需要后端支持的工具（如 AI 工具）

前端可根据此字段在工具卡片上显示"本地运行"或"需要网络"的标识。

---

### 八、视觉设计

#### 8.1 设计理念

整体追求"工具感"而非"App 感"——干净、克制、信息密度适中，像一把好刀：平时安静，用的时候顺手。避免花哨的渐变和过度的圆角阴影，用排版节奏和间距来建立层次感。

#### 8.2 色彩系统

```
背景层
  --bg-primary:      #f6f5f2        主背景（暖灰，非纯白/纯灰）
  --bg-sidebar:      #1b1b1f        侧边栏（近黑，带微弱暖调）
  --bg-card:         #ffffff        卡片/面板背景
  --bg-card-alt:     #faf9f7        卡片头部等次要区域

文字层
  --text-primary:    #1a1a1e        正文标题
  --text-secondary:  #6b6b73        辅助文字
  --text-tertiary:   #a0a0a8        占位符、禁用态
  --text-sidebar:    rgba(255,255,255,0.45)   侧边栏默认
  --text-sidebar-active: #ffffff               侧边栏选中

品牌色
  --accent:          #d97706        琥珀色（主强调色，延续原排版器调性）
  --accent-hover:    #b45309
  --accent-subtle:   #fef3c7       极浅底色（标签、徽标）

边框
  --border:          #e8e6e1        默认边框（暖灰）
  --border-light:    #f0eee9        极细分割线

工具卡片各有独立的主题色（通过 data-color 属性），用于卡片顶部装饰线和图标背景：
  amber:   #d97706    emerald:  #059669    indigo:  #4f46e5
  rose:    #e11d48    cyan:     #0891b2    violet:  #7c3aed
```

选琥珀色作为全局强调色的原因：延续小说排版器原有的暖调气质，在深色侧边栏上辨识度高，且不同于常见的蓝紫色 AI 工具站。

#### 8.3 排版

```
中文正文字体:  "PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui
中文排版字体:  "PingFang SC", "Noto Sans SC", "STSong", "SimSun", serif
英文/数字:     跟随 system-ui，数字使用 tabular-nums

侧边栏品牌:    17px / 700 / letter-spacing 0.02em
侧边栏导航:    14px / 500 / 行高由容器决定
侧边栏分类标题: 10px / 600 / uppercase / letter-spacing 0.12em
页面标题:       22px / 700
卡片标题:       15px / 600
正文:           14px / 400 / line-height 1.6
辅助文字:       12px / 400 / color text-secondary
```

中文标题不做 letter-spacing，英文品牌名可以用 letter-spacing。数字一律 tabular-nums 对齐。

#### 8.4 侧边栏

宽度 240px（展开）/ 64px（收起），深色背景 #1b1b1f。

```
┌──────────────────────┐
│  [logo] ToolBox      │  ← 品牌区，logo 32x32 圆角方块
├──────────────────────┤  ← 分隔线 rgba(255,255,255,0.06)
│                      │
│  导航                 │  ← 分类标题（10px uppercase）
│  [■] 工具总览         │  ← 导航项，图标 32x32 方块 + 文字
│                      │
│  文本工具             │  ← 第二组分类
│  [📖] 小说排版器      │  ← 选中态：左侧 3px 竖线 + 浅色背景
│  [📝] Markdown 转换   │
│  [🔍] 文本对比        │
│                      │
│  图片工具             │
│  [🖼] 图片压缩        │
│  ...                 │
│                      │
├──────────────────────┤  ← 底部
│  [⚙] v0.1.0 共 N 个  │  ← 版本号 + 工具数量
└──────────────────────┘
  [◀]                     ← 折叠按钮（圆形，浮在侧边栏右边缘）
```

交互细节：
- 折叠按钮在侧边栏右边缘居中偏上位置，28px 圆形白底，hover 微放大 + 阴影加深
- 收起后导航项只显示图标，居中对齐，hover 显示 tooltip
- 选中项左侧 3px 琥珀色竖条 + `rgba(217,119,6,0.12)` 背景色
- 图标区 32x32 方块，圆角 8px，默认背景 `rgba(255,255,255,0.04)`，选中时 `rgba(217,119,6,0.15)`
- 分类标题在收起时隐藏
- 导航切换使用 Next.js `<Link>` 组件，无刷新跳转
- 所有过渡 0.25s cubic-bezier(0.16, 1, 0.3, 1)

#### 8.5 顶部栏

高度 52px，白底，底部 1px border。

```
┌─────────────────────────────────────────────────────────┐
│  ToolBox / 小说排版器              [🔍搜索]  [🔔通知]    │
└─────────────────────────────────────────────────────────┘
```

- 面包屑：`ToolBox` 灰色 → `/` 浅灰 → 当前页名 加粗
- 右侧按钮：34x34 方块，1px border，hover 背景变灰
- 后续可加搜索功能（Ctrl+K 快速搜索工具）

#### 8.6 工具总览页（首页）

```
┌─────────────────────────────────────────┐
│  工具箱                                 │
│  选择一个工具开始使用。                   │
│                                         │
│  [全部] [文本] [图片] [开发]             │  ← 分类筛选
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  📖      │  │  📝      │  │  🔍    ││  ← 卡片网格
│  │ 小说排版器│  │ MD 转换  │  │ 文本对比││     3列自适应
│  │ 描述文字  │  │ 描述文字  │  │ 描述   ││
│  │ [文本]    │  │ [文本]    │  │ [文本] ││
│  └──────────┘  └──────────┘  └────────┘│
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  🖼      │  │  🎨      │  │  🔧    ││
│  │ 图片压缩  │  │ 格式转换  │  │JSON可视││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
```

卡片规格：
- 尺寸：280px 最小宽度，grid 自适应列数
- 内边距：24px
- 圆角：12px
- 边框：1px var(--border)，hover 时边框变品牌色 25% 透明度
- hover 效果：translateY(-2px) + 中等阴影 + 顶部 3px 彩色装饰线淡入
- 图标区：48x48 方块，圆角 12px，与工具主题色对应的浅色背景
- 标题 15px/600，描述 13px/text-secondary，标签 11px 胶囊形灰底
- 卡片使用 Next.js `<Link>` 组件，点击无刷新跳转
- 入场动画：fade-up 依次延迟 40ms
- 首页为 Server Component，registry 数据在服务端读取，SEO 友好

#### 8.7 工具页面布局

工具页面没有统一的内边距和标题，由各工具自行决定内容区的布局。Shell 只提供 `{children}` 容器，工具组件直接填充。

小说排版器迁移时的布局保持不变（双栏编辑器 + 操作栏 + 进度面板 + 统计），由 `NovelFormatter.jsx` 自行管理。

---

### 九、小说排版器迁移方案

从 Vite + React 迁移到 Next.js，代码结构移动 + 少量适配：

**文件位置迁移：**

```
原位置（Vite 项目）                     →  新位置（Next.js 项目）
src/App.jsx                           →  src/tools/novel-formatter/NovelFormatter.jsx
src/components/EditorPanel.jsx        →  src/tools/novel-formatter/components/EditorPanel.jsx
src/components/OutputPanel.jsx        →  src/tools/novel-formatter/components/OutputPanel.jsx
src/components/ActionBar.jsx          →  src/tools/novel-formatter/components/ActionBar.jsx
src/components/DiffStats.jsx          →  src/tools/novel-formatter/components/DiffStats.jsx
src/components/ProgressPanel.jsx      →  src/tools/novel-formatter/components/ProgressPanel.jsx
src/hooks/useHighlight.js             →  src/tools/novel-formatter/hooks/useHighlight.js
src/hooks/useSyncScroll.js            →  src/tools/novel-formatter/hooks/useSyncScroll.js
src/lib/formatter.js                  →  src/tools/novel-formatter/lib/formatter.js
src/lib/charUtils.js                  →  src/tools/novel-formatter/lib/charUtils.js
src/lib/sampleText.js                 →  src/tools/novel-formatter/lib/sampleText.js
src/index.css（排版器相关样式）          →  src/tools/novel-formatter/styles.css
```

**代码改动点：**

1. `App.jsx` → `NovelFormatter.jsx`
   - 文件顶部加 `"use client"`（因为有 state、ref、hooks）
   - 去掉 `<div className="min-h-screen">` 外壳和 `<header>` 导航栏
   - 只保留内部工具内容
   - 所有 import 路径改为相对路径

2. 所有子组件（EditorPanel 等）
   - 文件顶部加 `"use client"`（因为接收 props 中有回调函数）

3. CSS 迁移
   - 排版器私有样式（textarea-invisible、highlight-overlay、output-paragraph）移到 `tools/novel-formatter/styles.css`
   - 全局设计系统变量写在 `app/globals.css`

4. 路由页面
   - 新建 `src/app/novel-formatter/page.jsx`，import 并渲染 `NovelFormatter`
   - 导出 metadata（title、description）用于 SEO

---

### 十、开发步骤

按以下顺序实施，每步可独立验证：

1. **项目初始化** — 用 `create-next-app` 创建 Next.js 15 项目，配置 Tailwind CSS v4，建立基础目录结构
2. **Shell 骨架** — 实现 `app/layout.jsx`（Shell）、Sidebar、Topbar，路由跑通
3. **侧边栏完善** — 折叠/展开、分类导航、选中态、过渡动画、路由联动
4. **工具总览页** — 首页从 registry 自动生成卡片网格，分类筛选功能
5. **迁移小说排版器** — 移动文件到 `tools/novel-formatter/`，创建路由页面，验证功能
6. **全局样式** — 设计系统变量、色彩、排版、动画写入 `globals.css`
7. **细节打磨** — 响应式适配、入场动画、键盘快捷键（Ctrl+K）
8. **README 更新** — 更新项目文档，说明架构和新增工具的方法

---

### 十一、新增工具的开发者指南

```
新增一个工具的标准流程：

1. 创建工具组件
   src/tools/my-tool/
   ├── MyTool.jsx            ← 工具主组件（顶部加 "use client"）
   ├── components/           ← 工具私有组件
   ├── hooks/                ← 工具私有 hooks
   ├── lib/                  ← 工具私有逻辑
   └── styles.css            ← 工具私有样式（可选）

2. 创建路由页面
   src/app/my-tool/page.jsx

   import MyTool from '@/tools/my-tool/MyTool';

   export const metadata = {
     title: '我的工具 - ToolBox',
     description: '一句话描述',
   };

   export default function Page() {
     return <MyTool />;
   }

3. 注册工具
   在 src/tools/registry.js 的 tools 数组中添加：
   {
     id: 'my-tool',
     name: '我的工具',
     desc: '一句话描述',
     icon: 'Wrench',
     color: 'emerald',
     path: '/my-tool',
     category: '开发',
     tags: ['开发'],
     clientOnly: true,
   }

4. 如需后端 API（可选）
   src/app/api/my-tool/route.js

   export async function POST(request) {
     const body = await request.json();
     // 处理逻辑...
     return Response.json({ result });
   }

5. 完成
   侧边栏和首页卡片从 registry 自动生成，无需改其他文件。
```
