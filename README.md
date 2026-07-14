# ToolBox · 在线工具箱

一款纯前端的在线工具集合，所有工具均在浏览器本地运行，**不上传任何数据**。基于 Next.js 15 (App Router) + React 19 + Tailwind CSS v4 构建，目前已内置三个文本类工具。

## 功能概览

| 工具 | 路径 | 说明 |
|------|------|------|
| 📖 小说排版器 | `/novel-formatter` | 29 条排版规则一键规范化中文小说文本 |
| 📝 HTML 编辑器 | `/html-editor` | Word 式富文本编辑，可导出 HTML 代码 |
| 📄 Markdown 编辑器 | `/markdown-editor` | 实时预览的 Markdown 编辑器，支持导出 |

## 三个工具详解

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

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15（App Router + Turbopack） |
| UI 库 | React 19 |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`） |
| 图标 | lucide-react |
| Markdown | marked + DOMPurify + highlight.js |
| 语言 | JavaScript (ES Modules) |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000，启用 Turbopack）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

## 项目结构

```
novel-formatter/
├── next.config.mjs             # Next.js 配置
├── jsconfig.json               # 路径别名 @/* → ./src/*
├── postcss.config.mjs          # Tailwind v4 PostCSS 插件
├── package.json
│
└── src/
    ├── app/                    # Next.js App Router
    │   ├── layout.jsx          # 根布局：Sidebar + Topbar + Provider 组合
    │   ├── page.jsx            # 首页：工具总览（分类标签 + 卡片网格）
    │   ├── globals.css         # Tailwind 指令 + 主题变量 + 动画 + 滚动条
    │   ├── novel-formatter/page.jsx
    │   ├── html-editor/page.jsx
    │   └── markdown-editor/page.jsx
    │
    ├── shell/                  # 应用外壳（跨工具共享）
    │   ├── ThemeProvider.jsx   # 5 套主题色 + CSS 变量注入 + localStorage 持久化
    │   ├── Sidebar.jsx         # 侧边栏：桌面折叠 / 移动抽屉
    │   ├── Topbar.jsx          # 顶栏：面包屑 + 主题切换弹层
    │   └── useSidebar.js       # 侧边栏状态 Context（响应式断点）
    │
    ├── components/
    │   └── ToolCard.jsx        # 首页工具卡片
    │
    └── tools/                  # 工具实现
        ├── registry.js         # 工具注册表（id/name/path/icon/tags/category）
        │
        ├── novel-formatter/
        │   ├── NovelFormatter.jsx      # 主组件：状态管理 + 排版调度 + 内容匹配
        │   ├── styles.css
        │   ├── lib/
        │   │   ├── formatter.js        # 排版引擎：29 条规则，4 阶段流水线
        │   │   ├── charUtils.js        # 字符分类：CJK / 全角 / 半角 / 标点判定
        │   │   └── sampleText.js       # 内置测试文本
        │   ├── hooks/
        │   │   ├── useHighlight.js     # 双向悬停高亮（getBoundingClientRect 定位）
        │   │   └── useSyncScroll.js    # 三面板同步滚动（比例映射 + RAF 防抖）
        │   └── components/
        │       ├── EditorPanel.jsx     # 输入面板：textarea + overlay 分层
        │       ├── OutputPanel.jsx     # 输出面板：声明式段落 + data-input-line 匹配
        │       ├── ActionBar.jsx       # 操作按钮组
        │       ├── DiffStats.jsx       # 排版前后字数对比
        │       └── ProgressPanel.jsx   # 4 阶段进度动画
        │
        ├── html-editor/
        │   ├── HtmlEditor.jsx          # 主组件（含工具栏/编辑区/模态框/图片手柄）
        │   └── styles.css
        │
        └── markdown-editor/
            ├── MarkdownEditor.jsx      # 主组件（含工具栏/编辑区/预览区/查找替换）
            └── styles.css
```

## 架构设计

### 应用外壳

```
┌─ RootLayout ──────────────────────────────────────────────┐
│  ThemeProvider → SidebarProvider                          │
│  ┌─ Sidebar ──────┐  ┌─ 主区域 ─────────────────────────┐ │
│  │ 品牌区          │  │ Topbar（面包屑 + 主题切换）       │ │
│  │ 导航（按分类）   │  │ ─────────────────────────────── │ │
│  │ 工具总览        │  │ main（children = 当前工具页面）  │ │
│  │ 文本工具        │  │                                  │ │
│  │  · 小说排版器   │  │                                  │ │
│  │  · HTML 编辑器  │  │                                  │ │
│  │  · Markdown    │  │                                  │ │
│  └────────────────┘  └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- **桌面端**：侧边栏固定（可折叠 56px ↔ 200px），平板宽度自动折叠
- **移动端**：抽屉式侧边栏，遮罩层 + ESC 关闭
- **工具注册**：所有工具在 `registry.js` 集中注册，Sidebar 与首页均从注册表读取，新增工具只需加一条配置 + 一个页面

### 主题系统

`ThemeProvider` 提供 5 套主题色，通过 CSS 变量注入 `:root`，全应用通过 `var(--theme-accent)` 等变量消费：

| 主题 | 主色 | hover | 浅色 |
|------|------|-------|------|
| mint 薄荷绿 | `#34d399` | `#10b981` | `#ecfdf5` |
| rose 樱花粉 | `#fb7185` | `#f43f5e` | `#fff1f2` |
| amber 柠檬黄 | `#fbbf24` | `#f59e0b` | `#fffbeb` |
| sky 天空蓝 | `#38bdf8` | `#0ea5e9` | `#f0f9ff` |
| violet 薰衣紫 | `#c4b5fd` | `#a78bfa` | `#f5f3ff` |

主题选择持久化到 `localStorage('toolbox-theme')`。

### 小说排版器 — 输入面板分层架构

输入面板采用 textarea + overlay 分层，兼顾原生编辑体验与视觉高亮：

```
┌─ input-wrapper (relative) ─────────────┐
│  ┌─ textarea (z-index: 2) ───────────┐ │  ← 用户交互层
│  │  color: transparent                │ │     文字透明，仅光标可见
│  │  caret-color 主题色                │ │     接收所有输入/粘贴事件
│  └────────────────────────────────────┘ │
│  ┌─ highlight-overlay (z-index: 1) ──┐ │  ← 视觉渲染层
│  │  pointer-events: none              │ │     渲染可见文本 + 悬停行高亮
│  │  padding-right: 37px               │ │     补偿 textarea 滚动条宽度
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- **悬停高亮**：监听 textarea `mousemove`，通过 `getBoundingClientRect()` 检测鼠标 Y 坐标落在 overlay 哪个 `.line`，避免字符估算漂移；输出侧通过 `<p data-input-line="N">` 反查
- **内容匹配**：`normalizeForMatch()` 全角转半角并去标点，按前缀匹配得分（≥2 字符视为有效），从上次匹配位置向后搜索保证顺序一致
- **同步滚动**：三面板按 `scrollRatio` 比例映射，`isSyncing` ref 防递归，`requestAnimationFrame` 每帧只同步一次

### 安全与本地化

- **纯前端**：所有工具标记 `clientOnly`，数据不离开浏览器
- **XSS 防护**：HTML 编辑器输出经 `escapeHtml` + `isSafeUrl`（拦截 `javascript:`/`data:` 协议）；Markdown 编辑器经 `DOMPurify.sanitize`
- **SSR 安全**：`DOMPurify` 等依赖 `window` 的库加 `typeof window === 'undefined'` 防护
- **中文优先**：词数统计用「中文单字 + 英文单词」算法，不使用 `split(/\s+/)`
- **marked 实例化**：用 `new Marked()` 而非全局 `marked.setOptions()`，避免配置污染

## 开发

```bash
npm run dev    # 开发服务器（Turbopack，热更新）
npm run build  # 生产构建
npm run start  # 启动生产服务器
```

路径别名 `@/*` 指向 `src/*`，新增工具步骤：

1. 在 `src/tools/registry.js` 增加一条工具配置
2. 在 `src/app/<tool-id>/page.jsx` 创建路由（导出 `metadata` + 渲染工具组件）
3. 在 `src/tools/<tool-id>/` 实现工具组件

Sidebar 与首页会自动读取注册表，无需额外改动。

## 部署

构建后可部署到 Vercel、Netlify、Cloudflare Pages 或任何支持 Next.js / 静态托管的服务。由于所有工具均为客户端运行，也可导出为静态站点。

## 许可

MIT
