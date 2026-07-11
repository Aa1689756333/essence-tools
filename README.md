# NovelFormatter — 小说智能排版工具

一款面向中文网络小说的纯前端排版引擎，内置 29 条格式化规则，一键将混乱的 TXT 文本规范化为符合中文排版标准的阅读格式。

## 功能特性

- **29 条排版规则**：覆盖全角/半角转换、标点统一、引号状态机、省略号/破折号规范、中英文间距、段落缩进、章节标题识别、段落去重等
- **实时高亮联动**：鼠标悬停输入区或输出区，双向高亮对应的段落/行
- **三面板同步滚动**：输入区、高亮覆盖层、输出区按比例同步滚动
- **一键复制**：排版结果保留完整的空行和换行结构，可直接粘贴到任何编辑器
- **零依赖部署**：纯前端实现，构建产物可部署到任意静态托管服务

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 |
| 构建工具 | Vite 6 |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite` 插件） |
| 语言 | JavaScript (ES Modules) |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

## 项目结构

```
novel-formatter/
├── index.html                 # Vite 入口 HTML
├── package.json               # 项目配置与依赖
├── vite.config.js             # Vite 构建配置
│
└── src/
    ├── main.jsx               # React 入口，挂载 <App />
    ├── App.jsx                # 主组件：状态管理 + 排版调度 + 内容匹配
    ├── index.css              # Tailwind 指令 + 主题色 + 自定义样式
    │
    ├── lib/                   # 核心逻辑（纯函数，无 React 依赖）
    │   ├── formatter.js       # 排版引擎：29 条规则，4 阶段流水线
    │   ├── charUtils.js       # 字符分类工具：CJK/全角/半角/标点判定
    │   └── sampleText.js      # 内置测试文本（覆盖所有规则场景）
    │
    ├── hooks/                 # 自定义 React Hooks
    │   ├── useHighlight.js    # 双向悬停高亮（getBoundingClientRect 精准定位）
    │   └── useSyncScroll.js   # 三面板同步滚动（比例映射 + 防抖锁）
    │
    └── components/            # UI 组件
        ├── EditorPanel.jsx    # 输入面板：textarea + overlay 分层架构
        ├── OutputPanel.jsx    # 输出面板：声明式段落渲染 + data-input-line 匹配
        ├── ActionBar.jsx      # 操作按钮组
        └── DiffStats.jsx      # 排版前后字数统计
```

## 架构设计

### 排版引擎 (`lib/formatter.js`)

排版引擎采用 4 阶段流水线，每条规则按顺序执行，后一条规则的输入是前一条的输出：

**阶段 1 — 字符级转换**（不依赖上下文）

| 规则 | 说明 |
|------|------|
| `fullwidth-number` | 全角数字 → 半角（`０-９` → `0-9`） |
| `fullwidth-letter` | 全角字母 → 半角（`Ａ-Ｚ` → `A-Z`，`ａ-ｚ` → `a-z`） |
| `interpunct-unify` | 间隔号统一（`·` `•` `‧` `・` → `·`） |

**阶段 2 — 标点统一**（基于上下文判断是否在中文语境中）

| 规则 | 说明 |
|------|------|
| `fullwidth-punct` | 中文语境下半角标点 → 全角（保护小数点、时间、URL） |
| `ellipsis-unify` | 省略号统一为 `……`（`...` `。。。` `..。` 等各种变体） |
| `dash-unify` | 破折号统一为 `——`（`--` `---` `–` 等各种变体） |
| `quote-unify` | 引号状态机：`"` → `""`，`'` → `''`（段落边界重置状态） |
| `tilde-unify` | 波浪号统一：数字间或 CJK 旁的 `~` → `～` |
| `connector-unify` | 连接号清理：混合短横/破折号 → 规范破折号 |
| `bookmark-unify` | 书名号：`<<` `>>` → `《` `》` |
| `nested-bookmark` | 嵌套书名号：`《《` → `《〈`，`》》` → `〉》` |
| `vbar-unify` | 竖线统一：CJK 语境中 `\|` → `｜` |
| `repeat-punct` | 重复标点合并：`！！` → `！`，`？？` → `？` |
| `repeat-punct-ext` | 扩展：重复逗号/分号/冒号合并 |

**阶段 3 — 空格处理**

| 规则 | 说明 |
|------|------|
| `space-cjk` | 中英文之间插入空格（pangu 间距） |
| `space-number-unit` | 数字与字母单位间加空格（保护十六进制色码） |
| `no-space-fullwidth` | 全角标点前后去除多余空格 |
| `no-space-cjk` | 中文字符间的多余空格移除 |
| `space-bracket` | 半角括号与 CJK 之间加空格 |
| `space-ampersand` | CJK 语境中 `&` 两侧加空格 |
| `line-breaking` | 拆行保护：修复被换行打断的破折号和省略号 |

**阶段 4 — 段落/行级处理**

| 规则 | 说明 |
|------|------|
| `trim-lines` | 行首行尾去空格（保留全角缩进） |
| `fullwidth-space-norm` | 全角空格规范化（保留段首缩进，正文转半角） |
| `blank-lines` | 合并连续空行（≥3 行 → 2 行） |
| `space-normalize` | 多个半角空格压缩为一个 |
| `auto-indent` | 首行缩进两个全角空格（跳过章节标题和分隔线） |
| `chapter-heading` | 章节标题识别（`第X章/节/卷/回`），自动添加空行间隔 |
| `dedup-paragraphs` | 连续重复段落去重（防盗版 TXT 常见水印） |
| `dialogue-format` | 对话格式规范（`"..."XX说，"..."` 标点修正） |

### 输入面板分层架构 (`components/EditorPanel.jsx`)

输入面板采用 textarea + overlay 分层技术，兼顾原生文本编辑体验和视觉高亮能力：

```
┌─ input-wrapper (relative) ─────────────┐
│                                         │
│  ┌─ textarea (z-index: 2) ───────────┐  │  ← 用户交互层
│  │  color: transparent               │  │     文字透明，光标可见
│  │  caret-color: #4a3728             │  │     接收所有输入/粘贴事件
│  │  -webkit-text-fill-color: transparent │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ highlight-overlay (z-index: 1) ──┐  │  ← 视觉渲染层
│  │  pointer-events: none             │  │     渲染可见文本
│  │  .line.active { background: ... } │  │     悬停行高亮背景
│  │  padding-right: 37px              │  │     补偿滚动条宽度
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

- **textarea** 在最上层捕获输入，文字设为透明（包括 `-webkit-text-fill-color`），仅显示光标
- **overlay** 在 textarea 后方渲染可见文本，`pointer-events: none` 保证鼠标事件穿透到 textarea
- overlay 的 `padding-right: 37px`（20px padding + 17px scrollbar）补偿 textarea 的滚动条宽度，保证两侧文字对齐
- 通过 `useEffect` 监听 `inputText` 变化，实时重建 overlay 的行元素

### 悬停高亮 (`hooks/useHighlight.js`)

- **输入侧**：监听 textarea 的 `mousemove`，通过 `getBoundingClientRect()` 检测鼠标实际 Y 坐标落在 overlay 哪个 `.line` 元素上，避免字符估算的累积漂移
- **输出侧**：监听输出面板的 `mouseover`，通过 `<p data-input-line="N">` 属性反查对应的输入行号
- 匹配算法：`normalizeForMatch()` 将全角转半角并去除标点，按前缀匹配得分（≥2 字符匹配视为有效），从上次匹配位置向后搜索，保证顺序一致性

### 同步滚动 (`hooks/useSyncScroll.js`)

三个可滚动元素按比例映射：

```
scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight)
target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight)
```

- `isSyncing` ref 防止事件递归（A 滚动触发 B 滚动，B 又触发 A）
- `requestAnimationFrame` 在下一帧解锁，保证每帧只同步一次
- overlay 始终锁定到 textarea 的 scrollTop（两者内容完全一致）

## 主题配色

采用暖色纸质阅读风格：

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | `#f5f0e8` | 羊皮纸色 |
| 面板背景 | `#fffef9` | 微黄纸张色 |
| 正文文字 | `#3d3226` | 深棕色 |
| 辅助文字 | `#8b7e6a` | 灰棕色 |
| 强调色 | `#8b5e3c` | 暖棕色 |
| 边框 | `#d4c5b2` | 浅米色 |
| 高亮背景 | `rgba(139, 94, 60, 0.28)` | 半透明棕色 |

## 开发

```bash
# 启动开发服务器（默认 http://localhost:5173）
npm run dev
```

Vite 支持 React Fast Refresh，修改组件代码后浏览器自动热更新。

## 构建与部署

```bash
npm run build
```

产物输出到 `dist/` 目录，包含：
- `index.html`（~0.4 KB）
- `assets/index-*.css`（~10 KB gzip）
- `assets/index-*.js`（~70 KB gzip，含 React 运行时）

可直接部署到 Vercel、Netlify、Cloudflare Pages、GitHub Pages 或任何静态文件服务器。

## 许可

MIT
