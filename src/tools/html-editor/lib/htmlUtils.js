/**
 * HTML 编辑器工具函数库
 * 包含 HTML 安全过滤、格式化、清理、转义等纯函数
 */

import DOMPurify from 'dompurify';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'div',
    'span',
    'b',
    'i',
    'u',
    's',
    'strong',
    'em',
    'br',
    'hr',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'caption',
    'colgroup',
    'col',
    'font',
    'center',
  ],
  ALLOWED_ATTR: [
    'href',
    'src',
    'alt',
    'title',
    'style',
    'align',
    'colspan',
    'rowspan',
    'target',
    'rel',
    'width',
    'height',
    'size',
    'color',
    'face',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'svg',
    'form',
    'input',
    'textarea',
    'select',
    'button',
    'style',
    'link',
    'meta',
    'base',
  ],
  // DOMPurify 默认已拦截 javascript:/vbscript: 协议；data: 仅允许图片
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

// 安全过滤：移除危险标签、事件属性、危险协议（XSS 防护主力）
export function sanitizeHtml(html) {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR 防护：DOMPurify 依赖 window
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

// HTML 格式化函数：美化代码结构，添加缩进和换行
export function formatHtml(html) {
  if (!html) return '';

  // 块级标签（需要独占一行）
  const blockTags = new Set([
    'div',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'table',
    'tr',
    'tbody',
    'thead',
    'tfoot',
    'blockquote',
    'pre',
    'hr',
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'nav',
    'main',
    'figure',
    'figcaption',
    'dl',
    'dt',
    'dd',
    'form',
    'fieldset',
    'legend',
  ]);

  // 自闭合标签
  const selfClosingTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

  let result = '';
  let indent = 0;
  const indentStr = '  ';

  // 先将所有标签统一格式（小写）
  const tokens = html.match(/<[^>]+>|[^<]+/g) || [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 文本节点
    if (!token.startsWith('<')) {
      const trimmed = token.trim();
      if (trimmed) {
        result += indentStr.repeat(indent) + trimmed + '\n';
      }
      continue;
    }

    // 注释
    if (token.startsWith('<!--')) {
      result += indentStr.repeat(indent) + token + '\n';
      continue;
    }

    // 自闭合标签
    if (
      selfClosingTags.has(token.match(/^<\/?(\w+)/)?.[1]?.toLowerCase()) ||
      token.endsWith('/>')
    ) {
      result += indentStr.repeat(indent) + token + '\n';
      continue;
    }

    // 结束标签
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      result += indentStr.repeat(indent) + token + '\n';
      continue;
    }

    // 开始标签
    const tagName = token.match(/^<(\w+)/)?.[1]?.toLowerCase();
    result += indentStr.repeat(indent) + token + '\n';

    // 如果是块级标签，增加缩进
    if (tagName && blockTags.has(tagName)) {
      indent++;
    }
  }

  return result.trim();
}

// HTML 清理函数：用于粘贴和输出时清理垃圾
// 安全过滤由 sanitizeHtml（DOMPurify）负责，本函数仅做格式清理
export function cleanHtml(html) {
  if (!html) return '';

  const container = document.createElement('div');
  container.innerHTML = sanitizeHtml(html);

  // 1. 移除残留事件属性（双保险，DOMPurify 已处理大部分）
  container.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
      // 校验 href/src 协议：拦截残留的 javascript:/vbscript:
      if ((attr.name === 'href' || attr.name === 'src') && !isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // 2. 将废弃的 <font> 标签转换为 <span> + inline style
  container.querySelectorAll('font').forEach((font) => {
    const span = document.createElement('span');
    const size = font.getAttribute('size');
    const color = font.getAttribute('color');
    const face = font.getAttribute('face');
    const existingStyle = font.getAttribute('style') || '';
    let style = existingStyle;
    if (size) {
      const sizeMap = {
        1: '10px',
        2: '13px',
        3: '16px',
        4: '18px',
        5: '24px',
        6: '32px',
        7: '48px',
      };
      style += `font-size:${sizeMap[size] || '16px'};`;
    }
    if (color) style += `color:${color};`;
    if (face) style += `font-family:${face};`;
    if (style) span.setAttribute('style', style);
    Array.from(font.attributes).forEach((attr) => {
      if (!['size', 'color', 'face', 'style'].includes(attr.name)) {
        span.setAttribute(attr.name, attr.value);
      }
    });
    while (font.firstChild) span.appendChild(font.firstChild);
    font.replaceWith(span);
  });

  // 3. 将 <center> 标签转换为 <div style="text-align:center">
  container.querySelectorAll('center').forEach((center) => {
    const div = document.createElement('div');
    const existingStyle = center.getAttribute('style') || '';
    div.setAttribute('style', `text-align:center;${existingStyle}`);
    while (center.firstChild) div.appendChild(center.firstChild);
    center.replaceWith(div);
  });

  // 4. 移除空的 style 属性
  container.querySelectorAll('[style=""]').forEach((el) => {
    el.removeAttribute('style');
  });

  // 5. 移除空的行内包装元素（不含文本、不含图片/br/hr）
  const inlineTags = ['b', 'i', 'u', 's', 'strong', 'em', 'span'];
  let changed = true;
  while (changed) {
    changed = false;
    container.querySelectorAll(inlineTags.join(',')).forEach((el) => {
      if (
        !el.textContent.trim() &&
        !el.querySelector('img, br, hr, table') &&
        el.children.length === 0
      ) {
        el.remove();
        changed = true;
      }
    });
  }

  return container.innerHTML;
}

// HTML 实体转义（防止 XSS）
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL 安全检查（防止 javascript: 等危险协议）
export function isSafeUrl(url) {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  if (trimmed.startsWith('data:')) {
    return trimmed.startsWith('data:image/');
  }
  return true;
}
