# Markdown 编辑器优化改进计划

> **基于文档**：《Markdown编辑器检测报告.md》
> **参考对象**：`src/tools/html-editor/HtmlEditor.jsx`（1900 行）、`src/tools/novel-formatter/`
> **制定日期**：2026-07-13
> **核心目标**：修复检测发现的问题，并与项目内其他工具统一风格，消除割裂感

---

## 一、改进原则

1. **统一风格，不照抄功能**
   - 借鉴 HTML 编辑器的**通用模式**（页面结构、按钮样式、自动保存机制、Modal 组件、全屏、查找替换）
   - **不照搬** HTML 编辑器的**专属实现**（contentEditable、execCommand、ColorPicker、表格右键菜单、HTML 格式化/清理）—— 这些是富文本编辑器特有，与 Markdown 的纯文本 + 渲染管线本质不同
2. **语义正确优先**
   - 删除从 HTML 编辑器误搬过来的"复制 HTML""导出 HTML"——Markdown 编辑器的产物是 Markdown，不是 HTML
3. **分阶段实施**：P0/P1 先行，P2 按价值排序，P3 收尾
4. **复用既有能力**：`novel-formatter` 的 `useSyncScroll` 已验证可用，直接复用而非重造

---

## 二、设计决策修正

### 2.1 删除"复制 HTML"和"导出 HTML"（🔴 设计错误）

**问题定性**：上一个 agent 制作 Markdown 编辑器时，照搬了 HTML 编辑器的底部操作栏，导致出现了语义错误的按钮。

| 按钮 | HTML 编辑器 | Markdown 编辑器 |
|------|------------|----------------|
| 复制 HTML | ✅ 合理（产物就是 HTML） | ❌ 语义混乱（复制的是渲染后 HTML 源码，用户预期不符） |
| 导出 HTML | ✅ 合理（工具名即 HTML） | ❌ 越界（Markdown 编辑器应导出 .md） |

**修正方案**：
- ❌ 删除"复制 HTML"按钮
- ❌ 删除"导出 HTML"按钮
- ✅ 保留"复制 MD"按钮
- ✅ 保留"导出 MD"按钮
- ✅ 底部操作栏精简为：`清空 | 复制 MD | 导出 MD`（主操作）

**理由**：用户明确反馈"只需要复制 md 和导出 md"。Markdown 编辑器的核心产物是 `.md` 文件，HTML 只是中间渲染态，不应作为输出选项。

> **注**：如未来确有"导出渲染后 HTML"的需求，应作为次要功能（如工具栏二级菜单或"导出"下拉项），而非与"导出 MD"并列。

---

## 三、风格对齐分析（与 HTML 编辑器对比）

### 3.1 已经一致的部分（✅ 无需改动）

| 维度 | 现状 | 说明 |
|------|------|------|
| 页面标题 | `<h1 class="text-[22px] font-bold">` + `<p class="text-[13.5px] text-text-secondary">` | 两个编辑器完全一致 |
| 容器 | `rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]` | 完全一致 |
| 工具栏容器 | `border-b border-gray-200 bg-gray-50/80 px-2 sm:px-3 py-2` + `flex items-center gap-0.5 flex-wrap` | 完全一致 |
| `ToolbarBtn` | 30×30 圆角、15×15 图标、相同 className | 两个编辑器定义完全相同（可考虑后续抽公共组件） |
| `ToolbarDivider` | `w-px h-5 bg-gray-200 mx-1` | 完全一致 |
| 底部次级按钮 | `flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px]` | 完全一致 |
| 主操作按钮 | `theme.accent` 背景 + hover 上移 + 阴影 | 完全一致 |
| 空状态提示 | `text-[14px] text-gray-300` | 完全一致 |
| 复制回退 | `navigator.clipboard` 失败 → `execCommand('copy')` | 完全一致 |

### 3.2 需要对齐的差异项

| 差异点 | HTML 编辑器 | Markdown 编辑器（当前） | 对齐方案 |
|--------|------------|----------------------|----------|
| **字数统计** | `${words} 字 / ${chars} 字符`（中文+英文混合） | `${lineCount} 行 · ${wordCount} 词`（中文失真） | 改用 HTML 编辑器的 `countWords` 算法 |
| **自动保存** | localStorage 2 秒防抖 + 启动恢复弹窗 | 无 | 借鉴自动保存机制 |
| **保存状态** | 显示"自动保存于 HH:MM" | 无 | 借鉴 |
| **全屏编辑** | `fixed inset-0 z-[9999]` + Esc 退出 | 无 | 借鉴 |
| **查找替换** | Ctrl+F 面板 + 上/下/替换/全部替换 | 无 | 借鉴（适配纯文本） |
| **Modal 组件** | 统一弹窗（链接/图片/表格） | 无 | 借鉴 Modal 组件用于链接/图片插入 |
| **视图切换位置** | 底部"查看源码/预览"按钮 | 工具栏右侧三视图（编辑/分屏/预览） | **保留 Markdown 现有方式**（三视图更适合 MD） |
| **快捷键** | Ctrl+F、Esc | Ctrl+B/I/Z/Y、Tab | 补充 Ctrl+F、Esc |

### 3.3 不能照抄的边界（⚠️ 避免闹笑话）

以下 HTML 编辑器的功能/实现**严禁**搬到 Markdown 编辑器：

| 功能 | 不能照抄的原因 |
|------|--------------|
| `contentEditable` + `document.execCommand` | Markdown 编辑器基于 textarea + marked 渲染，富文本 API 不适用 |
| `cleanHtml` / `formatHtml` | Markdown 源码就是纯文本，无需 HTML 清理/格式化 |
| `ColorPicker` 颜色选择器 | Markdown 语法无颜色概念（HTML 才有） |
| 表格右键菜单（增删行列） | Markdown 表格是纯文本语法，无法像 HTML 表格那样操作 DOM |
| 图片拖拽缩放手柄 | Markdown 图片是 `![]()` 语法，无 DOM 元素可拖拽 |
| 字体/字号下拉选择 | Markdown 不支持字体字号（HTML 才支持） |
| 对齐按钮（左/中/右/两端） | Markdown 不支持对齐（HTML 才支持） |
| "查看源码"模式 | Markdown 编辑器已有"编辑/分屏/预览"三视图，无需源码模式 |

---

## 四、改进项清单（按优先级）

### 🔴 P0 — 严重问题修复

#### 4.1 DOMPurify SSR 防护

**问题**：`DOMPurify.sanitize` 在服务端预渲染时抛 `TypeError: sanitize is not a function`，当前靠初始空内容侥幸躲过。

**修复**：`MarkdownEditor.jsx:56-60`

```javascript
// 修改前
const renderedHtml = useMemo(() => {
  if (!markdown.trim()) return '';
  const raw = marked.parse(markdown);
  return DOMPurify.sanitize(raw);
}, [markdown]);

// 修改后
const renderedHtml = useMemo(() => {
  if (!markdown.trim()) return '';
  if (typeof window === 'undefined') return '';  // SSR 防护
  const raw = marked.parse(markdown);
  return DOMPurify.sanitize(raw);
}, [markdown]);
```

**工作量**：5 分钟

---

### 🟠 P1 — 重要问题修复

#### 4.2 删除"复制 HTML""导出 HTML"

**修复**：删除 `handleCopyHtml`、`handleExportHtml` 函数及对应按钮，删除 `copiedHtml` state。

**保留**：`handleCopyMarkdown`、`handleExportMd`、`copiedMd`。

**工作量**：10 分钟

#### 4.3 中文词数统计（对齐 HTML 编辑器）

**修复**：直接借鉴 HTML 编辑器的 `countWords` 函数（`HtmlEditor.jsx:160-172`）：

```javascript
// 新增工具函数（与 HTML 编辑器完全一致）
function countWords(text) {
  if (!text) return { words: 0, chars: 0 };
  const chars = text.length;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9-]+/g) || []).length;
  return { words: chineseChars + englishWords, chars };
}

// 替换 wordCount
const wordCount = useMemo(() => countWords(markdown), [markdown]);

// 底部显示改为与 HTML 编辑器一致
{isEmpty ? '暂无内容' : `${wordCount.words} 字 / ${wordCount.chars} 字符`}
```

**对齐效果**：两个编辑器字数统计文案完全一致（`X 字 / X 字符`），消除割裂感。

**工作量**：10 分钟

#### 4.4 历史记录防抖（修复 Tab 污染）

**问题**：每次按键、每次 Tab 都推一条历史，撤销体验差。

**修复方案**：引入防抖合并机制。

```javascript
const historyTimerRef = useRef(null);
const pushHistory = useCallback((value) => {
  if (isUndoRedo) return;
  // 防抖：500ms 内的连续输入合并为一条历史
  if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
  historyTimerRef.current = setTimeout(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(value);
      if (newHistory.length > 200) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, HISTORY_LIMIT - 1));
  }, 500);
}, [historyIndex, isUndoRedo]);
```

**注意**：防抖会导致"撤销"有 500ms 延迟才记录最新状态，需在 `handleUndo`/`handleRedo`/`handleClear`/组件卸载前**立即 flush** 防抖队列。

**工作量**：30 分钟

---

### 🟡 P2 — 体验改进

#### 4.5 localStorage 自动保存（对齐 HTML 编辑器）

**借鉴**：`HtmlEditor.jsx:318-363` 的自动保存 + 恢复弹窗模式。

```javascript
// 启动时检测未保存内容
useEffect(() => {
  const saved = localStorage.getItem('md-editor-content');
  if (saved) {
    setShowRestoreModal(true);
    savedContentRef.current = saved;
  }
}, []);

// 内容变化时 2 秒防抖保存
useEffect(() => {
  const t = setTimeout(() => {
    if (markdown.trim()) {
      localStorage.setItem('md-editor-content', markdown);
      setLastSavedTime(new Date());
    }
  }, 2000);
  return () => clearTimeout(t);
}, [markdown]);
```

**配套**：复用 HTML 编辑器的 `Modal` 组件（`HtmlEditor.jsx:255-273`）做恢复确认弹窗。

**对齐效果**：两个编辑器都有"自动保存于 HH:MM"提示 + 启动恢复弹窗，体验一致。

**注意**：`Modal` 组件目前定义在 `HtmlEditor.jsx` 内部，建议**抽取到公共组件** `src/components/Modal.jsx` 供两个编辑器共用（见 P3 4.12）。

**工作量**：30 分钟

#### 4.6 代码语法高亮

**修复**：集成 `highlight.js`（marked 官方推荐）。

```bash
npm install highlight.js
```

```javascript
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});
```

**工作量**：30 分钟

#### 4.7 编辑/预览滚动同步

**修复**：复用 `novel-formatter/hooks/useSyncScroll.js` 的比例映射方案。

```javascript
import { useSyncScroll } from '@/tools/novel-formatter/hooks/useSyncScroll';
// 注意：useSyncScroll 需要三个 ref（textarea, overlay, output）
// Markdown 编辑器无 overlay，需改造为双 ref 版本，或新建 useSyncScroll2
```

**注意**：`novel-formatter` 的 `useSyncScroll` 是三面板（textarea + overlay + output），Markdown 编辑器是双面板（textarea + preview）。建议**抽取通用版** `src/hooks/useSyncScroll.js` 支持可变数量 ref，两个编辑器共用。

**工作量**：40 分钟

#### 4.8 全屏编辑（对齐 HTML 编辑器）

**借鉴**：`HtmlEditor.jsx:936-938, 1126, 1136` 的全屏模式。

```javascript
const [isFullscreen, setIsFullscreen] = useState(false);

// 容器 className
className={`... ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''}`}

// 工具栏新增按钮
<ToolbarBtn icon={isFullscreen ? Minimize : Maximize} onClick={toggleFullscreen} title={isFullscreen ? '退出全屏 (Esc)' : '全屏编辑'} />

// Esc 退出
useEffect(() => {
  const handler = (e) => {
    if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [isFullscreen]);
```

**对齐效果**：两个编辑器都支持全屏 + Esc 退出。

**工作量**：20 分钟

#### 4.9 查找替换（对齐 HTML 编辑器）

**借鉴**：`HtmlEditor.jsx:994-1098, 1204-1288` 的查找替换面板。

**适配要点**：
- HTML 编辑器基于 `contentEditable`，用 Range API 高亮匹配项
- Markdown 编辑器基于 `textarea`，需改用 `textarea.setSelectionRange()` 高亮 + 滚动定位
- 替换逻辑：textarea 是纯文本，直接字符串替换比 HTML 编辑器简单

```javascript
// Markdown 版查找替换核心逻辑
const performFind = useCallback(() => {
  if (!findText) { setFindMatches([]); return; }
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  const matches = [];
  let m;
  while ((m = regex.exec(markdown)) !== null) {
    matches.push({ index: m.index, length: m[0].length, text: m[0] });
  }
  setFindMatches(matches);
  setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
}, [findText, caseSensitive, markdown]);

const highlightMatch = useCallback((match) => {
  const ta = textareaRef.current;
  if (!ta) return;
  ta.focus();
  ta.setSelectionRange(match.index, match.index + match.length);
  // 滚动到可见区域
  const lineHeight = 24;
  const line = markdown.substring(0, match.index).split('\n').length - 1;
  ta.scrollTop = line * lineHeight - ta.clientHeight / 2;
}, [markdown]);

const replaceCurrent = useCallback(() => {
  if (currentMatchIndex < 0) return;
  const match = findMatches[currentMatchIndex];
  const newText = markdown.substring(0, match.index) + replaceText + markdown.substring(match.index + match.length);
  setMarkdown(newText);
  pushHistory(newText);
  performFind(); // 重新查找
}, [currentMatchIndex, findMatches, replaceText, markdown, performFind, pushHistory]);
```

**UI**：复用 HTML 编辑器的查找替换面板样式（`HtmlEditor.jsx:1204-1288`），Ctrl+F 触发。

**工作量**：1 小时

#### 4.10 可访问性（a11y）补强

- 所有 `ToolbarBtn` 增加 `aria-label`（与 `title` 一致）
- 视图切换按钮组增加 `role="group" aria-label="视图模式"`，各按钮加 `aria-pressed`
- textarea 增加 `aria-label="Markdown 编辑区"`
- 预览区增加 `aria-label="预览区"`、`role="region"`
- 主操作按钮增加 `aria-label`
- 增加 `focus-visible:outline` 样式

**工作量**：30 分钟

#### 4.11 移动端工具栏优化

**问题**：14+ 按钮在窄屏换行成 3-4 行。

**方案**：窄屏（<640px）折叠次要按钮到"更多"菜单：

```javascript
const [showMore, setShowMore] = useState(false);
// 窄屏仅显示：撤销/重做 | 加粗/斜体/标题 | 视图切换
// 其余（列表/引用/代码/链接/图片/分割线/任务）收入"更多"
```

**工作量**：40 分钟

---

### ⚪ P3 — 代码质量与架构

#### 4.12 抽取公共组件

**目标**：消除两个编辑器的重复代码，建立公共组件库。

| 组件 | 来源 | 抽取到 |
|------|------|--------|
| `ToolbarBtn` | 两个编辑器各定义一份 | `src/components/ToolbarBtn.jsx` |
| `ToolbarDivider` | 两个编辑器各定义一份 | `src/components/ToolbarDivider.jsx` |
| `ToolbarSelect` | HTML 编辑器定义 | `src/components/ToolbarSelect.jsx` |
| `Modal` | HTML 编辑器定义 | `src/components/Modal.jsx` |
| `countWords` | HTML 编辑器定义 | `src/lib/textUtils.js` |
| `useSyncScroll` | novel-formatter 定义 | `src/hooks/useSyncScroll.js`（通用版） |

**工作量**：1 小时

#### 4.13 marked 实例化

**问题**：`marked.setOptions` 全局污染。

**修复**：
```javascript
import { Marked } from 'marked';
const md = new Marked({ breaks: true, gfm: true });
// 使用 md.parse(markdown)
```

**工作量**：10 分钟

#### 4.14 删除冗余 isUndoRedo 守卫

**修复**：移除 `isUndoRedo` state 及 `pushHistory` 中的守卫（`setMarkdown` 不触发 `onChange`，守卫无效）。

**注意**：若引入 4.4 的历史防抖，此守卫更无必要。

**工作量**：5 分钟

#### 4.15 historyIndex 硬编码常量化

```javascript
const HISTORY_LIMIT = 200;
// 替换所有 199/200 魔法数字
```

**工作量**：5 分钟

#### 4.16 空文档插入分割线/代码块智能换行

```javascript
const handleHr = useCallback(() => {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const needsNewline = start > 0 && markdown[start - 1] !== '\n';
  insertAtCursor(needsNewline ? '\n---\n' : '---\n', '', '');
}, [insertAtCursor, markdown]);
```

**工作量**：15 分钟

#### 4.17 Tab 键不推历史

```javascript
if (e.key === 'Tab') {
  e.preventDefault();
  // 直接操作 textarea，不调用 pushHistory
  const ta = textareaRef.current;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const newText = markdown.substring(0, start) + '  ' + markdown.substring(end);
  setMarkdown(newText);
  // 依赖防抖历史自动合并
  setTimeout(() => {
    ta.focus();
    ta.setSelectionRange(start + 2, start + 2);
  }, 0);
}
```

**工作量**：15 分钟

---

## 五、实施路线图

### 阶段一：紧急修复（半天）

| 序号 | 改进项 | 优先级 | 工作量 |
|------|--------|--------|--------|
| 1 | 4.1 DOMPurify SSR 防护 | P0 | 5 min |
| 2 | 4.2 删除复制/导出 HTML | P1 | 10 min |
| 3 | 4.3 中文词数统计 | P1 | 10 min |
| 4 | 4.4 历史记录防抖 | P1 | 30 min |
| 5 | 4.14 删除 isUndoRedo 守卫 | P3 | 5 min |
| 6 | 4.15 historyIndex 常量化 | P3 | 5 min |

**阶段产出**：消除致命错误 + 设计错误 + 中文支持缺陷，代码质量提升。

### 阶段二：体验对齐（1-2 天）

| 序号 | 改进项 | 优先级 | 工作量 |
|------|--------|--------|--------|
| 7 | 4.5 localStorage 自动保存 | P2 | 30 min |
| 8 | 4.8 全屏编辑 | P2 | 20 min |
| 9 | 4.7 滚动同步 | P2 | 40 min |
| 10 | 4.6 代码语法高亮 | P2 | 30 min |
| 11 | 4.16 空文档智能换行 | P3 | 15 min |
| 12 | 4.17 Tab 不推历史 | P3 | 15 min |

**阶段产出**：与 HTML 编辑器在自动保存、全屏、滚动同步上体验一致。

### 阶段三：功能补齐（2-3 天）

| 序号 | 改进项 | 优先级 | 工作量 |
|------|--------|--------|--------|
| 13 | 4.9 查找替换 | P2 | 1 h |
| 14 | 4.10 可访问性 | P2 | 30 min |
| 15 | 4.11 移动端工具栏 | P2 | 40 min |
| 16 | 4.13 marked 实例化 | P3 | 10 min |

**阶段产出**：功能完整度对齐 HTML 编辑器，a11y 达标。

### 阶段四：架构统一（1 天）

| 序号 | 改进项 | 优先级 | 工作量 |
|------|--------|--------|--------|
| 17 | 4.12 抽取公共组件 | P3 | 1 h |

**阶段产出**：三个编辑器共享公共组件库，后续维护成本降低，风格永久统一。

---

## 六、统一风格检查清单

改进完成后，两个编辑器应满足以下一致性检查：

### 6.1 视觉一致性
- [ ] 页面标题结构一致（`h1` + `p` 副标题）
- [ ] 容器圆角/边框/阴影一致
- [ ] 工具栏背景/间距/换行行为一致
- [ ] 工具栏按钮尺寸/图标大小/hover 效果一致
- [ ] 底部操作栏按钮样式一致
- [ ] 主操作按钮使用 `theme.accent` 一致
- [ ] 空状态提示文案样式一致
- [ ] 滚动条样式一致

### 6.2 交互一致性
- [ ] 字数统计文案格式一致（`X 字 / X 字符`）
- [ ] 自动保存机制一致（2 秒防抖 + 恢复弹窗）
- [ ] 全屏模式一致（Esc 退出）
- [ ] 查找替换一致（Ctrl+F 触发）
- [ ] 复制/导出回退逻辑一致（clipboard → execCommand）
- [ ] 撤销/重做快捷键一致（Ctrl+Z/Y）

### 6.3 公共组件复用
- [ ] `ToolbarBtn` / `ToolbarDivider` 来自公共组件
- [ ] `Modal` 来自公共组件
- [ ] `countWords` 来自公共工具函数
- [ ] `useSyncScroll` 来自公共 hooks

---

## 七、验收标准

1. **功能验收**：重新运行 `test-md-editor.mjs` 和 `test-md-editor-2.mjs`，原失败项（DOMPurify SSR、中文词数）转为通过
2. **风格验收**：按第六章检查清单逐项核对
3. **回归验收**：手动测试编辑、预览、导出 MD、撤销/重做、自动保存恢复、全屏、查找替换
4. **无照抄验收**：确认未引入 contentEditable、execCommand、ColorPicker、表格右键菜单等 HTML 编辑器专属实现

---

## 八、风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 历史防抖导致撤销延迟 | 中 | 中 | 提供"立即 flush"机制；防抖时间可配置 |
| 自动保存覆盖用户主动清空 | 低 | 中 | 清空时 `localStorage.removeItem`（HTML 编辑器已这么做） |
| 滚动同步在长文档卡顿 | 低 | 低 | 复用 novel-formatter 已验证的方案 + rAF 防抖 |
| 公共组件抽取引发回归 | 中 | 中 | 分支开发，逐个组件迁移，每步测试 |

**回滚策略**：每个阶段独立提交，若某阶段出问题可单独 revert，不影响其他阶段。

---

## 附录：参考文件索引

| 文件 | 用途 |
|------|------|
| `src/tools/html-editor/HtmlEditor.jsx` | 风格参考、countWords/Modal/全屏/查找替换借鉴 |
| `src/tools/html-editor/styles.css` | 样式参考 |
| `src/tools/novel-formatter/hooks/useSyncScroll.js` | 滚动同步复用 |
| `src/tools/markdown-editor/MarkdownEditor.jsx` | 改造对象 |
| `src/tools/markdown-editor/styles.css` | 样式调整 |
| `Markdown编辑器检测报告.md` | 问题来源 |
| `test-md-editor.mjs` / `test-md-editor-2.mjs` | 验收测试 |

---

*计划制定时间：2026-07-13 19:02*
