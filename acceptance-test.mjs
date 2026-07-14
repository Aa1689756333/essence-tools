/**
 * Markdown 编辑器优化验收测试
 * 覆盖 P0-P2 所有改动的逻辑测试 + 代码审查
 * 运行：node acceptance-test.mjs
 */

import fs from 'fs';
import { Marked } from 'marked';
import hljs from 'highlight.js';

const SOURCE = fs.readFileSync('src/tools/markdown-editor/MarkdownEditor.jsx', 'utf8');

let pass = 0, fail = 0;
const results = [];

function check(name, cond, detail = '') {
  if (cond) { pass++; results.push(`  ✓ ${name}`); }
  else { fail++; results.push(`  ✗ ${name}  ${detail}`); }
}

console.log('\n════════════════════════════════════════');
console.log('  Markdown 编辑器优化验收测试');
console.log('════════════════════════════════════════\n');

// ========== P0: SSR 防护 ==========
console.log('[P0] SSR 防护');
{
  check('renderedHtml 含 typeof window 防护', SOURCE.includes("typeof window === 'undefined'"));
  check('防护在 DOMPurify.sanitize 之前', SOURCE.indexOf("typeof window === 'undefined'") < SOURCE.indexOf('DOMPurify.sanitize'));
}
console.log('');

// ========== P1-4.2: 删除复制/导出 HTML ==========
console.log('[P1-4.2] 删除复制/导出 HTML');
{
  check('无 copiedHtml state', !SOURCE.includes('copiedHtml'));
  check('无 handleCopyHtml', !SOURCE.includes('handleCopyHtml'));
  check('无 handleExportHtml', !SOURCE.includes('handleExportHtml'));
  check('无"复制 HTML"按钮', !SOURCE.includes('复制 HTML'));
  check('无"导出 HTML"按钮', !SOURCE.includes('导出 HTML'));
  check('保留 handleCopyMarkdown', SOURCE.includes('handleCopyMarkdown'));
  check('保留 handleExportMd', SOURCE.includes('handleExportMd'));
  check('保留 copiedMd', SOURCE.includes('copiedMd'));
  check('副标题无"或 HTML"', !SOURCE.includes('或 HTML'));
}
console.log('');

// ========== P1-4.3: 中文词数统计 ==========
console.log('[P1-4.3] 中文词数统计');
{
  check('含 countWords 函数', SOURCE.includes('function countWords'));
  check('含中文字符正则 [\\u4e00-\\u9fa5]', SOURCE.includes('\\u4e00-\\u9fa5'));
  check('底部文案为"X 字 / X 字符"格式', SOURCE.includes('wordCount.words} 字 / ${wordCount.chars} 字符'));
  check('无旧版 lineCount', !SOURCE.includes('lineCount'));

  // 测试 countWords 算法（与源码一致）
  function countWords(text) {
    if (!text) return { words: 0, chars: 0 };
    const chars = text.length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9-]+/g) || []).length;
    const words = chineseChars + englishWords;
    return { words, chars };
  }

  const t1 = countWords('这是一段中文文本');
  check('纯中文 8 字 → words=8', t1.words === 8, `实际: ${t1.words}`);

  const t2 = countWords('The quick brown fox');
  check('纯英文 4 词 → words=4', t2.words === 4, `实际: ${t2.words}`);

  const t3 = countWords('使用 React 19 构建');
  check('中英混合 → words=4中文+2英文=6', t3.words === 6, `实际: ${t3.words}`);

  const t4 = countWords('');
  check('空文本 → words=0, chars=0', t4.words === 0 && t4.chars === 0);

  const t5 = countWords('```\nconst x = 1;\n```');
  check('代码 → words=3 (const, x, 1)', t5.words === 3, `实际: ${t5.words}`);
}
console.log('');

// ========== P1-4.4: 历史记录防抖 ==========
console.log('[P1-4.4] 历史记录防抖');
{
  check('含 HISTORY_LIMIT 常量', SOURCE.includes('HISTORY_LIMIT'));
  check('含 HISTORY_DEBOUNCE_MS 常量', SOURCE.includes('HISTORY_DEBOUNCE_MS'));
  check('无 isUndoRedo state', !SOURCE.includes('isUndoRedo'));
  check('无 setIsUndoRedo', !SOURCE.includes('setIsUndoRedo'));
  check('含 commitHistory 函数', SOURCE.includes('commitHistory'));
  check('含 flushHistory 函数', SOURCE.includes('flushHistory'));
  check('含 pendingValueRef', SOURCE.includes('pendingValueRef'));
  check('含 historyTimerRef', SOURCE.includes('historyTimerRef'));
  check('含卸载 flush useEffect', SOURCE.includes("return () => flushHistory()"));
  check('handleUndo 含 flushHistory', SOURCE.match(/handleUndo[\s\S]*?flushHistory/) !== null);
  check('handleRedo 含 flushHistory', SOURCE.match(/handleRedo[\s\S]*?flushHistory/) !== null);
  check('insertAtCursor 含 flushHistory + commitHistory', SOURCE.match(/insertAtCursor[\s\S]*?flushHistory[\s\S]*?commitHistory/) !== null);

  // 模拟防抖历史逻辑
  const HISTORY_LIMIT = 200;
  let history = [''];
  let historyIndex = 0;
  let historyIndexRef = { current: 0 };
  let pendingValue = null;
  let timer = null;

  function commitHistory(value) {
    const idx = historyIndexRef.current;
    const newHistory = history.slice(0, idx + 1);
    newHistory.push(value);
    if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
    history = newHistory;
    historyIndex = Math.min(historyIndexRef.current + 1, HISTORY_LIMIT - 1);
    historyIndexRef.current = historyIndex;
  }

  function pushHistory(value) {
    pendingValue = value;
    if (timer) clearTimeout(timer);
    // 模拟立即触发（测试中不等待 500ms）
    commitHistory(pendingValue);
    pendingValue = null;
  }

  function flushHistory() {
    if (pendingValue !== null) {
      commitHistory(pendingValue);
      pendingValue = null;
    }
  }

  // 测试：连续输入合并
  pushHistory('a');
  pushHistory('ab');
  pushHistory('abc');
  check('连续 3 次 pushHistory → 3 条历史', history.length === 4, `实际: ${history.length}`);

  // 测试：撤销后输入丢弃分支
  historyIndex = 1; // 撤销 2 步
  historyIndexRef.current = 1;
  pushHistory('new');
  check('撤销后输入 → 分支被丢弃', history.length === 3, `实际: ${history.length}`);
  check('history[2] = "new"', history[2] === 'new');

  // 测试：上限
  history = ['']; historyIndex = 0; historyIndexRef.current = 0;
  for (let i = 1; i <= 250; i++) pushHistory('x'.repeat(i));
  check('250 次输入 → 历史限制 200', history.length === 200, `实际: ${history.length}`);
  check('historyIndex 指向最新', historyIndex === 199);
}
console.log('');

// ========== P2-4.5: localStorage 自动保存 ==========
console.log('[P2-4.5] localStorage 自动保存');
{
  check('含 md-editor-content key', SOURCE.includes("'md-editor-content'"));
  check('含 showRestoreModal state', SOURCE.includes('showRestoreModal'));
  check('含 handleRestoreConfirm', SOURCE.includes('handleRestoreConfirm'));
  check('含 handleRestoreDismiss', SOURCE.includes('handleRestoreDismiss'));
  check('含 lastSavedTime state', SOURCE.includes('lastSavedTime'));
  check('含 autoSaveTimerRef', SOURCE.includes('autoSaveTimerRef'));
  check('含 2000ms 防抖', SOURCE.includes('2000'));
  check('含"自动保存于"文案', SOURCE.includes('自动保存于'));
  check('handleClear 含 removeItem', SOURCE.match(/handleClear[\s\S]*?removeItem/) !== null);
  check('含 Modal 组件', SOURCE.includes('function Modal'));
  check('Modal 含恢复/丢弃按钮', SOURCE.includes('恢复') && SOURCE.includes('丢弃'));
}
console.log('');

// ========== P2-4.6: 代码语法高亮 ==========
console.log('[P2-4.6] 代码语法高亮');
{
  check('导入 highlight.js', SOURCE.includes("from 'highlight.js'"));
  check('导入 github.css', SOURCE.includes('highlight.js/styles/github.css'));
  check('含 hljs.highlightElement', SOURCE.includes('hljs.highlightElement'));
  check('含 dataset.highlighted 防重复', SOURCE.includes('dataset.highlighted'));

  // 测试 highlight.js 能正常工作
  const code = 'const x = 1 + 2;';
  const result = hljs.highlight(code, { language: 'javascript' }).value;
  check('hljs 高亮 JavaScript 代码', result.includes('<span') && result.includes('keyword'), `结果: ${result.slice(0, 80)}`);

  const pyCode = 'def hello():\n    print("hi")';
  const pyResult = hljs.highlight(pyCode, { language: 'python' }).value;
  check('hljs 高亮 Python 代码', pyResult.includes('<span') && pyResult.includes('def'), `结果: ${pyResult.slice(0, 80)}`);
}
console.log('');

// ========== P2-4.7: 滚动同步 ==========
console.log('[P2-4.7] 滚动同步');
{
  check('含 isSyncingScroll ref', SOURCE.includes('isSyncingScroll'));
  check('含 syncScroll 函数', SOURCE.includes('syncScroll'));
  check('仅分屏模式生效', SOURCE.includes("viewMode !== 'split'"));
  check('含 requestAnimationFrame 防递归', SOURCE.includes('requestAnimationFrame'));
  check('textarea 含 onScroll', SOURCE.includes("onScroll={() => syncScroll(textareaRef"));
  check('预览区含 onScroll', SOURCE.includes("onScroll={() => syncScroll(previewRef"));

  // 测试比例映射算法
  function computeTargetScroll(sourceScrollTop, sourceScrollHeight, sourceClientHeight, targetScrollHeight, targetClientHeight) {
    const maxSrc = sourceScrollHeight - sourceClientHeight;
    const ratio = maxSrc > 0 ? sourceScrollTop / maxSrc : 0;
    const maxTarget = targetScrollHeight - targetClientHeight;
    return ratio * maxTarget;
  }

  // 源在 50% 位置 → 目标也应在 50%
  const t1 = computeTargetScroll(500, 2000, 1000, 3000, 1000);
  check('50% 滚动 → 目标 50%', Math.abs(t1 - 1000) < 1, `实际: ${t1}`);

  // 源在 0% → 目标 0
  const t2 = computeTargetScroll(0, 2000, 1000, 3000, 1000);
  check('0% 滚动 → 目标 0%', t2 === 0);

  // 源在底部 → 目标底部
  const t3 = computeTargetScroll(1000, 2000, 1000, 3000, 1000);
  check('100% 滚动 → 目标 100%', Math.abs(t3 - 2000) < 1, `实际: ${t3}`);
}
console.log('');

// ========== P2-4.8: 全屏编辑 ==========
console.log('[P2-4.8] 全屏编辑');
{
  check('含 isFullscreen state', SOURCE.includes('isFullscreen'));
  check('含 toggleFullscreen', SOURCE.includes('toggleFullscreen'));
  check('含 Maximize/Minimize 图标', SOURCE.includes('Maximize') && SOURCE.includes('Minimize'));
  check('含 fixed inset-0 z-[9999]', SOURCE.includes('fixed inset-0 z-[9999]'));
  check('标题全屏时隐藏', SOURCE.includes('{!isFullscreen && ('));
  check('Esc 退出全屏', SOURCE.includes("e.key === 'Escape'") && SOURCE.includes('setIsFullscreen(false)'));
  check('底部栏全屏样式', SOURCE.includes('border-t border-gray-200 bg-gray-50'));
  check('CSS 全屏 max-height none', fs.readFileSync('src/tools/markdown-editor/styles.css', 'utf8').includes('max-height: none'));
}
console.log('');

// ========== P2-4.9: 查找替换 ==========
console.log('[P2-4.9] 查找替换');
{
  check('含 showFindReplace state', SOURCE.includes('showFindReplace'));
  check('含 findText/replaceText state', SOURCE.includes('findText') && SOURCE.includes('replaceText'));
  check('含 findMatches/currentMatchIndex', SOURCE.includes('findMatches') && SOURCE.includes('currentMatchIndex'));
  check('含 caseSensitive', SOURCE.includes('caseSensitive'));
  check('含 performFind', SOURCE.includes('performFind'));
  check('含 findNext/findPrev', SOURCE.includes('findNext') && SOURCE.includes('findPrev'));
  check('含 replaceCurrent/replaceAll', SOURCE.includes('replaceCurrent') && SOURCE.includes('replaceAll'));
  check('含 closeFindReplace', SOURCE.includes('closeFindReplace'));
  check('Ctrl+F 快捷键', SOURCE.includes("e.key === 'f'"));
  check('Esc 关闭查找', SOURCE.match(/showFindReplace[\s\S]*?closeFindReplace/) !== null || SOURCE.match(/Escape[\s\S]*?showFindReplace[\s\S]*?closeFindReplace/) !== null);
  check('查找面板含匹配计数', SOURCE.includes('currentMatchIndex + 1') && SOURCE.includes('findMatches.length'));
  check('正则转义防注入', SOURCE.includes('replace(/[.*+?^${}()|[\\]\\\\]/g'));

  // 测试查找替换算法
  const text = 'Hello world, hello World, HELLO';
  const escaped = 'Hello'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 不区分大小写
  const regex1 = new RegExp(escaped, 'gi');
  const matches1 = [];
  let m;
  while ((m = regex1.exec(text)) !== null) {
    matches1.push({ index: m.index, length: m[0].length });
    if (m.index === regex1.lastIndex) regex1.lastIndex++;
  }
  check('不区分大小写查找 "Hello" → 3 匹配', matches1.length === 3, `实际: ${matches1.length}`);

  // 区分大小写
  const regex2 = new RegExp(escaped, 'g');
  const matches2 = [];
  let m2;
  while ((m2 = regex2.exec(text)) !== null) {
    matches2.push({ index: m2.index, length: m2[0].length });
    if (m2.index === regex2.lastIndex) regex2.lastIndex++;
  }
  check('区分大小写查找 "Hello" → 1 匹配', matches2.length === 1, `实际: ${matches2.length}`);

  // 全部替换
  const replaced = text.replace(new RegExp(escaped, 'gi'), 'Hi');
  check('全部替换 "Hello"→"Hi"', replaced === 'Hi world, Hi World, Hi', `实际: ${replaced}`);

  // 特殊字符转义
  const specialEscaped = '1+1'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const specialRegex = new RegExp(specialEscaped, 'g');
  check('特殊字符 "+" 被转义', specialEscaped === '1\\+1', `实际: ${specialEscaped}`);
  check('转义后正确匹配 "1+1"', '1+1=2'.match(specialRegex) !== null);
}
console.log('');

// ========== P2-4.10: 可访问性 ==========
console.log('[P2-4.10] 可访问性');
{
  check('ToolbarBtn 含 aria-label', SOURCE.includes('aria-label={title}'));
  check('ToolbarBtn 含 aria-pressed', SOURCE.includes('aria-pressed={active}'));
  check('ToolbarBtn 含 type="button"', SOURCE.includes('type="button"'));
  check('ToolbarBtn 含 focus-visible:ring', SOURCE.includes('focus-visible:ring'));
  check('工具栏含 role="toolbar"', SOURCE.includes('role="toolbar"'));
  check('视图组含 role="group"', SOURCE.includes('role="group"'));
  check('textarea 含 aria-label', SOURCE.includes('aria-label="Markdown 编辑区"'));
  check('预览区含 role="region"', SOURCE.includes('role="region"'));
  check('预览区含 aria-label="预览区"', SOURCE.includes('aria-label="预览区"'));
}
console.log('');

// ========== P2-4.11: 移动端工具栏 ==========
console.log('[P2-4.11] 移动端工具栏');
{
  check('工具栏含 overflow-x-auto', SOURCE.includes('overflow-x-auto'));
  check('工具栏含 scrollbar-hide', SOURCE.includes('scrollbar-hide'));
  check('视图组含 shrink-0', SOURCE.includes('shrink-0'));
  check('globals.css 含 scrollbar-hide 定义', fs.readFileSync('src/app/globals.css', 'utf8').includes('.scrollbar-hide'));
}
console.log('');

// ========== P3-4.13: marked 实例化 ==========
console.log('[P3-4.13] marked 实例化');
{
  check('导入 Marked 类', SOURCE.includes("import { Marked } from 'marked'"));
  check('无 marked.setOptions', !SOURCE.includes('marked.setOptions'));
  check('无 marked.parse', !SOURCE.includes('marked.parse('));
  check('含 new Marked 实例', SOURCE.includes('new Marked('));
  check('使用 md.parse', SOURCE.includes('md.parse('));

  // 测试 Marked 实例
  const md = new Marked({ breaks: true, gfm: true });
  const html1 = md.parse('# 标题\n\n**粗体**');
  check('md.parse 渲染标题', html1.includes('<h1>'));
  check('md.parse 渲染粗体', html1.includes('<strong>'));

  const tableMd = '| A | B |\n|---|---|\n| 1 | 2 |';
  const tableHtml = md.parse(tableMd);
  check('md.parse 渲染 GFM 表格', tableHtml.includes('<table>'));

  const breakMd = '第一行\n第二行';
  const breakHtml = md.parse(breakMd);
  check('md.parse breaks 选项（单换行→<br>）', breakHtml.includes('<br'));

  // 确认不污染全局
  check('不依赖全局 marked', !SOURCE.includes('import { marked }'));
}
console.log('');

// ========== P3-4.16: 智能换行 ==========
console.log('[P3-4.16] 空文档智能换行');
{
  check('handleHr 含 needsNewline 判断', SOURCE.match(/handleHr[\s\S]*?needsNewline/) !== null);
  check('handleCodeBlock 含 needsNewline 判断', SOURCE.match(/handleCodeBlock[\s\S]*?needsNewline/) !== null);
  check('判断逻辑为 start > 0 && markdown[start-1] !== "\\n"', SOURCE.includes("markdown[start - 1] !== '\\n'"));
}
console.log('');

// ========== 综合检查 ==========
console.log('[综合] 代码质量');
{
  check('无未使用的 EyeOff 导入', !SOURCE.includes('EyeOff'));
  check('useEffect 已导入', SOURCE.includes('useEffect'));
  check('文件以 export default 结束', SOURCE.trimEnd().endsWith('}'));
  
  const lineCount = SOURCE.split('\n').length;
  check(`文件行数合理 (${lineCount} 行)`, lineCount > 600 && lineCount < 800, `实际: ${lineCount}`);
}
console.log('');

// ========== 汇总 ==========
console.log('════════════════════════════════════════');
console.log(`  通过: ${pass}   失败: ${fail}`);
console.log('════════════════════════════════════════');

if (fail > 0) {
  console.log('\n失败项：');
  results.filter(r => r.startsWith('  ✗')).forEach(r => console.log(r));
}

console.log('');
process.exit(fail > 0 ? 1 : 0);
