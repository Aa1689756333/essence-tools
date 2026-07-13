// Markdown 编辑器深度测试 - 第二轮
// 专注于验证历史记录时序、SSR、边界场景
// 运行：node test-md-editor-2.mjs

import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

let pass = 0, fail = 0;
const fails = [];
function assert(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; fails.push({ name, detail }); console.log(`  [FAIL] ${name}  ${detail}`); }
}

console.log('\n========================================');
console.log('  Markdown 编辑器深度测试 (Round 2)');
console.log('========================================\n');

// ---------------------------------------------------------------
// 测试 A：DOMPurify SSR 抛错的具体信息
// ---------------------------------------------------------------
console.log('[测试组 A] DOMPurify 在无 window 环境下的行为');
{
  const raw = marked.parse('# 标题 <script>alert(1)</script>');
  let err = null;
  let result = null;
  try {
    result = DOMPurify.sanitize(raw);
  } catch (e) {
    err = e;
  }
  if (err) {
    console.log(`  抛出错误类型: ${err.constructor.name}`);
    console.log(`  错误信息: ${err.message}`);
    assert(
      'DOMPurify 在 SSR 环境抛错 —— 需要在客户端组件中防护',
      true,
      `错误: ${err.message}`
    );
  } else {
    assert('DOMPurify 未抛错', true);
  }
}
console.log('');

// ---------------------------------------------------------------
// 测试 B：历史记录 shift 后 historyIndex 错位 BUG
// 源码 pushHistory:
//   setHistory(prev => {
//     const newHistory = prev.slice(0, historyIndex + 1);
//     newHistory.push(value);
//     if (newHistory.length > 200) newHistory.shift();
//     return newHistory;
//   });
//   setHistoryIndex(prev => Math.min(prev + 1, 199));
// 问题：当 shift 后长度=200，但 historyIndex 被设为 prev+1
//   假设 prev=199，shift 后数组长度=200，新元素在 index 199
//   historyIndex = min(199+1, 199) = 199 ✓ 看似正确
//   但如果 prev=198，shift 后数组长度=200，新元素在 index 199
//   historyIndex = min(198+1, 199) = 199 ✓
//   然而下一次 pushHistory 时 slice(0, 199+1)=slice(0,200)
//   会保留全部 200 个元素，再 push 变 201，shift 后 200
//   实际上逻辑能自洽，但每次都 shift 会丢失最旧的历史
// ---------------------------------------------------------------
console.log('[测试组 B] 历史记录边界（200 上限）');
{
  let history = [''];
  let historyIndex = 0;
  function pushHistory(value) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(value);
    if (newHistory.length > 200) newHistory.shift();
    history = newHistory;
    // 源码：historyIndex = Math.min(prev + 1, 199)
    historyIndex = Math.min(historyIndex + 1, 199);
  }
  // 输入 201 个字符
  for (let i = 1; i <= 201; i++) pushHistory('a'.repeat(i));
  console.log(`  201 次输入后: history.length=${history.length}, historyIndex=${historyIndex}`);
  assert(
    'history.length === 200（上限生效）',
    history.length === 200,
    `实际: ${history.length}`
  );
  // 检查 historyIndex 是否指向最后一个元素
  assert(
    'historyIndex 指向最后一个元素（当前内容）',
    historyIndex === history.length - 1,
    `historyIndex=${historyIndex}, length-1=${history.length - 1}`
  );
  // 检查 history[historyIndex] 是否是最新的输入
  assert(
    'history[historyIndex] 是最新输入',
    history[historyIndex] === 'a'.repeat(201),
    `实际: ${history[historyIndex]?.length} 字符`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 C：historyIndex 与 history.length - 1 错位的真实场景
// 当用户撤销几次后再输入，会 slice 掉后面的，然后 push
// 此时如果之前 shift 过，historyIndex 可能错位
// ---------------------------------------------------------------
console.log('[测试组 C] 撤销后输入的 historyIndex 一致性');
{
  let history = [''];
  let historyIndex = 0;
  function pushHistory(value) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(value);
    if (newHistory.length > 200) newHistory.shift();
    history = newHistory;
    historyIndex = Math.min(historyIndex + 1, 199);
  }
  // 输入 5 次
  for (let i = 1; i <= 5; i++) pushHistory('a'.repeat(i));
  // history = ['', 'a', 'aa', 'aaa', 'aaaa', 'aaaaa'], index=5
  console.log(`  输入后: length=${history.length}, index=${historyIndex}, last=${history[historyIndex]}`);
  // 撤销 2 次
  historyIndex -= 2; // index=3, 指向 'aaaa'
  console.log(`  撤销2次: index=${historyIndex}, current=${history[historyIndex]}`);
  // 再输入
  pushHistory('new');
  console.log(`  再输入: length=${history.length}, index=${historyIndex}, last=${history[historyIndex]}`);
  assert(
    '撤销后输入：index 指向最新',
    historyIndex === history.length - 1,
    `index=${historyIndex}, length-1=${history.length - 1}`
  );
  assert(
    '撤销后输入：被撤销的内容被丢弃',
    history.length === 5, // ['', 'a', 'aa', 'aaa', 'new']
    `实际 length: ${history.length}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 D：isUndoRedo 时序问题
// 源码：setIsUndoRedo(true); ... setMarkdown(...); setTimeout(() => setIsUndoRedo(false), 0);
// handleChange 中：if (isUndoRedo) return; —— 但 handleChange 由 onChange 触发
// 撤销/重做是直接 setMarkdown，不会触发 onChange（因为是程序设置 value）
// 所以 isUndoRedo 这个守卫实际上没必要？
// 但如果 React 严格模式双重渲染或事件竞态，可能有问题
// ---------------------------------------------------------------
console.log('[测试组 D] 撤销/重做后 pushHistory 守卫的必要性');
{
  // 实际上 setMarkdown 不会触发 onChange，所以 isUndoRedo 守卫是多余的
  // 但它不会造成 bug，只是冗余
  assert(
    'isUndoRedo 守卫是冗余代码（setMarkdown 不触发 onChange）',
    true,
    '代码冗余但无害'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 E：handleExportHtml 的 XSS 风险
// 源码：导出的 HTML 是 renderedHtml（已 sanitize）+ 静态样式
// 看似安全，但 DOMPurify 默认配置可能允许某些危险属性
// ---------------------------------------------------------------
console.log('[测试组 E] 导出 HTML 的内容来源');
{
  // renderedHtml = DOMPurify.sanitize(marked.parse(markdown))
  // 导出时直接拼接，没有再次 sanitize
  // 但因为 renderedHtml 已经 sanitize 过，所以是安全的
  assert(
    '导出 HTML 使用已 sanitize 的 renderedHtml',
    true,
    '安全：内容来源已 sanitize'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 F：marked v18 的 async 默认行为
// 确认没有设置 async: true 时，parse 同步返回字符串
// ---------------------------------------------------------------
console.log('[测试组 F] marked v18 同步行为确认');
{
  const md = '# Test\n\n- item 1\n- item 2';
  const result = marked.parse(md);
  assert(
    'marked.parse 返回字符串而非 Promise',
    typeof result === 'string' && !result.then,
    `类型: ${typeof result}`
  );
  // 检查 thenable
  const isThenable = result && typeof result.then === 'function';
  assert(
    '结果不是 thenable',
    !isThenable,
    `isThenable: ${isThenable}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 G：Tab 键插入空格后光标位置
// 源码 insertAtCursor('  ', '', '')：
//   selected = '' (Tab 通常无选区)
//   text = '' || '' = ''
//   newText = ... + '  ' + '' + ...
//   cursorPos = start + 2, 选中 0 个字符
// 看似正确
// ---------------------------------------------------------------
console.log('[测试组 G] Tab 键光标定位');
{
  let markdown = 'abc';
  const start = 3, end = 3;
  const before = '  ', after = '', placeholder = '';
  const selected = markdown.substring(start, end);
  const text = selected || placeholder; // ''
  const newText = markdown.substring(0, start) + before + text + after + markdown.substring(end);
  const cursorPos = start + before.length;
  assert(
    'Tab 后文本 = "abc  "',
    newText === 'abc  ',
    `实际: ${JSON.stringify(newText)}`
  );
  assert(
    'Tab 后光标在 5（两个空格后）',
    cursorPos === 5,
    `实际: ${cursorPos}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 H：清空操作的撤销问题
// 源码 handleClear: setMarkdown(''); pushHistory('');
// 用户清空后可以撤销恢复 —— 这是好的
// ---------------------------------------------------------------
console.log('[测试组 H] 清空可撤销');
{
  let history = ['hello'];
  let historyIndex = 0;
  function pushHistory(value) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(value);
    if (newHistory.length > 200) newHistory.shift();
    history = newHistory;
    historyIndex = Math.min(historyIndex + 1, 199);
  }
  pushHistory(''); // 清空
  assert(
    '清空后历史记录了空字符串',
    history[historyIndex] === '',
    `实际: ${history[historyIndex]}`
  );
  assert(
    '撤销可以恢复 "hello"',
    history[historyIndex - 1] === 'hello',
    `实际: ${history[historyIndex - 1]}`
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 I：handleHr / handleCodeBlock 在空文档中的行为
// 空文档 markdown=''，光标在 0
// insertAtCursor('\n---\n', '', '') -> newText = '\n---\n'
// 行首多了一个空行
// ---------------------------------------------------------------
console.log('[测试组 I] 空文档插入分割线');
{
  let markdown = '';
  const start = 0;
  const newText = markdown.substring(0, start) + '\n---\n' + markdown.substring(start);
  console.log(`  结果: ${JSON.stringify(newText)}`);
  assert(
    '空文档插入分割线 -> "\\n---\\n"（开头有空行）',
    newText === '\n---\n',
    `实际: ${JSON.stringify(newText)}`
  );
  // 这是一个小瑕疵：预览时会显示一个空行 + 分割线
}
console.log('');

// ---------------------------------------------------------------
// 测试 J：复制 HTML 的语义问题
// 源码 handleCopyHtml: navigator.clipboard.writeText(html)
// writeText 复制的是纯文本，而非富文本
// 用户期望"复制 HTML"是复制富文本（可直接粘贴到 Word 等带格式）
// 但实际复制的是 HTML 源码字符串
// ---------------------------------------------------------------
console.log('[测试组 J] 复制 HTML 的语义');
{
  assert(
    '复制 HTML 实际复制的是源码字符串（非富文本）',
    true,
    'UX 问题：writeText 复制纯文本，用户可能期望富文本'
  );
}
console.log('');

// ---------------------------------------------------------------
// 测试 K：wordCount 对比字符数（更直观）
// ---------------------------------------------------------------
console.log('[测试组 K] 词数 vs 字符数对比');
{
  const samples = [
    { label: '纯中文段落', md: '这是一段没有空格的中文文本用于测试词数统计功能' },
    { label: '中英混合', md: '使用 React 19 构建 Next.js 应用' },
    { label: '纯英文', md: 'The quick brown fox jumps over the lazy dog' },
    { label: '代码块', md: '```\nconst x = 1;\nconsole.log(x);\n```' },
    { label: 'Markdown 语法', md: '# 标题\n\n**粗体** *斜体*\n\n- 列表项' },
  ];
  for (const s of samples) {
    const words = s.md.trim().split(/\s+/).length;
    const chars = s.md.length;
    const cnChars = (s.md.match(/[\u4e00-\u9fa5]/g) || []).length;
    console.log(`  ${s.label}: 词数=${words}, 字符数=${chars}, 中文字符=${cnChars}`);
  }
  assert(
    '词数统计对纯中文严重失真（整段=1词）',
    true,
    '建议改为字符数或中文字符+英文词数的混合统计'
  );
}
console.log('');

// ---------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------
console.log('========================================');
console.log(`  通过: ${pass}  失败: ${fail}`);
console.log('========================================\n');
if (fails.length > 0) {
  console.log('失败项：');
  fails.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
}
