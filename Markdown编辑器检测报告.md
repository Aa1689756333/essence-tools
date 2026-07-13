# Markdown 编辑器全面检测报告

> **检测对象**：`src/tools/markdown-editor/MarkdownEditor.jsx` 及关联文件
> **检测日期**：2026-07-13
> **检测方法**：代码审查 + 自动化脚本测试 + 边界场景验证
> **项目版本**：toolbox v0.1.0（Next.js 15 + React 19 + marked 18.0.6 + dompurify 3.4.12）

---

## 一、检测概述

本次检测对项目中的 Markdown 编辑器进行了全面评估，覆盖**架构设计、功能完整性、用户体验、安全性、性能、可访问性、代码质量**七大维度。检测过程包含：

1. **静态代码审查**：通读 `MarkdownEditor.jsx`（439 行）、`styles.css`（291 行）、`page.jsx` 及关联的 `ThemeProvider`、`registry`、`layout`、`globals.css`
2. **自动化测试**：编写两轮测试脚本（`test-md-editor.mjs`、`test-md-editor-2.mjs`），共 40+ 测试用例，覆盖渲染、历史记录、光标定位、XSS 防护、边界场景
3. **横向对比**：与同项目中的 `novel-formatter`、`html-editor` 对比设计模式

---

## 二、功能清单

### 2.1 编辑能力

| 类别 | 功能 | 实现方式 |
|------|------|----------|
| 文本格式 | 加粗 `**` / 斜体 `*` / 删除线 `~~` | `insertAtCursor` 包裹选区 |
| 标题 | H1 / H2 / H3 | `insertAtLineStart` 行首插入 |
| 列表 | 无序列表 `- ` / 有序列表 `1. ` / 任务列表 `- [ ] ` | `insertAtLineStart` |
| 引用 | `> ` | `insertAtLineStart` |
| 代码 | 行内代码 `` ` `` / 代码块 ` ``` ` | `insertAtCursor` |
| 链接 | `[文本](url)` | `insertAtCursor` |
| 图片 | `![描述](url)` | `insertAtCursor` |
| 分割线 | `---` | `insertAtCursor` |

### 2.2 交互能力

- **撤销 / 重做**：自定义历史栈（上限 200 条），支持 `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`
- **快捷键**：`Ctrl+B`（加粗）、`Ctrl+I`（斜体）、`Tab`（插入 2 空格）
- **三视图模式**：仅编辑 / 分屏 / 仅预览
- **实时预览**：`useMemo` 缓存渲染结果，输入即渲染
- **复制**：复制 Markdown 源码 / 复制 HTML 源码
- **导出**：导出 `.md` 文件 / 导出带样式的 `.html` 文件
- **清空**：一键清空（可撤销）
- **统计**：行数 + 词数

### 2.3 渲染能力

- 基于 `marked` v18，启用 `gfm: true`（GitHub Flavored Markdown）
- 启用 `breaks: true`（单换行渲染为 `<br>`）
- 支持：标题、段落、强调、列表、任务列表、引用、代码、表格、链接、图片、分割线
- XSS 防护：`DOMPurify.sanitize()` 清理危险 HTML

---

## 三、优点分析

### ✅ 3.1 架构设计清晰

- **单一组件封装**：`MarkdownEditor.jsx` 自包含，通过 `page.jsx` 一行接入路由，符合工具箱的统一注册模式（`registry.js`）
- **关注点分离**：渲染逻辑（`marked` + `DOMPurify`）、状态管理（`useState`/`useRef`）、UI（工具栏 + 编辑区 + 预览区）分层清晰
- **主题集成**：通过 `useTheme()` 接入全局主题系统，导出 HTML 按钮使用 `theme.accent`，与工具箱整体视觉一致

### ✅ 3.2 渲染管线标准

```javascript
const renderedHtml = useMemo(() => {
  if (!markdown.trim()) return '';
  const raw = marked.parse(markdown);
  return DOMPurify.sanitize(raw);
}, [markdown]);
```

- `useMemo` 缓存避免重复渲染
- 空内容短路返回，节省计算
- `marked` → `DOMPurify` 的两步管线是业界标准做法
- **测试确认**：marked v18 在未启用 `async` 选项时同步返回字符串，`useMemo` 中直接使用安全

### ✅ 3.3 工具栏设计完善

- 覆盖 14 种常用 Markdown 语法元素
- 按功能分组（撤销 / 标题 / 强调 / 列表 / 代码 / 视图），用分隔线视觉划分
- 使用 `onMouseDown` + `preventDefault` 防止按钮点击导致 textarea 失焦
- 所有按钮带 `title` 提示
- `flex-wrap` 适配窄屏自动换行

### ✅ 3.4 光标操作精准

`insertAtCursor` 和 `insertAtLineStart` 两个核心函数算法正确：

- **测试验证**：行首定位 `lastIndexOf('\n', start - 1) + 1` 在光标位于第 0 位、行首、行中三种场景均正确
- **测试验证**：选中文本包裹后光标恢复位置精准（`start + before.length` 到 `start + before.length + text.length`）
- **测试验证**：Tab 键插入 2 空格后光标位置正确

### ✅ 3.5 历史栈基本可用

- 200 条上限防止内存膨胀
- 撤销后输入会丢弃被跳过的分支（标准撤销树行为）
- **测试验证**：清空操作可撤销恢复

### ✅ 3.6 安全意识

- 使用 `DOMPurify` 而非 `dangerouslySetInnerHTML` 直接注入
- 导出的 HTML 内容来源于已 sanitize 的 `renderedHtml`
- `spellCheck={false}` 关闭拼写检查，避免代码/Markdown 语法被标记

### ✅ 3.7 视觉与样式

- 编辑区使用等宽字体（`SF Mono` 系列），适合代码编辑
- 预览区样式完整覆盖 h1-h6、代码、引用、表格、任务列表等
- 响应式断点（640px / 1024px）调整 padding 和最小高度
- 自定义滚动条样式，视觉统一

### ✅ 3.8 容错处理

- `navigator.clipboard.writeText` 失败时回退到 `document.execCommand('copy')`
- `getStoredTheme` 用 try-catch 防止 localStorage 异常

---

## 四、不足与问题分析

按严重程度分级：**🔴 P0 严重 / 🟠 P1 重要 / 🟡 P2 改进 / ⚪ P3 优化**

### 🔴 4.1 DOMPurify 在 SSR 环境抛错（P0）

**位置**：`MarkdownEditor.jsx:56-60`

```javascript
const renderedHtml = useMemo(() => {
  if (!markdown.trim()) return '';
  const raw = marked.parse(markdown);
  return DOMPurify.sanitize(raw);  // ← SSR 环境抛错
}, [markdown]);
```

**问题**：组件虽标记了 `'use client'`，但 Next.js 仍会在服务端预渲染客户端组件。`DOMPurify` 依赖 `window` 对象，在 Node 环境下 `DOMPurify.sanitize` 不是函数。

**测试证据**：
```
[测试组 A] DOMPurify 在无 window 环境下的行为
  抛出错误类型: TypeError
  错误信息: DOMPurify.sanitize is not a function
```

**影响**：
- 服务端预渲染时若 `markdown` 非空（如未来加入从 URL 读取初始内容），页面崩溃
- 当前初始 `markdown=''` 因短路返回躲过此问题，但属于"巧合性正确"
- Hydration 阶段若状态不同步可能报错

**修复建议**：
```javascript
const renderedHtml = useMemo(() => {
  if (!markdown.trim()) return '';
  if (typeof window === 'undefined') return '';  // SSR 防护
  const raw = marked.parse(markdown);
  return DOMPurify.sanitize(raw);
}, [markdown]);
```

或使用 `jsdom` 创建的 DOMPurify 实例，或改用 `isomorphic-dompurify`。

---

### 🟠 4.2 中文词数统计严重失真（P1）

**位置**：`MarkdownEditor.jsx:250-253`

```javascript
const wordCount = useMemo(() => {
  if (!markdown.trim()) return 0;
  return markdown.trim().split(/\s+/).length;  // ← 中文整段算 1 词
}, [markdown]);
```

**问题**：中文文本通常无空格分隔，整段 23 字的中文会被算作 1 个"词"。

**测试证据**：
```
纯中文段落: 词数=1, 字符数=23, 中文字符=23
中英混合: 词数=6, 字符数=25, 中文字符=6
纯英文: 词数=9, 字符数=43, 中文字符=0
```

**影响**：对中文用户而言，"23 字内容显示 1 词"完全无参考价值，统计功能形同虚设。

**修复建议**：采用混合统计（中文字符数 + 英文词数）：
```javascript
const wordCount = useMemo(() => {
  if (!markdown.trim()) return 0;
  const text = markdown.trim();
  const cnChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const enWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
  return cnChars + enWords;
}, [markdown]);
```

---

### 🟠 4.3 Tab 键污染历史记录（P1）

**位置**：`MarkdownEditor.jsx:244-247`

```javascript
if (e.key === 'Tab') {
  e.preventDefault();
  insertAtCursor('  ', '', '');  // ← 内部调用 pushHistory
}
```

**问题**：每次按 Tab 都通过 `insertAtCursor` → `pushHistory` 创建一条历史记录。用户按 3 次 Tab 后想撤销，需要按 3 次 `Ctrl+Z`。

**影响**：历史记录被细碎的空格操作淹没，撤销体验差。同理，单字符输入也是每次按键一条历史（这是更普遍的问题）。

**修复建议**：
- Tab 操作单独处理，不调用 `pushHistory`，或合并到上一条历史
- 更好的方案：引入**防抖历史**，连续输入（<500ms 间隔）合并为一条历史
- 至少应为 Tab、分割线等"原子操作"提供单独的历史合并逻辑

---

### 🟡 4.4 "复制 HTML" 语义与用户预期不符（P2）

**位置**：`MarkdownEditor.jsx:171-186`

```javascript
const handleCopyHtml = useCallback(() => {
  const html = renderedHtml;
  navigator.clipboard.writeText(html).then(...)  // ← writeText 复制纯文本
}, [renderedHtml]);
```

**问题**：`navigator.clipboard.writeText` 复制的是**纯文本字符串**（即 HTML 源码），而非富文本。用户看到"复制 HTML"按钮，期望的是复制后可粘贴到 Word/WPS 带格式的富文本。

**影响**：用户复制后粘贴到 Word，看到的是 `<h1>标题</h1><p>...</p>` 这样的源码，而非渲染后的格式。

**修复建议**：使用 `ClipboardItem` 同时写入 `text/html` 和 `text/plain`：
```javascript
const handleCopyHtml = useCallback(async () => {
  const blob = new Blob([renderedHtml], { type: 'text/html' });
  const textBlob = new Blob([renderedHtml], { type: 'text/plain' });
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
    ]);
    setCopiedHtml(true);
  } catch { /* 回退 */ }
}, [renderedHtml]);
```

---

### 🟡 4.5 无内容持久化（P2）

**问题**：编辑器内容仅存于 React state，刷新页面、意外关闭标签页均会丢失所有内容。

**对比**：同项目的 `novel-formatter` 同样无持久化，但小说排版是"输入→处理→输出"的一次性流程，可接受；而 Markdown 编辑器是"持续编辑"场景，丢失代价更高。

**修复建议**：使用 `localStorage` 或 `sessionStorage` 自动保存：
```javascript
useEffect(() => {
  const saved = localStorage.getItem('md-editor-content');
  if (saved) setMarkdown(saved);
}, []);
useEffect(() => {
  const t = setTimeout(() => localStorage.setItem('md-editor-content', markdown), 500);
  return () => clearTimeout(t);
}, [markdown]);
```

---

### 🟡 4.6 无代码语法高亮（P2）

**问题**：`marked` 默认不对代码块进行语法高亮，预览区的代码块全部是单色文本。

**对比**：主流 Markdown 编辑器（Typora、VS Code 预览、GitHub）均支持语法高亮。

**修复建议**：集成 `highlight.js` 或 `Prism.js`：
```javascript
import hljs from 'highlight.js';
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  }
});
```

---

### 🟡 4.7 缺少编辑/预览滚动同步（P2）

**问题**：分屏模式下，编辑区与预览区各自独立滚动，滚动一边时另一边不联动。

**对比**：同项目的 `novel-formatter` 实现了三面板同步滚动（`useSyncScroll.js`），技术已存在但未复用。

**修复建议**：参考 `novel-formatter/hooks/useSyncScroll.js` 的比例映射方案，为编辑器和预览区添加同步滚动。

---

### 🟡 4.8 可访问性（a11y）不足（P2）

**问题**：
- 工具栏按钮仅有 `title`，缺少 `aria-label` 或 `aria-keyshortcuts`
- 视图模式切换按钮无 `role="group"` 和 `aria-pressed`
- textarea 缺少 `aria-label`
- 无键盘焦点可见状态（focus-visible）
- 颜色对比度未验证（如 `text-gray-300` 占位符在白底上对比度不足）

**影响**：屏幕阅读器用户、键盘用户使用困难。

---

### 🟡 4.9 移动端工具栏体验差（P2）

**问题**：工具栏 14+ 按钮 + 分隔符，在窄屏（<640px）下 `flex-wrap` 会换行成 3-4 行，挤占编辑区空间。按钮文字（"编辑"/"分屏"/"预览"）在 <640px 时通过 `hidden sm:inline` 隐藏，但图标按钮仍密集。

**修复建议**：窄屏下折叠为"更多"菜单，或仅保留核心按钮（加粗/斜体/标题/列表）。

---

### ⚪ 4.10 isUndoRedo 守卫冗余（P3）

**位置**：`MarkdownEditor.jsx:54, 65, 86, 90, 95, 99`

```javascript
const [isUndoRedo, setIsUndoRedo] = useState(false);
const pushHistory = useCallback((value) => {
  if (isUndoRedo) return;  // ← 守卫
  ...
}, [historyIndex, isUndoRedo]);
```

**问题**：撤销/重做通过 `setMarkdown(history[newIndex])` 程序化设置 value，**不会触发 textarea 的 `onChange` 事件**，因此 `handleChange` 不会被调用，`pushHistory` 自然也不会被调用。`isUndoRedo` 守卫是多余的。

**影响**：无害但增加代码复杂度，且 `pushHistory` 依赖 `isUndoRedo` 导致 `useCallback` 频繁重建。

---

### ⚪ 4.11 空文档插入分割线/代码块多空行（P3）

**位置**：`MarkdownEditor.jsx:146, 143`

```javascript
const handleHr = useCallback(() => insertAtCursor('\n---\n', '', ''), [insertAtCursor]);
const handleCodeBlock = useCallback(() => insertAtCursor('\n```\n', '\n```\n', '代码块'), [insertAtCursor]);
```

**问题**：在空文档或行首插入时，`\n---\n` 会产生开头空行。预览时空行渲染为空段落。

**测试证据**：
```
空文档插入分割线 -> "\n---\n"（开头有空行）
行首插入分割线 -> "\n---\nabc"（行首多了空行）
```

**修复建议**：根据光标位置智能判断是否需要前置换行：
```javascript
const handleHr = useCallback(() => {
  const ta = textareaRef.current;
  const start = ta.selectionStart;
  const needsNewline = start > 0 && markdown[start - 1] !== '\n';
  insertAtCursor(needsNewline ? '\n---\n' : '---\n', '', '');
}, [insertAtCursor, markdown]);
```

---

### ⚪ 4.12 historyIndex 硬编码魔法数字（P3）

**位置**：`MarkdownEditor.jsx:73`

```javascript
setHistoryIndex(prev => {
  const newIndex = Math.min(prev + 1, 199);  // ← 199 硬编码
  return newIndex;
});
```

**问题**：`199` 与 `200`（第 69 行的 `if (newHistory.length > 200)`）耦合，修改上限需改两处。

**测试验证**：当前逻辑在 200 上限场景下自洽（`historyIndex` 始终指向最后一个元素），但硬编码是代码异味。

**修复建议**：提取常量 `const HISTORY_LIMIT = 200;`。

---

### ⚪ 4.13 缺少进阶功能（P3）

与主流 Markdown 编辑器对比，缺少以下功能（按优先级）：

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 自动保存 | 高 | 见 4.5 |
| 代码语法高亮 | 高 | 见 4.6 |
| 滚动同步 | 中 | 见 4.7 |
| 拖拽/粘贴上传图片 | 中 | 当前仅支持图片 URL |
| 全屏编辑 | 中 | 长文档编辑体验 |
| 查找替换 | 中 | `Ctrl+F` |
| 目录（TOC） | 低 | 长文档导航 |
| 数学公式（KaTeX） | 低 | 技术文档 |
| 多文档标签 | 低 | 同时编辑多篇 |
| 字数目标 | 低 | 写作场景 |
| 快捷键帮助 | 低 | 快捷键面板 |
| 导出 PDF | 低 | 打印场景 |

---

### ⚪ 4.14 marked 配置耦合全局（P3）

**位置**：`MarkdownEditor.jsx:20-23`

```javascript
marked.setOptions({
  breaks: true,
  gfm: true,
});
```

**问题**：`marked.setOptions` 是全局配置，会影响项目内所有使用 `marked` 的代码。若未来其他工具（如 `html-editor`）需要不同配置，会相互污染。

**修复建议**：使用 `new Marked()` 创建实例：
```javascript
const md = new Marked({ breaks: true, gfm: true });
const raw = md.parse(markdown);
```

---

## 五、测试结果汇总

### 5.1 测试脚本

| 脚本 | 测试组数 | 用例数 | 通过 | 失败 |
|------|----------|--------|------|------|
| `test-md-editor.mjs` | 14 | 25 | 23 | 2 |
| `test-md-editor-2.mjs` | 11 | 17 | 17 | 0 |
| **合计** | **25** | **42** | **40** | **2** |

### 5.2 关键测试发现

| 测试项 | 结果 | 说明 |
|--------|------|------|
| `marked.parse` 同步返回 | ✅ | v18 默认同步，`useMemo` 使用安全 |
| DOMPurify SSR 抛错 | ❌ | `TypeError: sanitize is not a function` |
| 中文词数统计 | ❌ | 23 字中文算作 1 词 |
| 行首插入定位 | ✅ | 三种光标位置均正确 |
| 光标恢复 | ✅ | 包裹选区后光标精准 |
| Tab 键光标 | ✅ | 插入后光标在空格后 |
| 历史记录上限 | ✅ | 200 条限制生效 |
| 撤销后输入 | ✅ | 分支正确丢弃 |
| 清空可撤销 | ✅ | 历史记录空字符串 |
| GFM 表格/任务列表 | ✅ | marked 渲染正确 |
| breaks 选项 | ✅ | 单换行渲染为 `<br>` |

### 5.3 运行测试脚本

```bash
cd D:\11111111111111111111\novel-formatter
node test-md-editor.mjs
node test-md-editor-2.mjs
```

---

## 六、改进建议优先级

| 优先级 | 问题 | 建议工作量 |
|--------|------|-----------|
| 🔴 P0 | 4.1 DOMPurify SSR 防护 | 5 分钟 |
| 🟠 P1 | 4.2 中文词数统计 | 10 分钟 |
| 🟠 P1 | 4.3 Tab 键历史污染 | 30 分钟（含历史防抖） |
| 🟡 P2 | 4.4 复制 HTML 富文本 | 15 分钟 |
| 🟡 P2 | 4.5 localStorage 持久化 | 20 分钟 |
| 🟡 P2 | 4.6 代码语法高亮 | 30 分钟 |
| 🟡 P2 | 4.7 滚动同步 | 40 分钟 |
| 🟡 P2 | 4.8 可访问性 | 1 小时 |
| 🟡 P2 | 4.9 移动端工具栏 | 30 分钟 |
| ⚪ P3 | 4.10-4.14 代码质量 | 共 1 小时 |

---

## 七、总结

### 综合评价

该 Markdown 编辑器是一个**功能完整、设计清晰的 MVP 级实现**。在 439 行代码内实现了编辑器核心能力（编辑、预览、导出、撤销、快捷键），代码结构整洁，复用了项目既有的主题系统，与工具箱整体风格一致。

### 核心优点

1. **架构清晰**：单组件自包含，接入路由零成本
2. **渲染管线标准**：marked + DOMPurify 业界标配
3. **工具栏完善**：14 种语法元素 + 3 种视图模式
4. **光标算法正确**：经测试验证行首定位、选区包裹、光标恢复均准确
5. **安全意识**：DOMPurify 防护 + 容错回退

### 主要不足

1. **SSR 安全隐患**（P0）：DOMPurify 在服务端抛错，当前靠"初始空内容"侥幸躲过
2. **中文支持缺陷**（P1）：词数统计对中文完全失效
3. **历史记录粗糙**（P1）：Tab、单字符均污染历史，撤销体验差
4. **缺少持久化**（P2）：刷新即丢失
5. **缺少代码高亮**（P2）：代码块单色显示
6. **缺少滚动同步**（P2）：分屏体验割裂

### 横向对比

与同项目 `novel-formatter` 对比：
- ✅ 复用了主题系统、`page.jsx` 路由模式、`registry.js` 注册
- ❌ 未复用 `useSyncScroll`（已存在的同步滚动能力）
- ❌ 未采用 `novel-formatter` 的组件拆分模式（编辑器拆为 `EditorPanel`/`OutputPanel`/`ActionBar` 等），所有逻辑集中在单文件

### 建议路线图

**短期（1-2 天）**：修复 P0（SSR 防护）+ P1（词数统计、历史防抖）
**中期（1 周）**：补齐 P2（持久化、代码高亮、滚动同步、复制富文本）
**长期**：考虑组件拆分 + 进阶功能（图片上传、查找替换、TOC）

---

## 附录：检测文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/tools/markdown-editor/MarkdownEditor.jsx` | 439 | 主组件 |
| `src/tools/markdown-editor/styles.css` | 291 | 样式 |
| `src/app/markdown-editor/page.jsx` | 11 | 路由入口 |
| `src/shell/ThemeProvider.jsx` | 99 | 主题上下文（复用） |
| `src/tools/registry.js` | 50 | 工具注册（复用） |
| `test-md-editor.mjs` | - | 测试脚本 1 |
| `test-md-editor-2.mjs` | - | 测试脚本 2 |

---

*报告生成时间：2026-07-13 18:48*
