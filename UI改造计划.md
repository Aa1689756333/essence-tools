# ToolBox 工具箱 — UI 改造计划

> 基于 [UI分析报告](file:///d:/11111111111111111111/novel-formatter/UI分析报告.md) 制定，按优先级分阶段执行。

---

## 阶段一：核心功能修复（P0）

### 任务 1.1 — 首页分类标签交互

**问题**：分类标签硬编码高亮，点击无响应，无过滤功能。

**改造方案**：

1. 在 `page.jsx` 中添加 `useState` 管理当前选中分类
2. 点击标签切换高亮状态
3. 根据选中分类过滤工具列表（"全部"显示所有）
4. 添加选中态的主题色联动（选中标签底部出现主题色指示条）

**涉及文件**：
- `src/app/page.jsx` — 添加状态管理、过滤逻辑、选中样式

**验收标准**：
- 点击任意分类标签，高亮切换至该标签
- 工具卡片按分类正确过滤
- 高亮色跟随主题色变化

---

### 任务 1.2 — 统一移动端检测机制

**问题**：JS（`useSidebar`）和 CSS（`md:hidden`）两套 768px 断点独立运行，快速拖拽窗口时可能闪烁。

**改造方案**：

1. 移除 `useSidebar.js` 中的 `window.innerWidth` 检测
2. 改用 CSS 媒体查询 + `getComputedStyle` 读取 CSS 变量方式判断
3. 具体方案：在 `globals.css` 中定义 `--is-mobile: 0/1` 变量，通过 `@media (max-width: 767px)` 切换
4. JS 端通过 `window.matchMedia('(max-width: 767px)')` 统一监听

**涉及文件**：
- `src/shell/useSidebar.js` — 改用 `matchMedia` 统一检测
- `src/app/globals.css` — 添加移动端 CSS 变量（可选）

**验收标准**：
- 拖拽窗口跨越 768px 时无闪烁
- 移动端只渲染抽屉式侧边栏，桌面端只渲染固定侧边栏
- 无双重渲染问题

---

## 阶段二：视觉一致性修复（P1）

### 任务 2.1 — 清理冗余颜色系统

**问题**：`globals.css` 中 `@theme` 定义的颜色变量从未被组件使用。

**改造方案**：

1. 删除 `globals.css` 中 `@theme { ... }` 块内的 `--color-accent` 等与主题色相关的变量
2. 保留 `--color-bg`、`--color-text`、`--color-border` 等基础色变量
3. 确保所有组件统一使用 `useTheme()` 获取主题色

**涉及文件**：
- `src/app/globals.css` — 清理冗余变量
- 全局检查各组件是否引用了被删除的变量

**验收标准**：
- 只有一套颜色系统（ThemeProvider）
- 无死代码

---

### 任务 2.2 — 高亮颜色跟随主题变化

**问题**：小说排版器的行高亮、段落高亮硬编码为绿色。

**改造方案**：

1. 将 `styles.css` 中的硬编码颜色改为 CSS 变量
2. 在 `ThemeProvider` 的 `useEffect` 中设置 `--theme-accent-rgb` 变量（RGB 格式，用于 rgba）
3. 修改 `styles.css`：
   - `.line.active` → `background: rgba(var(--theme-accent-rgb), 0.15)`
   - `.output-paragraph:hover` → `background: rgba(var(--theme-accent-rgb), 0.08)`
   - `.output-paragraph.active` → `background: rgba(var(--theme-accent-rgb), 0.15)`

**涉及文件**：
- `src/shell/ThemeProvider.jsx` — 新增 `--theme-accent-rgb` CSS 变量
- `src/tools/novel-formatter/styles.css` — 改用 CSS 变量

**验收标准**：
- 切换主题色后，高亮颜色同步变化
- 薄荷绿→绿色高亮，樱花粉→粉色高亮，等等

---

### 任务 2.3 — Topbar 与侧边栏高度对齐

**问题**：Topbar 高 54px，侧边栏品牌区高 52px，border 不对齐。

**改造方案**：

1. 统一为 52px（或统一为 54px，推荐 52px 更紧凑）
2. 修改 `Topbar.jsx` 的 `h-[54px]` → `h-[52px]`

**涉及文件**：
- `src/shell/Topbar.jsx` — 修改高度

**验收标准**：
- Topbar 和侧边栏的底部 border 在视觉上完全对齐

---

### 任务 2.4 — 首页最大宽度约束 + 大屏列数优化

**问题**：超宽屏幕卡片过度拉伸，大屏只有 3 列。

**改造方案**：

1. 首页内容区添加 `max-w-6xl mx-auto`
2. 卡片网格增加 `2xl:grid-cols-4` 断点
3. 分类标签栏添加 `max-w-6xl` 约束

**涉及文件**：
- `src/app/page.jsx` — 添加 max-width 和 grid 断点

**验收标准**：
- 2K 屏幕下内容居中、不拉伸
- 1440px+ 屏幕显示 4 列卡片

---

### 任务 2.5 — 小说排版器动态高度

**问题**：双面板固定 600px，笔记本屏幕可能溢出。

**改造方案**：

1. 将 `h-[600px]` 改为 `h-[calc(100vh-240px)]`
2. 添加 `min-h-[380px]` 防止过小
3. 移动端改为 `min-h-[280px] max-h-[45vh]`

**涉及文件**：
- `src/tools/novel-formatter/NovelFormatter.jsx` — 修改高度约束

**验收标准**：
- 1366×768 笔记本屏幕上无需页面滚动即可看到完整面板
- 大屏上面板自动扩展，利用更多空间

---

## 阶段三：移动端体验优化（P2）

### 任务 3.1 — 移动端抽屉宽度优化

**问题**：260px 抽屉在 375px 手机上占比过大。

**改造方案**：

1. 将 `w-[260px]` 改为 `w-[min(260px,72vw)]`
2. 确保在 320px 窄屏上抽屉不超过 230px

**涉及文件**：
- `src/shell/Sidebar.jsx` — 修改移动端抽屉宽度

**验收标准**：
- 手机上抽屉占比合理，内容区至少可见 100px+

---

### 任务 3.2 — 移动端 Topbar 精简

**问题**：手机端 4 个按钮挤在右侧，搜索和通知是空壳。

**改造方案**：

1. 移动端隐藏搜索和通知按钮（`hidden sm:flex`）
2. 只保留汉堡菜单 + 主题切换按钮
3. 后续如果搜索功能上线，改为弹出式搜索面板

**涉及文件**：
- `src/shell/Topbar.jsx` — 添加响应式隐藏

**验收标准**：
- 手机端 Topbar 右侧只有 2 个按钮
- 桌面端不受影响

---

### 任务 3.3 — 小说排版器移动端优化

**问题**：移动端面板无高度约束，体验差。

**改造方案**：

1. 移动端每个面板设置 `min-h-[250px] max-h-[42vh]`
2. 考虑添加 Tab 切换模式（输入/输出切换查看），减少纵向空间占用
3. ActionBar 按钮在移动端适当缩小间距

**涉及文件**：
- `src/tools/novel-formatter/NovelFormatter.jsx` — 移动端高度约束
- `src/tools/novel-formatter/components/EditorPanel.jsx` — 移动端适配
- `src/tools/novel-formatter/components/OutputPanel.jsx` — 移动端适配

**验收标准**：
- 手机上双面板不会溢出视口
- 输入输出区域高度合理，可正常滚动

---

### 任务 3.4 — HTML 编辑器工具栏响应式

**问题**：工具栏小屏密集换行，按钮图标重复。

**改造方案**：

1. 工具栏容器改为 `overflow-x-auto`，小屏时横向滚动
2. 隐藏滚动条（`scrollbar-hide`）保持美观
3. 为「插入链接」「插入图片」「插入表格」更换不同图标：
   - 链接 → `Link` 图标
   - 图片 → `Image` 图标
   - 表格 → `Table` 图标
4. 移动端编辑区 `min-height` 降为 `300px`

**涉及文件**：
- `src/tools/html-editor/HtmlEditor.jsx` — 工具栏响应式、图标更换
- `src/tools/html-editor/styles.css` — 编辑区高度调整、滚动条隐藏

**验收标准**：
- 小屏工具栏单行显示、可横向滑动
- 各功能按钮图标可区分

---

### 任务 3.5 — 平板竖屏侧边栏默认折叠

**问题**：768px~1024px 区间侧边栏展开占 200px，内容区过窄。

**改造方案**：

1. 在 `useSidebar.js` 中增加中屏检测（768px~1024px）
2. 中屏默认折叠侧边栏（`collapsed = true`）
3. 用户手动展开后保持用户选择

**涉及文件**：
- `src/shell/useSidebar.js` — 添加中屏断点逻辑

**验收标准**：
- iPad 竖屏下侧边栏默认折叠，内容区最大化
- 用户可手动展开

---

## 阶段四：交互细节打磨（P3）

### 任务 4.1 — 移动端抽屉 ESC 关闭

**改造方案**：
1. 在 `Sidebar.jsx` 中添加 `useEffect` 监听 `keydown` 事件
2. ESC 键触发 `closeMobile()`

**涉及文件**：`src/shell/Sidebar.jsx`

---

### 任务 4.2 — 首页分类切换动画

**改造方案**：
1. 工具卡片网格包裹 `<div>` 添加 `key={activeCategory}`
2. 切换分类时触发 `animate-fade-up` 动画
3. 标签选中态添加主题色底边指示条过渡

**涉及文件**：`src/app/page.jsx`

---

### 任务 4.3 — 主题选择器溢出检测

**改造方案**：
1. 主题选择器改为 `right-0` 对齐（而非 `left-0`）
2. 添加边界检测：如果右侧空间不足则向左展开

**涉及文件**：`src/shell/Topbar.jsx`

---

### 任务 4.4 — HTML 编辑器颜色选择器溢出检测

**改造方案**：
1. 颜色选择器面板改为动态对齐（`left-0` 或 `right-0`）
2. 通过 `ref` 获取位置信息判断是否超出视口

**涉及文件**：`src/tools/html-editor/HtmlEditor.jsx`

---

### 任务 4.5 — 页面切换过渡动画

**改造方案**：
1. 在 `layout.jsx` 的 `<main>` 内包裹一层动画容器
2. 使用 `animate-fade-up` 实现页面进入时的淡入效果
3. 配合 Next.js 的 `usePathname` 在路径变化时触发动画

**涉及文件**：
- `src/app/layout.jsx` — 添加过渡容器
- `src/app/globals.css` — 添加过渡样式（如需要）

---

### 任务 4.6 — 折叠按钮装饰线逻辑清理

**改造方案**：
1. 移除 `onMouseEnter/onMouseLeave` 中多余的 `style.backgroundColor` 设置
2. 装饰线颜色直接通过 `style={{ backgroundColor: theme.accent }}` 设置即可

**涉及文件**：`src/shell/Sidebar.jsx`

---

### 任务 4.7 — ToolCard 配色与主题联动（可选）

**改造方案**：
1. 方案 A：ToolCard 装饰色跟随主题色变化（所有卡片统一主题色）
2. 方案 B：保留多色卡片，但当前主题对应的颜色卡片高亮显示
3. 推荐方案 B，保持首页视觉丰富度

**涉及文件**：`src/components/ToolCard.jsx`

---

## 执行顺序与依赖关系

```
阶段一（P0）── 无依赖，可并行
├── 任务 1.1  首页分类交互
└── 任务 1.2  移动端检测统一

阶段二（P1）── 依赖阶段一完成
├── 任务 2.1  清理颜色系统
├── 任务 2.2  高亮颜色跟随主题（依赖 2.1）
├── 任务 2.3  Topbar 高度对齐
├── 任务 2.4  首页最大宽度 + 列数
└── 任务 2.5  排版器动态高度

阶段三（P2）── 依赖阶段一完成
├── 任务 3.1  抽屉宽度优化
├── 任务 3.2  Topbar 精简
├── 任务 3.3  排版器移动端优化（依赖 2.5）
├── 任务 3.4  编辑器工具栏响应式
└── 任务 3.5  平板默认折叠（依赖 1.2）

阶段四（P3）── 独立，可穿插执行
├── 任务 4.1  ESC 关闭
├── 任务 4.2  分类切换动画（依赖 1.1）
├── 任务 4.3  主题选择器溢出
├── 任务 4.4  颜色选择器溢出
├── 任务 4.5  页面过渡动画
├── 任务 4.6  折叠按钮清理
└── 任务 4.7  ToolCard 联动（可选）
```

---

## 预估工时

| 阶段 | 任务数 | 预估工时 |
|------|--------|----------|
| 阶段一 P0 | 2 | 1~2 小时 |
| 阶段二 P1 | 5 | 2~3 小时 |
| 阶段三 P2 | 5 | 2~3 小时 |
| 阶段四 P3 | 7 | 2~3 小时 |
| **合计** | **19** | **7~11 小时** |
