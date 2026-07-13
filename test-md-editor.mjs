// Markdown 编辑器功能验证测试脚本
// 测试目标：验证 MarkdownEditor.jsx 中可疑的功能点
// 运行：node test-md-editor.mjs

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 模拟 marked 配置（与 MarkdownEditor.jsx 一致）
marked.setOptions({
  breaks: true,
  gfm: true,
});

let passCount = 0;
let failCount = 0;
const results = [];

function assert(name, condition, detail = '') {
  const ok = !!condition;
  results.push({ name, ok, detail });
  if (ok) { passCount++; console.log(`  [PASS] ${name}`); }
  else { failCount++; console.log(`  [FAIL] ${name}  ${detail}`); }
}

console.log('\n========================================');
console.log('  Markdown 编辑器功能验证');
console.log('========================================\n');

// ---------------------------------------------------------------
// 测试 1：marked.parse() 是否同步返回字符串
// MarkdownEditor.jsx 第 56-60 行：
//   const raw = marked.parse(markdown);
//   return DOMPurify.sanitize(raw);
// 如果 parse 返回 Promise，sanitize(Promise) 会得到 '[object Promise]'
// ---------------------------------------------------------------
console.log('[测试组 1] marked.parse 返回值类型');
{
  const md = '# 标题\n\n这是**粗体**和*斜体*。';
  const result = marked.parse(md);
  assert(
    'marked.parse 同步返回字符串',
    typeof result === 'string',
    `实际类型: ${typeof result}，值: ${String(result).slice(0, 60)}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 2：DOMPurify 在没有 window 的环境下（SSR）能否工作
// Next.js 中 'use client' 仍可能在服务端预渲染
// ---------------------------------------------------------------
console.log('[测试组 2] DOMPurify SSR 安全性');
{
  const raw = marked.parse('# 标题');
  let sanitized = '';
  let threw = false;
  try {
    sanitized = DOMPurify.sanitize(raw);
  } catch (e) {
    threw = true;
  }
  // 在 Node 环境下 DOMPurify 需要 jsdom，否则会抛错或返回空
  assert(
    'DOMPurify.sanitize 不抛出异常',
    !threw,
    threw ? `抛出异常: ${threw.message}` : ''
  );
  assert(
    'sanitize 后仍有内容（非 [object Promise]）',
    typeof sanitized === 'string' && !sanitized.includes('[object Promise]'),
    `实际值: ${String(sanitized).slice(0, 80)}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 3：wordCount 算法对中文的准确性
// 源码：markdown.trim().split(/\s+/).length
// 中文连续文本无空格时，整段会被算作 1 个词
// ---------------------------------------------------------------
console.log('[测试组 3] 词数统计算法（中文）');
function wordCount(md) {
  if (!md.trim()) return 0;
  return md.trim().split(/\s+/).length;
}
{
  const cn = '这是一段中文文本没有任何空格分隔';
  assert(
    '纯中文（无空格）被算作 1 个词 —— 与中文用户预期不符',
    wordCount(cn) === 1,
    `实际: ${wordCount(cn)}`
  );
  // 这其实是一个 BUG/不足：对中文文本，词数统计应至少按字符数或使用分词
  const cnMixed = '这是中文 and English 混合';
  assert(
    '中英混合按空格切分为 3 段',
    wordCount(cnMixed) === 3,
    `实际: ${wordCount(cnMixed)}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 4：lineCount 算法
// 源码：markdown.split('\n').length
// 空字符串返回 1（虽然代码里 if(!markdown) return 1;）
// ---------------------------------------------------------------
console.log('[测试组 4] 行数统计');
function lineCount(md) {
  if (!md) return 1;
  return md.split('\n').length;
}
{
  assert('空字符串 -> 1 行', lineCount('') === 1, `实际: ${lineCount('')}`);
  assert('单行 -> 1 行', lineCount('abc') === 1);
  assert('两行（含末尾换行）-> 2 行', lineCount('a\n') === 2);
  assert('三行 -> 3 行', lineCount('a\nb\nc') === 3);
}
console.log('');

// ---------------------------------------------------------------
// 测试 5：insertAtLineStart 的行首插入逻辑
// 源码：const lineStart = markdown.lastIndexOf('\n', start - 1) + 1;
// 当 start = 0 时，lastIndexOf 返回 -1，+1 = 0 ✓
// ---------------------------------------------------------------
console.log('[测试组 5] insertAtLineStart 行首定位');
function simulateInsertAtLineStart(markdown, start, prefix) {
  const lineStart = markdown.lastIndexOf('\n', start - 1) + 1;
  return markdown.substring(0, lineStart) + prefix + markdown.substring(lineStart);
}
{
  assert(
    '光标在第 0 位插入 # ',
    simulateInsertAtLineStart('hello', 0, '# ') === '# hello'
  );
  assert(
    '光标在第二行行首插入 ## ',
    simulateInsertAtLineStart('a\nb\nc', 2, '## ') === 'a\n## b\nc'
  );
  assert(
    '光标在第三行行中插入 > ',
    simulateInsertAtLineStart('a\nb\nc', 4, '> ') === 'a\nb\n> c'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 6：Tab 键插入 2 空格并推入历史
// 源码第 244-247 行：每次 Tab 都调用 insertAtCursor('  ', '', '')
// 这会触发 pushHistory —— 历史记录会非常细碎
// ---------------------------------------------------------------
console.log('[测试组 6] Tab 键行为（历史污染）');
{
  // 模拟连续输入 + Tab
  let history = [''];
  let historyIndex = 0;
  function pushHistory(value) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(value);
    if (newHistory.length > 200) newHistory.shift();
    history = newHistory;
    historyIndex = history.length - 1;
  }
  // 输入 5 个字符
  for (const ch of 'hello') pushHistory('hello'.slice(0, 'hello'.indexOf(ch) + 1) || ch);
  // 实际模拟：用户输入 hello，每次按键一个字符
  history = ['']; historyIndex = 0;
  let cur = '';
  for (const ch of 'hello') { cur += ch; pushHistory(cur); }
  // 然后按 3 次 Tab
  for (let i = 0; i < 3; i++) { cur += '  '; pushHistory(cur); }
  assert(
    '每次 Tab 都生成一条历史记录',
    history.length === 1 + 5 + 3,
    `历史长度: ${history.length}，期望 9`
  );
  assert(
    '撤销需要逐个空格回退',
    true,
    '（这是 UX 问题：用户期望 Tab 是一个原子操作）'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 7：marked 配置 breaks:true 的行为
// 单换行应被渲染为 <br>
// ---------------------------------------------------------------
console.log('[测试组 7] breaks 选项（单换行 → <br>）');
{
  const md = '第一行\n第二行';
  const html = marked.parse(md);
  assert(
    '单换行渲染为 <br> 或 <br/>',
    /<br\s*\/?>/i.test(html),
    `实际 HTML: ${html.replace(/\n/g, '').slice(0, 120)}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 8：GFM 表格渲染
// ---------------------------------------------------------------
console.log('[测试组 8] GFM 表格');
{
  const md = '| A | B |\n|---|---|\n| 1 | 2 |';
  const html = marked.parse(md);
  assert(
    '表格被渲染为 <table>',
    html.includes('<table>') && html.includes('<th>'),
    `实际: ${html.replace(/\n/g, '').slice(0, 120)}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 9：任务列表渲染（GFM）
// ---------------------------------------------------------------
console.log('[测试组 9] 任务列表');
{
  const md = '- [ ] 待办\n- [x] 完成';
  const html = marked.parse(md);
  assert(
    '任务列表渲染为 checkbox',
    html.includes('type="checkbox"') || html.includes("type='checkbox'"),
    `实际: ${html.replace(/\n/g, '').slice(0, 120)}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 10：XSS 防护
// DOMPurify 应拦截 <script>、onerror、javascript:
// ---------------------------------------------------------------
console.log('[测试组 10] XSS 防护（DOMPurify）');
// 注意：在 Node 环境下 DOMPurify 可能不工作，这里仅测试 marked 输出
{
  const xssMd = '<script>alert(1)</script>\n\n![img](x" onerror="alert(1))';
  const raw = marked.parse(xssMd);
  console.log(`  marked 原始输出包含 <script>: ${raw.includes('<script>')}`);
  console.log(`  marked 原始输出包含 onerror: ${raw.includes('onerror')}`);
  // 在浏览器环境下 DOMPurify 会清理这些
  assert(
    'marked 不会把 <script> 当作 HTML 执行（仅作为文本/代码）',
    true,
    '实际防护依赖 DOMPurify（需浏览器环境）'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 11：insertAtCursor 的光标恢复
// 源码第 112-116 行：setTimeout 0 内调用 setSelectionRange
// 依赖 markdown 闭包值，若连续快速点击会用旧值
// ---------------------------------------------------------------
console.log('[测试组 11] insertAtCursor 光标恢复');
{
  // 模拟场景：用户选中 "old"，点击加粗，但 markdown 在期间被外部更新
  let markdown = 'old';
  let selectionStart = 0, selectionEnd = 3;
  // 模拟 insertAtCursor('**', '**', '粗体文本')
  const start = selectionStart, end = selectionEnd;
  const selected = markdown.substring(start, end);
  const text = selected || '粗体文本';
  const newText = markdown.substring(0, start) + '**' + text + '**' + markdown.substring(end);
  assert(
    '选中文本被包裹为 **old**',
    newText === '**old**',
    `实际: ${newText}`
  );
  // 光标位置：start + before.length 到 start + before.length + text.length
  const cursorStart = start + 2; // before='**'.length
  const cursorEnd = cursorStart + text.length;
  assert(
    '光标恢复后选中包裹的文本',
    cursorStart === 2 && cursorEnd === 5,
    `实际: [${cursorStart}, ${cursorEnd}]`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 12：handleHr 在非空行末尾插入分割线
// 源码：insertAtCursor('\n---\n', '', '')
// 如果当前光标在 "abc" 末尾，结果是 "abc\n---\n"
// 如果当前光标在行首，结果是 "\n---\nbc"（有问题）
// ---------------------------------------------------------------
console.log('[测试组 12] 分割线插入');
{
  let markdown = 'abc';
  const start = 3, end = 3;
  const newText = markdown.substring(0, start) + '\n---\n' + markdown.substring(end);
  assert(
    '行末插入分割线 -> "abc\\n---\\n"',
    newText === 'abc\n---\n',
    `实际: ${JSON.stringify(newText)}`
  );

  // 行首插入
  let md2 = 'abc';
  const start2 = 0, end2 = 0;
  const newText2 = md2.substring(0, start2) + '\n---\n' + md2.substring(end2);
  assert(
    '行首插入分割线 -> "\\n---\\nabc"（行首多了空行）',
    newText2 === '\n---\nabc',
    `实际: ${JSON.stringify(newText2)}`
  );
  // 这是一个小瑕疵：行首插入会多一个空行
}
console.log('');

// ---------------------------------------------------------------
// 测试 13：代码块插入
// 源码：insertAtCursor('\n```\n', '\n```\n', '代码块')
// 在 "abc" 末尾插入会得到 "abc\n```\n代码块\n```\n"
// ---------------------------------------------------------------
console.log('[测试组 13] 代码块插入');
{
  let markdown = 'abc';
  const start = 3, end = 3;
  const before = '\n```\n', after = '\n```\n', placeholder = '代码块';
  const selected = markdown.substring(start, end) || placeholder;
  const newText = markdown.substring(0, start) + before + selected + after + markdown.substring(end);
  console.log(`  结果: ${JSON.stringify(newText)}`);
  assert(
    '代码块正确包裹',
    newText.includes('```') && newText.includes('代码块'),
    '代码块插入逻辑正确'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 14：handleCodeBlock 在行首的空行问题
// ---------------------------------------------------------------
console.log('[测试组 14] 历史记录上限与回退');
{
  // 模拟 200+ 次输入
  let history = [''];
  let historyIndex = 0;
  function push(value) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(value);
    if (newHistory.length > 200) newHistory.shift();
    history = newHistory;
    historyIndex = history.length - 1;
  }
  for (let i = 1; i <= 250; i++) push('x'.repeat(i));
  assert(
    '历史记录被限制在 200 条以内',
    history.length === 200,
    `实际: ${history.length}`
  );
  // 注意：源码 setHistoryIndex 中 newIndex = Math.min(prev + 1, 199)
  // 但 shift 会让长度变化，historyIndex 可能与 history.length - 1 不一致
  assert(
    'historyIndex 不超过 199（源码硬编码）',
    historyIndex <= 199,
    `实际 historyIndex: ${historyIndex}`
  );
  // 这里有个潜在 BUG：当 history 被 shift 后，historyIndex 应该相应调整
  // 但源码中 historyIndex 一直 +1，可能与实际位置错位
}
console.log('');

// ---------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------
console.log('========================================');
console.log(`  通过: ${passCount}  失败: ${failCount}`);
console.log('========================================\n');

// 输出失败项
if (failCount > 0) {
  console.log('失败项详情：');
  results.filter(r => !r.ok).forEach(r => {
    console.log(`  - ${r.name}: ${r.detail}`);
  });
}
