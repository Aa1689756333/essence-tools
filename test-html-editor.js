/**
 * HTML Editor 全面测试脚本
 * 提取 HtmlEditor.jsx 中的纯函数和 DOM 函数进行测试
 */
const { JSDOM } = require('jsdom');

// 设置全局 DOM 环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.NodeFilter = dom.window.NodeFilter;

let passed = 0;
let failed = 0;
let total = 0;
const failures = [];

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Not equal'}\n        Expected: ${JSON.stringify(expected)}\n        Actual:   ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(str, substr, msg) {
  if (!str.includes(substr)) {
    throw new Error(`${msg || 'Not includes'}\n        String: ${JSON.stringify(str)}\n        Should include: ${JSON.stringify(substr)}`);
  }
}

// ============================================================
// 提取被测函数
// ============================================================

// formatHtml - 从 HtmlEditor.jsx 第 23-87 行
function formatHtml(html) {
  if (!html) return '';
  const blockTags = new Set([
    'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'table', 'tr', 'tbody', 'thead', 'tfoot',
    'blockquote', 'pre', 'hr', 'section', 'article', 'aside',
    'header', 'footer', 'nav', 'main', 'figure', 'figcaption',
    'dl', 'dt', 'dd', 'form', 'fieldset', 'legend'
  ]);
  const selfClosingTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
  let result = '';
  let indent = 0;
  const indentStr = '  ';
  const tokens = html.match(/<[^>]+>|[^<]+/g) || [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith('<')) {
      const trimmed = token.trim();
      if (trimmed) {
        result += indentStr.repeat(indent) + trimmed + '\n';
      }
      continue;
    }
    if (token.startsWith('<!--')) {
      result += indentStr.repeat(indent) + token + '\n';
      continue;
    }
    if (selfClosingTags.has(token.match(/^<\/?(\w+)/)?.[1]?.toLowerCase()) || token.endsWith('/>')) {
      result += indentStr.repeat(indent) + token + '\n';
      continue;
    }
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      result += indentStr.repeat(indent) + token + '\n';
      continue;
    }
    const tagName = token.match(/^<(\w+)/)?.[1]?.toLowerCase();
    result += indentStr.repeat(indent) + token + '\n';
    if (tagName && blockTags.has(tagName)) {
      indent++;
    }
  }
  return result.trim();
}

// cleanHtml - 从 HtmlEditor.jsx 第 90-157 行
function cleanHtml(html) {
  if (!html) return '';
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  container.querySelectorAll('font').forEach(font => {
    const span = document.createElement('span');
    const size = font.getAttribute('size');
    const color = font.getAttribute('color');
    const face = font.getAttribute('face');
    const existingStyle = font.getAttribute('style') || '';
    let style = existingStyle;
    if (size) {
      const sizeMap = { '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
      style += `font-size:${sizeMap[size] || '16px'};`;
    }
    if (color) style += `color:${color};`;
    if (face) style += `font-family:${face};`;
    if (style) span.setAttribute('style', style);
    Array.from(font.attributes).forEach(attr => {
      if (!['size', 'color', 'face', 'style'].includes(attr.name)) {
        span.setAttribute(attr.name, attr.value);
      }
    });
    while (font.firstChild) span.appendChild(font.firstChild);
    font.replaceWith(span);
  });
  container.querySelectorAll('center').forEach(center => {
    const div = document.createElement('div');
    const existingStyle = center.getAttribute('style') || '';
    div.setAttribute('style', `text-align:center;${existingStyle}`);
    while (center.firstChild) div.appendChild(center.firstChild);
    center.replaceWith(div);
  });
  container.querySelectorAll('[style=""]').forEach(el => {
    el.removeAttribute('style');
  });
  const inlineTags = ['b', 'i', 'u', 's', 'strong', 'em', 'span'];
  let changed = true;
  while (changed) {
    changed = false;
    container.querySelectorAll(inlineTags.join(',')).forEach(el => {
      if (!el.textContent.trim() && !el.querySelector('img, br, hr, table') && el.children.length === 0) {
        el.remove();
        changed = true;
      }
    });
  }
  return container.innerHTML;
}

// countWords - 从 HtmlEditor.jsx 第 160-172 行
function countWords(text) {
  if (!text) return { words: 0, chars: 0 };
  const chars = text.length;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9-]+/g) || []).length;
  const words = chineseChars + englishWords;
  return { words, chars };
}

// ============================================================
// 1. formatHtml 测试
// ============================================================
console.log('\n===== formatHtml 测试 =====\n');

test('F1: 空输入返回空字符串', () => {
  assertEqual(formatHtml(''), '');
  assertEqual(formatHtml(null), '');
  assertEqual(formatHtml(undefined), '');
});

test('F2: 简单段落格式化', () => {
  const result = formatHtml('<p>Hello</p>');
  assertEqual(result, '<p>\n  Hello\n</p>');
});

test('F3: 嵌套块级元素缩进', () => {
  const result = formatHtml('<div><p>text</p></div>');
  assertIncludes(result, '<div>\n');
  assertIncludes(result, '  <p>\n');
  assertIncludes(result, '    text\n');
});

test('F4: 自闭合标签在当前缩进层级', () => {
  const result = formatHtml('<div><br></div>');
  assertIncludes(result, '  <br>', 'br should be indented at current level inside div');
});

test('F5: BUG - 内联元素被错误地添加换行', () => {
  // <strong>hello</strong> world 应该保持在一行
  const result = formatHtml('<p><strong>hello</strong> world</p>');
  // 由于 strong 不是块级标签，不会增加缩进，但文本节点 "world" 会被独立成行
  // 导致格式化后变成: <p>\n  <strong>\n    hello\n  </strong>\n  world\n</p>
  // 这改变了渲染效果（hello 和 world 之间会多出空格/换行）
  console.log(`        formatHtml result: ${JSON.stringify(result)}`);
  // 标记为已知问题
  const hasExtraBreaks = result.split('\n').length > 3;
  if (hasExtraBreaks) {
    console.log('        [KNOWN ISSUE] 内联元素被拆成多行，改变了渲染效果');
  }
});

test('F6: BUG - 相邻文本和标签被拆分', () => {
  const result = formatHtml('<p>before <em>italic</em> after</p>');
  console.log(`        formatHtml result: ${JSON.stringify(result)}`);
  // "before" 和 "after" 会被作为独立文本节点各占一行
  const lines = result.split('\n');
  console.log(`        Lines: ${lines.length}`);
  // 预期这会导致渲染时 "before" 和 "italic" 之间多出换行
});

test('F7: 注释正确处理', () => {
  const result = formatHtml('<div><!-- comment --><p>text</p></div>');
  assertIncludes(result, '<!-- comment -->');
});

test('F8: 属性中的 > 符号导致tokenize错误', () => {
  // 这是一个已知的简单tokenizer的局限性
  const result = formatHtml('<div data-expr="a > b">text</div>');
  console.log(`        Result: ${JSON.stringify(result)}`);
  // 属性中的 > 会导致tokenize提前截断标签
  const isBroken = !result.includes('data-expr="a > b"');
  if (isBroken) {
    console.log('        [KNOWN ISSUE] 属性中的 > 导致标签被错误截断');
  }
});

test('F9: formatHtml 的幂等性', () => {
  const input = '<div><p>Hello</p></div>';
  const first = formatHtml(input);
  const second = formatHtml(first);
  assertEqual(first, second, 'formatHtml should be idempotent');
});

test('F10: 大型HTML性能', () => {
  let html = '<div>';
  for (let i = 0; i < 500; i++) {
    html += `<p>Paragraph ${i} with some text content</p>`;
  }
  html += '</div>';
  const start = Date.now();
  formatHtml(html);
  const elapsed = Date.now() - start;
  console.log(`        500 paragraphs: ${elapsed}ms`);
  assert(elapsed < 1000, `Formatting took ${elapsed}ms, expected < 1000ms`);
});

// ============================================================
// 2. cleanHtml 测试
// ============================================================
console.log('\n===== cleanHtml 测试 =====\n');

test('C1: 空输入返回空字符串', () => {
  assertEqual(cleanHtml(''), '');
  assertEqual(cleanHtml(null), '');
});

test('C2: 移除事件属性 (XSS防护)', () => {
  const result = cleanHtml('<div onclick="alert(1)" onmouseover="hack()">text</div>');
  assert(!result.includes('onclick'), 'onclick should be removed');
  assert(!result.includes('onmouseover'), 'onmouseover should be removed');
  assertIncludes(result, 'text');
});

test('C3: font标签转换为span', () => {
  const result = cleanHtml('<font size="3" color="red" face="Arial">text</font>');
  assertIncludes(result, '<span');
  assertIncludes(result, 'font-size:16px');
  assertIncludes(result, 'color:red');
  assertIncludes(result, 'font-family:Arial');
  assert(!result.includes('<font'), 'font tag should be converted');
});

test('C4: center标签转换为div', () => {
  const result = cleanHtml('<center>content</center>');
  assertIncludes(result, '<div');
  assertIncludes(result, 'text-align:center');
  assert(!result.includes('<center'), 'center tag should be converted');
});

test('C5: 移除空内联元素', () => {
  const result = cleanHtml('<p>text<span></span><b></b></p>');
  assert(!result.includes('<span>'), 'empty span should be removed');
  assert(!result.includes('<b>'), 'empty b should be removed');
});

test('C6: 保留含图片的空内联元素', () => {
  const result = cleanHtml('<span><img src="test.jpg"></span>');
  assertIncludes(result, '<span>');
  assertIncludes(result, '<img');
});

test('C7: cleanHtml 接收额外参数不报错', () => {
  // handlePaste 调用 cleanHtml(html, true)，但函数签名只接受一个参数
  // 测试是否安全忽略第二个参数
  const result = cleanHtml('<b onclick="x()">text</b>', true);
  assert(!result.includes('onclick'));
  assertIncludes(result, 'text');
});

test('C8: BUG - XSS向量：javascript: 协议未被过滤', () => {
  // cleanHtml 只移除了 on* 事件属性，但 href="javascript:..." 未被处理
  const result = cleanHtml('<a href="javascript:alert(1)">click me</a>');
  console.log(`        Result: ${result}`);
  const hasJsProtocol = result.includes('javascript:');
  if (hasJsProtocol) {
    console.log('        [BUG] javascript: protocol not sanitized - XSS vulnerability');
  }
});

test('C9: BUG - XSS向量：data URI 未被过滤', () => {
  const result = cleanHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>');
  console.log(`        Result: ${result}`);
  const hasDataUri = result.includes('data:text/html');
  if (hasDataUri) {
    console.log('        [BUG] data: URI not sanitized - potential XSS');
  }
});

test('C10: BUG - SVG onload 事件', () => {
  const result = cleanHtml('<svg onload="alert(1)"><circle r="50"/></svg>');
  console.log(`        Result: ${result}`);
  // onload 应该被移除（因为它以 on 开头）
  assert(!result.includes('onload'), 'onload should be removed');
});

// ============================================================
// 3. countWords 测试
// ============================================================
console.log('\n===== countWords 测试 =====\n');

test('W1: 空输入', () => {
  const result = countWords('');
  assertEqual(result.words, 0);
  assertEqual(result.chars, 0);
});

test('W2: null/undefined 输入', () => {
  const r1 = countWords(null);
  assertEqual(r1.words, 0);
  const r2 = countWords(undefined);
  assertEqual(r2.words, 0);
});

test('W3: 纯中文', () => {
  const result = countWords('你好世界');
  assertEqual(result.words, 4, '4 Chinese chars = 4 words');
  assertEqual(result.chars, 4);
});

test('W4: 纯英文', () => {
  const result = countWords('hello world foo');
  assertEqual(result.words, 3, '3 English words');
  assertEqual(result.chars, 15);
});

test('W5: 中英文混合', () => {
  const result = countWords('你好hello世界world');
  assertEqual(result.words, 6, '4 Chinese chars + 2 English words = 6');
  assertEqual(result.chars, 14);
});

test('W6: 含数字', () => {
  const result = countWords('abc123 def');
  assertEqual(result.words, 2, 'abc123 and def are 2 words');
});

test('W7: 含标点符号', () => {
  const result = countWords('你好，世界！');
  assertEqual(result.words, 4, 'punctuation should not count as words');
  assertEqual(result.chars, 6);
});

test('W8: 含连字符的英文词', () => {
  const result = countWords('well-known fact');
  // 正则 /[a-zA-Z0-9-]+/ 会把 well-known 算一个词
  assertEqual(result.words, 2, 'well-known counts as 1 word');
});

test('W9: BUG - 纯标点被错误计数', () => {
  const result = countWords('，。！？');
  console.log(`        Words: ${result.words}, Chars: ${result.chars}`);
  // 中文标点不在 [\u4e00-\u9fa5] 范围内
  // 替换中文后剩余 '    '，匹配 [a-zA-Z0-9-]+ 得到 0
  // 但 chars 是 4
  assertEqual(result.words, 0, 'pure punctuation should be 0 words');
});

// ============================================================
// 4. 组件逻辑分析（静态分析，非运行测试）
// ============================================================
console.log('\n===== 组件逻辑问题分析（静态分析） =====\n');

const issues = [
  {
    severity: 'CRITICAL',
    id: 'BUG-01',
    title: 'replaceAll 使用 innerText 破坏所有HTML格式',
    location: 'line 1010: editor.innerText = newText',
    description: 'replaceAll 函数用 editor.innerText = newText 替换内容，这会销毁所有HTML结构（粗体、斜体、链接、图片、表格等），将富文本变成纯文本。应该使用 TreeWalker 逐个文本节点替换来保留格式。',
  },
  {
    severity: 'CRITICAL',
    id: 'BUG-02',
    title: '查找功能始终落后一个字符（stale closure）',
    location: 'lines 1138-1141: onChange → setFindText → setTimeout(performFind, 100)',
    description: 'performFind 通过 useCallback 捕获了 findText 状态。onChange 中先调用 setFindText 更新状态，然后用 setTimeout 调用 performFind。但在 setTimeout 执行时，performFind 闭包中的 findText 仍然是旧值（React 状态更新是异步的）。结果：每次搜索都落后一个字符。',
  },
  {
    severity: 'CRITICAL',
    id: 'BUG-03',
    title: 'XSS 漏洞：用户输入直接插入 HTML 未转义',
    location: 'lines 611-619: handleModalConfirm 中 insertHTML',
    description: '插入链接时: `<a href="${url}">${text}</a>`，插入图片时: `<img src="${url}" alt="${alt}">`。用户输入未经 HTML 转义直接拼接，攻击者可注入 `"><script>alert(1)</script>` 作为 URL 或文本，实现 XSS 攻击。',
  },
  {
    severity: 'HIGH',
    id: 'BUG-04',
    title: 'handleRestoreHtml 同时设置 innerHTML 和 htmlCode 但保持代码视图',
    location: 'lines 488-498: handleRestoreHtml',
    description: '恢复操作同时设置了 editorRef.innerHTML 和 htmlCode，但没有退出代码视图（setShowCode(false)）。此时 textarea 显示恢复的代码，但底层 contentEditable 的 innerHTML 也被改了，导致用户可能困惑：以为恢复了但看到的还是代码视图。此外 originalHtml 在恢复后被清空，无法再次恢复。',
  },
  {
    severity: 'HIGH',
    id: 'BUG-05',
    title: '图片调整手柄位置不随滚动更新',
    location: 'lines 1263-1307: 内联 IIFE 计算手柄位置',
    description: '图片选中边框和拖拽手柄使用 getBoundingClientRect 定位，这是视口坐标。但手柄通过 absolute 定位在编辑器容器内。当编辑器滚动时，手柄位置不会更新（因为不触发 re-render），导致手柄与图片错位。',
  },
  {
    severity: 'HIGH',
    id: 'BUG-06',
    title: '字体选择"默认"（空值）不生效',
    location: 'lines 512-517: handleFontFamily 当 family 为空时跳过 exec',
    description: 'FONT_FAMILIES 第一个选项 value 是空字符串。当用户选择"默认"字体时，handleFontFamily 判断 `if (family)` 为 false，不执行任何操作。已设置字体的文本无法恢复为默认字体。',
  },
  {
    severity: 'HIGH',
    id: 'BUG-07',
    title: '查找替换大小写切换使用旧值（同 BUG-02 类）',
    location: 'lines 1167-1169: caseSensitive onChange → setCaseSensitive → setTimeout(performFind, 100)',
    description: '与查找文本的 stale closure 问题相同。切换"区分大小写"复选框后，performFind 捕获的 caseSensitive 仍是旧值，需要再操作一次才能生效。',
  },
  {
    severity: 'MEDIUM',
    id: 'BUG-08',
    title: '自动保存 useEffect 依赖 wordCount 对象引用',
    location: 'line 329: useEffect deps [isEmpty, wordCount]',
    description: 'wordCount 每次 updateEmptyState 都会创建新对象引用（即使值相同），导致自动保存的 useEffect 每次都重新执行，setTimeout 不断被取消和重建。在快速输入时，实际保存可能被持续延迟。',
  },
  {
    severity: 'MEDIUM',
    id: 'BUG-09',
    title: '清空编辑器不重置格式状态',
    location: 'lines 459-467: handleClear',
    description: 'handleClear 清空内容但没有重置 formatState（bold/italic/underline 等）。清空后工具栏仍显示之前的格式状态，用户开始输入时可能意外继承格式。',
  },
  {
    severity: 'MEDIUM',
    id: 'BUG-10',
    title: 'applyCode 未做 HTML 清理（XSS 入口）',
    location: 'lines 398-404: applyCode 直接设置 innerHTML',
    description: '用户在源码视图中可以输入任意 HTML（包括 <script>、事件处理器等），applyCode 直接将其设为 innerHTML。虽然现代浏览器不执行通过 innerHTML 插入的 <script>，但 onerror、onload 等事件属性仍可执行。cleanHtml 只在导出和复制时使用，此处未调用。',
  },
  {
    severity: 'MEDIUM',
    id: 'BUG-11',
    title: '初始化时的 window.confirm 阻塞渲染',
    location: 'lines 294-309: useEffect 中的 window.confirm',
    description: '组件挂载时在 useEffect 中同步调用 window.confirm。这会阻塞浏览器渲染线程，用户看到的是一个弹窗覆盖在尚未完全渲染的页面上。在 SSR 环境中更成问题（Next.js App Router 首次加载是服务端渲染）。',
  },
  {
    severity: 'LOW',
    id: 'BUG-12',
    title: 'color picker 的 click-outside 可能被 stopPropagation 干扰',
    location: 'lines 1761-1768: ColorPicker click handler',
    description: 'ColorPicker 使用 document mousedown 事件来检测点击外部关闭。但编辑器内多处使用了 e.stopPropagation()（如 toolbar buttons 的 onMouseDown、modal backdrop 的 onClick），可能导致点击这些区域时 ColorPicker 不会关闭。',
  },
  {
    severity: 'LOW',
    id: 'BUG-13',
    title: 'document.execCommand 已弃用',
    location: 'line 365: exec 函数',
    description: '整个编辑器依赖 document.execCommand，该 API 已被 W3C 标记为 deprecated。虽然主流浏览器仍支持，但不保证未来版本继续支持。长期来看需要迁移到基于 Selection/Range API 的实现。',
  },
  {
    severity: 'LOW',
    id: 'BUG-14',
    title: 'handlePaste 传入多余的第二个参数',
    location: 'line 656: cleanHtml(html, true)',
    description: 'cleanHtml 函数签名只接受一个参数 (html)，但 handlePaste 调用时传入了第二个参数 true。虽然不会报错（JS 忽略多余参数），但暗示原作者可能想实现某种"粘贴模式"的差异化处理，实际并未实现。',
  },
];

issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.id}: ${issue.title}`);
  console.log(`  Location: ${issue.location}`);
  console.log(`  ${issue.description}`);
  console.log('');
});

// ============================================================
// 汇总
// ============================================================
console.log('\n===== 测试汇总 =====\n');
console.log(`Total:  ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => {
    console.log(`  - ${f.name}: ${f.error}`);
  });
}

console.log(`\nStatic analysis found ${issues.length} issues:`);
const bySeverity = {};
issues.forEach(i => {
  bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
});
Object.entries(bySeverity).forEach(([sev, count]) => {
  console.log(`  ${sev}: ${count}`);
});
