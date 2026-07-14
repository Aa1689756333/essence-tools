# ToolBox 项目修复优化计划

> **制定日期**：2026-07-14
> **覆盖范围**：整个 ToolBox 项目（应用外壳 + 三个工具）
> **核心目标**：修复全面审查发现的安全、可靠性、性能、架构、体验问题，分阶段实施，每阶段可独立验收
> **参考依据**：对 `src/` 全部源码的逐文件审查

---

## 一、改进原则

1. **安全优先**：XSS、数据丢失等硬伤先于体验问题
2. **不破坏现有功能**：每个修复点附带回归验证清单，避免修 A 坏 B
3. **先收敛再优化**：P0/P1 修复缺陷，P2/P3 再做架构与体验升级
4. **复用已有能力**：项目已装 DOMPurify、已有 `useSyncScroll`/`countWords` 等实现，优先复用而非重造
5. **渐进重构**：大文件（HtmlEditor 1899 行）按职责逐步拆分，不做一次性大重写

---

## 二、问题总览

| 级别 | 编号 | 问题 | 模块 |
|------|------|------|------|
| 🔴 P0 | #1 | cleanHtml 漏洞，XSS 防护不完整 | html-editor |
| 🔴 P0 | #2 | 自动保存无容量保护，QuotaExceededError 中断 | html/markdown |
| 🟠 P1 | #3 | 排版假进度且同步阻塞 UI | novel-formatter |
| 🟠 P1 | #4 | 小说排版器缺自动保存 | novel-formatter |
| 🟠 P1 | #5 | 同步滚动比例映射导致内容不等长时错位 | novel-formatter |
| 🟡 P2 | #6 | 三工具重复代码未抽取（ToolbarBtn/Modal/countWords/自动保存） | 全局 |
| 🟡 P2 | #7 | 大文本性能：overlay 重建、mousemove 无节流、匹配双重循环 | novel-formatter |
| 🟡 P2 | #8 | HtmlEditor 单文件 1899 行，职责过载 | html-editor |
| 🟢 P3 | #9 | 首页客户端组件，SEO 不友好 | app |
| 🟢 P3 | #10 | a11y 欠缺（空按钮、无 aria-label、对比度） | shell |
| 🟢 P3 | #11 | 移动端布局局促 | 全局 |
| 🟢 P3 | #12 | 工程规范缺失（lint/测试/engines/备份目录） | 全局 |
| 🟢 P3 | #13 | 细节：color 映射不匹配、execCommand 废弃、占位按钮 | 多处 |

---

## 三、P0 严重问题（安全 / 数据可靠性）

### #1 cleanHtml 漏洞，XSS 防护不完整 🔴

**问题定位**：`src/tools/html-editor/HtmlEditor.jsx:90` `cleanHtml()`

**现状缺陷**：

| 遗漏向量 | 说明 |
|----------|------|
| `<script>`/`<iframe>`/`<object>`/`<embed>`/`<svg>` | 未移除危险标签 |
| `style` 中 `expression()`、`url(javascript:)` | CSS 注入 |
| 粘贴/源码模式的 `<a href="javascript:...">` | `isSafeUrl` 仅手动插入链接时调用，粘贴路径不校验 |
| `<img src>` / `<iframe src>` | 未校验 src 协议 |

**影响**：粘贴恶意网页内容或源码模式注入 `<script>`，导出的 HTML 文件被他人打开即触发存储型 XSS。

**修复方案**：用 DOMPurify（项目已装，Markdown 编辑器在用）替换自研 `cleanHtml` 的「安全过滤」职责，保留其「格式清理」职责（font→span、center→div、去空包装）。

```js
import DOMPurify from 'dompurify';

// 白名单：富文本编辑器允许的标签/属性
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p','div','span','b','i','u','s','strong','em','br','hr',
    'h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code',
    'a','img','table','thead','tbody','tr','td','th','caption','colgroup','col'],
  ALLOWED_ATTR: ['href','src','alt','title','style','align','colspan','rowspan',
    'target','rel','width','height'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script','iframe','object','embed','svg','form','input','style'],
  FORBID_ATTR: ['onerror','onclick','onload','onmouseover','onfocus','onblur'],
};

function sanitizeHtml(html) {
  if (typeof window === 'undefined') return html; // SSR 防护
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

// cleanHtml 改为：先 sanitize 再做格式清理（font→span 等）
function cleanHtml(html) {
  if (!html) return '';
  const safe = sanitizeHtml(html);
  const container = document.createElement('div');
  container.innerHTML = safe;
  // …保留原有 font→span / center→div / 去空包装逻辑…
  return container.innerHTML;
}
```

同时为 `isSafeUrl` 增加对 `src` 属性的统一校验（img/iframe 插入与粘贴均走校验）。

**验收标准**：
- [ ] 粘贴含 `<script>alert(1)</script>` 的内容，script 被移除
- [ ] 源码模式输入 `<img src=x onerror=alert(1)>`，onerror 被移除
- [ ] 粘贴 `<a href="javascript:alert(1)">x</a>`，href 被清除或标签被移除
- [ ] 导出 HTML 文件中不含 `on*` 属性与危险标签
- [ ] 正常富文本（粗体/图片/表格/链接）功能不受影响

**工作量**：约 1.5 小时

---

### #2 自动保存无容量保护 🔴

**问题定位**：
- `src/tools/markdown-editor/MarkdownEditor.jsx:215`（自动保存）
- `src/tools/html-editor/HtmlEditor.jsx`（自动保存，base64 图片）

**现状缺陷**：
- Markdown 编辑器 `localStorage.setItem` 无 `try/catch`，超 5MB 配额抛 `QuotaExceededError`，中断后续逻辑
- HTML 编辑器存 base64 图片更易超配额
- 隐私模式/禁用 localStorage 时直接崩溃

**修复方案**：抽取统一的 `safeStorage` 工具，封装读/写/删与异常处理。

```js
// src/lib/storage.js
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    // QuotaExceededError 或隐私模式
    return { ok: false, reason: e.name, quota: true };
  }
}

export function safeGetItem(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function safeRemoveItem(key) {
  try { localStorage.removeItem(key); }
  catch { /* noop */ }
}
```

两个编辑器的自动保存调用 `safeSetItem`，超配额时：
- 清除旧内容重试一次（避免历史大文档占满）
- 仍失败则顶部条提示「内容过大，自动保存已暂停」，不阻断编辑

**验收标准**：
- [ ] 注入超 5MB 内容不再抛未捕获异常
- [ ] 隐私模式下编辑器正常使用（自动保存静默失败）
- [ ] 配额超限时 UI 有可见提示
- [ ] 正常保存/恢复正常工作

**工作量**：约 1 小时

---

## 四、P1 较严重问题（可靠性 / 功能缺陷）

### #3 排版假进度且同步阻塞 UI 🟠

**问题定位**：`src/tools/novel-formatter/NovelFormatter.jsx:116` `handleFormat`

**现状缺陷**：
- `format(raw)` 同步执行，几十万字会卡死主线程数秒
- 4 个 `setTimeout`（每段 700ms）播放与实际处理**无关**的进度动画，小文本也要等 ~3.2 秒

**修复方案（分两步）**：

**步骤 A — 进度与实际处理对齐**：
- 小文本（< 5 万字）：`format` 同步执行后立即出结果，进度动画压缩到 ~600ms 或直接跳过
- 大文本（≥ 5 万字）：保留进度动画，但 `format` 移到 `setTimeout`/微任务中执行，让进度 UI 先渲染

**步骤 B — Web Worker（可选，大文本终极方案）**：
- 将 `formatter.js` 移入 Worker，主线程 postMessage 触发，Worker 完成后回传
- 进度按真实阶段（字符级→标点→空格→段落）回调

```js
// 简化版：先做步骤 A
const handleFormat = useCallback(() => {
  const raw = textareaRef.current?.value || '';
  if (!raw.trim()) { /* 提示 */ return; }

  const isLarge = raw.length > 50000;
  setIsProcessing(true);
  setActivePhase(0);

  if (!isLarge) {
    // 小文本：直接算，短动画
    const formatted = format(raw);
    setTimeout(() => {
      setFormattedText(formatted);
      finalizeStats(raw, formatted);
      setIsProcessing(false);
    }, 500);
    return;
  }
  // 大文本：分阶段动画 + 微任务执行
  // …
}, []);
```

**验收标准**：
- [ ] 小文本（1 万字）排版 < 1 秒出结果
- [ ] 大文本（50 万字）不卡死 UI，进度可见
- [ ] 进度阶段与文案对应真实处理阶段

**工作量**：步骤 A 约 1 小时；步骤 B（Worker）约 3 小时

---

### #4 小说排版器缺自动保存 🟠

**问题定位**：`src/tools/novel-formatter/NovelFormatter.jsx`（无自动保存逻辑）

**现状缺陷**：与 HTML/Markdown 编辑器不一致，用户排版上千行后误刷新全丢。

**修复方案**：
- 复用 #2 的 `safeSetItem`，2 秒防抖保存 `inputText` 到 `localStorage('nf-input')`
- 启动检测，有未保存内容时弹恢复 Modal（复用 Markdown 编辑器的 Modal 模式）
- 清空操作时同步清除存储

**验收标准**：
- [ ] 输入文本 2 秒后刷新，重新进入提示恢复
- [ ] 点击清空后刷新，不再提示
- [ ] 与其他两个编辑器的恢复交互一致

**工作量**：约 1 小时（依赖 #2 的 storage 工具）

---

### #5 同步滚动比例映射导致错位 🟠

**问题定位**：`src/tools/novel-formatter/hooks/useSyncScroll.js`

**现状缺陷**：用 `scrollRatio` 比例映射，但排版后行数变化（去重、合并空行、章节标题加空行），输入输出长度不再对应，滚动到中部明显错位。项目已有 `data-input-line` 精确匹配能力却未用于滚动。

**修复方案**：混合策略——优先用行匹配锚点，比例映射作兜底。

```
输入滚动 → 找到输入视口中间行号 → 查对应输出行（data-input-line）
         → 若命中：输出滚到该行顶部
         → 若未命中：回退比例映射
```

实现要点：
- 缓存输入行号 → 输出行 DOM 的 Map（`outputRef` 内 `p[data-input-line]`）
- 取输入视口中央行（`scrollTop + clientHeight/2` 对应的 `.line`）
- 查 Map 命中则 `outputLine.scrollIntoView` 或计算 offset

**验收标准**：
- [ ] 排版含去重/章节空行的文本，滚动到中部左右对齐
- [ ] 顶部/底部滚动不抖动、不回弹
- [ ] 鼠标悬停高亮与滚动位置一致

**工作量**：约 2 小时

---

## 五、P2 中等问题（架构 / 性能）

### #6 三工具重复代码未抽取 🟡

**问题定位**：Markdown 与 HTML 编辑器各自实现同名逻辑

| 重复项 | 目标位置 |
|--------|----------|
| `ToolbarBtn` / `ToolbarDivider` | `src/components/Toolbar.jsx` |
| `Modal` | `src/components/Modal.jsx` |
| `countWords`（中文单字+英文单词） | `src/lib/textUtils.js` |
| 自动保存/恢复逻辑 | `src/hooks/useAutoSave.js` |
| `safeStorage`（#2 产出） | `src/lib/storage.js` |

**修复方案**：逐项抽取为公共模块，两个编辑器改为 import。每抽一项即替换一处、回归测试，避免一次性大改。

**验收标准**：
- [ ] 抽取后两编辑器行为一致（字数统计、Modal 样式、自动保存）
- [ ] 后续修改只需改一处
- [ ] 无新增 bug（逐项验证）

**工作量**：约 2 小时（依赖 #2）

---

### #7 大文本性能优化 🟡

**问题定位**：
- `NovelFormatter.jsx:42` overlay 每次输入重建全部 DOM
- `useHighlight.js:22` mousemove 遍历所有行调 `getBoundingClientRect`，无节流
- `NovelFormatter.jsx:59` `outputParagraphs` 双重循环匹配

**修复方案**：

1. **overlay 增量更新**：用 React 声明式渲染替换 `innerHTML` 重建（inputText → 行数组 → `.line` 列表），交给 React diff
2. **mousemove 节流**：`requestAnimationFrame` 节流，二分查找定位行（行 offset 已排序可缓存）
3. **匹配算法**：输入归一化结果预计算为 Map（norm → 行号），输出行 O(1) 查找

**验收标准**：
- [ ] 1 万行文本输入无明显卡顿
- [ ] mousemove 在大文本下流畅
- [ ] 排版后高亮联动准确

**工作量**：约 3 小时

---

### #8 HtmlEditor 单文件拆分 🟡

**问题定位**：`src/tools/html-editor/HtmlEditor.jsx`（1899 行）

**拆分方案**（按职责）：

```
html-editor/
├── HtmlEditor.jsx          # 主组件（状态编排，<300 行）
├── Toolbar.jsx             # 工具栏 + 调色板 + 字体字号
├── EditorArea.jsx          # contentEditable 编辑区 + 图片手柄
├── TableMenu.jsx           # 表格右键菜单
├── FindReplace.jsx         # 查找替换面板
├── modals/
│   ├── LinkModal.jsx
│   ├── ImageModal.jsx
│   └── TableModal.jsx
├── lib/
│   ├── cleanHtml.js        # #1 产出的 sanitize + 清理
│   └── formatHtml.js       # HTML 美化
└── styles.css
```

**原则**：纯结构调整，不改逻辑，逐文件迁移 + 回归。

**验收标准**：
- [ ] 拆分后所有功能不变（格式化/图片/表格/查找替换/源码/导出/自动保存）
- [ ] 单文件 < 400 行
- [ ] `next build` 通过

**工作量**：约 3 小时

---

## 六、P3 轻微问题（体验 / 规范）

### #9 首页 SEO 优化 🟢

**问题定位**：`src/app/page.jsx` 顶部 `'use client'`，整页客户端渲染

**修复方案**：
- 首页改服务端组件，工具卡片服务端渲染
- 分类切换抽成客户端子组件 `CategoryTabs.jsx`
- 补 `app/sitemap.js`、`app/robots.js`、layout 的 Open Graph 元数据

**工作量**：约 1.5 小时

---

### #10 可访问性 🟢

**问题定位**：`src/shell/Topbar.jsx`（空按钮）、`ToolCard.jsx`、占位文字

**修复方案**：
- 移除或补功能的 Search/Bell 按钮，补 `aria-label`
- 工具卡片 Link 补 `aria-label={tool.name}`
- 占位文字对比度提至 `text-gray-400`
- 编辑器工具栏按钮已有 `aria-label`/`aria-pressed`（Markdown 编辑器），HTML 编辑器对齐

**工作量**：约 1 小时

---

### #11 移动端布局 🟢

**问题定位**：`NovelFormatter.jsx:209`（`max-md:max-h-[42vh]`）

**修复方案**：
- 小说排版器移动端改为上下堆叠 + 可切换面板（输入/输出 tab）
- 工具栏窄屏折叠为「更多」菜单或横向滚动指示

**工作量**：约 2 小时

---

### #12 工程规范 🟢

**修复方案**：
- 添加 `.eslintrc` + `.prettierrc`（Next.js 推荐配置）
- `package.json` 加 `engines` 字段
- `src_vite_backup/` 备份目录移出仓库或删除
- 根目录零散测试脚本（`test-*.mjs`）整合或移入 `tests/`
- 补 `app/sitemap.js`、`app/robots.js`

**工作量**：约 1.5 小时

---

### #13 细节修复 🟢

| 问题 | 定位 | 修复 |
|------|------|------|
| color 映射不匹配 | `registry.js`（rose/amber/violet）vs `ToolCard.jsx` colorMap（pink/lemon/lilac） | ToolCard 的 colorMap 键对齐为 mint/rose/amber/sky/violet，复用 ThemeProvider 配色 |
| execCommand 废弃 | `NovelFormatter.jsx:179` clipboard fallback | 保留作 fallback，主路径用 `navigator.clipboard`（已是） |
| 占位按钮 | `Topbar.jsx` Search/Bell | 补功能或移除 |

**工作量**：约 1 小时

---

## 七、实施计划

### 阶段一：P0 安全修复（立即）

| 任务 | 依赖 | 预计 |
|------|------|------|
| #2 抽 `src/lib/storage.js` + safeSetItem | 无 | 1h |
| #1 cleanHtml 接入 DOMPurify | 无 | 1.5h |
| 两编辑器自动保存接入 safeSetItem | #2 | 0.5h |

**阶段验收**：XSS 攻击向量全部拦截；大内容/隐私模式不崩溃。

### 阶段二：P1 可靠性（近期）

| 任务 | 依赖 | 预计 |
|------|------|------|
| #3 排版进度对齐 + 大文本不阻塞 | 无 | 1h（步骤 A） |
| #4 小说排版器自动保存 | #2 | 1h |
| #5 同步滚动行匹配 | 无 | 2h |

**阶段验收**：三编辑器体验一致（均有自动保存）；排版不卡 UI；滚动不错位。

### 阶段三：P2 架构与性能（中期）

| 任务 | 依赖 | 预计 |
|------|------|------|
| #6 抽公共组件（Toolbar/Modal/countWords/useAutoSave） | #2 | 2h |
| #7 大文本性能（overlay 增量/节流/匹配优化） | 无 | 3h |
| #8 HtmlEditor 拆分 | #6 | 3h |

**阶段验收**：单文件 < 400 行；大文本流畅；公共组件复用。

### 阶段四：P3 体验与规范（后续）

| 任务 | 依赖 | 预计 |
|------|------|------|
| #9 首页 SEO | 无 | 1.5h |
| #10 a11y | 无 | 1h |
| #11 移动端 | 无 | 2h |
| #12 工程规范 | 无 | 1.5h |
| #13 细节 | #6 | 1h |

**阶段验收**：Lighthouse SEO/a11y 评分提升；移动端可用；lint 通过。

---

## 八、风险与回滚

| 风险 | 应对 |
|------|------|
| #1 DOMPurify 白名单过严，误删合法富文本 | 灰度验证：保留旧 cleanHtml 作 `cleanHtmlLegacy`，新函数 `cleanHtml` 上线后对比输出，确认无回归再删旧 |
| #5 行匹配滚动引入新抖动 | 保留比例映射作 fallback 开关，出问题可即时回退 |
| #8 拆分引入隐性 bug | 逐文件迁移，每文件迁移后跑功能回归清单 |
| #3 Worker 改造影响排版结果一致性 | Worker 与主线程 format 输出做全量对比测试 |

每阶段提交独立 commit / 分支，便于按阶段回滚。

---

## 九、全局回归清单（每阶段后执行）

- [ ] `npm run build` 通过，7 页面预渲染成功
- [ ] 三个工具核心功能可用（排版/富文本格式化/Markdown 预览）
- [ ] 主题切换、侧边栏折叠、移动端抽屉正常
- [ ] 自动保存与恢复正常
- [ ] 复制/导出功能正常
- [ ] 无控制台报错

---

## 附：不在本计划范围内（明确排除）

- 国际化（i18n）框架引入——当前全中文硬编码，需求未明确
- 多人协作 / 后端 / 账号系统——项目定位为纯前端本地工具
- 单元测试框架引入——P3 仅整合现有零散脚本，不新建测试体系
