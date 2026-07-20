'use client';

import './styles.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/shell/ThemeProvider';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Heading1, Heading2, Heading3,
  Undo2, Redo2,
  Code, Download, Eye, EyeOff, Trash2,
  Indent, Outdent,
  Minus,
  Type,
  Link, Image, Table,
  X, Upload, Globe, Sparkles, Quote, Terminal,
  Maximize, Minimize, Search, Replace, ChevronDown, ChevronUp,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { safeGetItem, safeSetItemWithRetry, safeRemoveItem } from '@/lib/storage';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'div', 'span', 'b', 'i', 'u', 's', 'strong', 'em', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    'font', 'center',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'style', 'align', 'colspan', 'rowspan',
    'target', 'rel', 'width', 'height',
    'size', 'color', 'face',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'textarea', 'select', 'button', 'style', 'link', 'meta', 'base'],
  // DOMPurify 默认已拦截 javascript:/vbscript: 协议；data: 仅允许图片
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

// 安全过滤：移除危险标签、事件属性、危险协议（XSS 防护主力）
function sanitizeHtml(html) {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR 防护：DOMPurify 依赖 window
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

// HTML 格式化函数：美化代码结构，添加缩进和换行
function formatHtml(html) {
  if (!html) return '';
  
  // 块级标签（需要独占一行）
  const blockTags = new Set([
    'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'table', 'tr', 'tbody', 'thead', 'tfoot',
    'blockquote', 'pre', 'hr', 'section', 'article', 'aside',
    'header', 'footer', 'nav', 'main', 'figure', 'figcaption',
    'dl', 'dt', 'dd', 'form', 'fieldset', 'legend'
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
    if (selfClosingTags.has(token.match(/^<\/?(\w+)/)?.[1]?.toLowerCase()) || token.endsWith('/>')) {
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
function cleanHtml(html) {
  if (!html) return '';

  const container = document.createElement('div');
  container.innerHTML = sanitizeHtml(html);

  // 1. 移除残留事件属性（双保险，DOMPurify 已处理大部分）
  container.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
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
  
  // 3. 将 <center> 标签转换为 <div style="text-align:center">
  container.querySelectorAll('center').forEach(center => {
    const div = document.createElement('div');
    const existingStyle = center.getAttribute('style') || '';
    div.setAttribute('style', `text-align:center;${existingStyle}`);
    while (center.firstChild) div.appendChild(center.firstChild);
    center.replaceWith(div);
  });
  
  // 4. 移除空的 style 属性
  container.querySelectorAll('[style=""]').forEach(el => {
    el.removeAttribute('style');
  });
  
  // 5. 移除空的行内包装元素（不含文本、不含图片/br/hr）
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

// 字数统计函数
function countWords(text) {
  if (!text) return { words: 0, chars: 0 };
  
  // 字符数（含空格和标点）
  const chars = text.length;
  
  // 字数：中文单字 + 英文单词
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9-]+/g) || []).length;
  const words = chineseChars + englishWords;
  
  return { words, chars };
}

// HTML 实体转义（防止 XSS）
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL 安全检查（防止 javascript: 等危险协议）
function isSafeUrl(url) {
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

const FONT_SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px','36px','48px'];
const FONT_FAMILIES = [
  { label: '默认', value: '' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

const COLORS = [
  '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff',
  '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff','#ff00ff',
  '#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc',
  '#dd7e6b','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8','#b4a7d6','#d5a6bd',
  '#cc4125','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3','#c27ba0',
];

function ToolbarBtn({ icon: Icon, onClick, active, title }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      aria-label={title}
      aria-pressed={active !== undefined ? !!active : undefined}
      className={`w-[30px] h-[30px] rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 ${
        active
          ? 'bg-bg-primary border border-border text-text font-semibold'
          : 'text-text-secondary hover:bg-bg-primary hover:text-text'
      }`}
    >
      <Icon className="w-[15px] h-[15px]" aria-hidden="true" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

function ToolbarSelect({ value, options, onChange, title, width }) {
  return (
    <select
      value={value}
      title={title}
      aria-label={title}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className="h-[30px] rounded-md border border-border bg-card text-[12px] text-text px-1.5 cursor-pointer hover:border-border-hover focus:outline-none transition-colors"
      style={{ width: width || 'auto' }}
    >
      {options.map(opt => (
        <option key={opt.value ?? opt.label} value={opt.value ?? opt.label} className="bg-card text-text">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Modal({ isOpen, onClose, title, children, theme }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl min-w-[320px] max-w-[90vw] max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function HtmlEditor() {
  const { theme } = useTheme();
  const editorRef = useRef(null);
  const [showCode, setShowCode] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState('16px');
  const [fontFamily, setFontFamily] = useState('');
  const [formatState, setFormatState] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
    alignLeft: false, alignCenter: false, alignRight: false, alignJustify: false,
    unorderedList: false, orderedList: false,
    h1: false, h2: false, h3: false, p: false,
  });
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [tableMenu, setTableMenu] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [imageTab, setImageTab] = useState('upload'); // 'upload' | 'url'
  const [isOptimized, setIsOptimized] = useState(false);
  const [originalHtml, setOriginalHtml] = useState('');
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const dragStateRef = useRef(null);
  const imageToolbarRef = useRef(null);
  const [scrollTick, setScrollTick] = useState(0);
  const autoSaveTimerRef = useRef(null);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const findInputRef = useRef(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const savedContentRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    // 检查是否有未保存的内容
    const savedContent = safeGetItem('html-editor-content');
    if (savedContent && editorRef.current) {
      savedContentRef.current = savedContent;
      setShowRestoreModal(true);
    }
  }, []);

  // 更新空状态与字数统计（提前定义，供 handleRestoreConfirm 引用）
  const updateEmptyState = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setIsEmpty(!content || content === '<br>' || content === '<div><br></div>');
    const text = editorRef.current.innerText || '';
    setWordCount(countWords(text));
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (editorRef.current && savedContentRef.current) {
      editorRef.current.innerHTML = cleanHtml(savedContentRef.current);
      updateEmptyState();
    }
    setShowRestoreModal(false);
    savedContentRef.current = null;
  }, [updateEmptyState]);

  const handleRestoreDismiss = useCallback(() => {
    safeRemoveItem('html-editor-content');
    setShowRestoreModal(false);
    savedContentRef.current = null;
  }, []);

  // 自动保存：内容变化时防抖写入 localStorage
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (editorRef.current && !isEmpty) {
        const content = editorRef.current.innerHTML;
        const result = safeSetItemWithRetry('html-editor-content', content);
        if (result.ok) {
          setLastSavedTime(new Date());
          setSaveError(false);
        } else {
          // 配额超限或隐私模式：不中断编辑，仅提示
          setSaveError(true);
        }
      }
    }, 2000); // 2秒防抖

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isEmpty, wordCount.words, wordCount.chars]); // 监听内容变化（使用原始值避免对象引用问题）

  // 检测当前格式状态
  useEffect(() => {
    let timeoutId = null;
    const updateFormatState = () => {
      if (!editorRef.current || showCode) return;

      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) return;

      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight: document.queryCommandState('justifyRight'),
        alignJustify: document.queryCommandState('justifyFull'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
        h1: document.queryCommandValue('formatBlock') === 'h1',
        h2: document.queryCommandValue('formatBlock') === 'h2',
        h3: document.queryCommandValue('formatBlock') === 'h3',
        p: document.queryCommandValue('formatBlock') === 'p' || document.queryCommandValue('formatBlock') === 'div',
      });
    };

    const handleSelectionChange = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateFormatState, 100);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showCode]);

  const exec = useCallback((cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
    updateEmptyState();
  }, []);

  const handleInput = useCallback(() => {
    updateEmptyState();
    if (showCode && editorRef.current) {
      setHtmlCode(editorRef.current.innerHTML);
    }
  }, [showCode, updateEmptyState]);

  const toggleCodeView = useCallback(() => {
    if (!showCode && editorRef.current) {
      setHtmlCode(editorRef.current.innerHTML);
    }
    setShowCode(!showCode);
  }, [showCode]);

  const handleCodeChange = useCallback((e) => {
    setHtmlCode(e.target.value);
  }, []);

  const applyCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = cleanHtml(htmlCode);
      updateEmptyState();
      setShowCode(false);
    }
  }, [htmlCode, updateEmptyState]);

  const handleExport = useCallback(() => {
    // 在源码模式下使用 htmlCode，在预览模式下使用 editorRef.current.innerHTML
    const rawHtml = showCode ? htmlCode : (editorRef.current?.innerHTML || '');
    const html = cleanHtml(rawHtml); // 清洁 HTML 输出
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [showCode, htmlCode]);

  const handleCopyHtml = useCallback(() => {
    // 在源码模式下使用 htmlCode，在预览模式下使用 editorRef.current.innerHTML
    const rawHtml = showCode ? htmlCode : (editorRef.current?.innerHTML || '');
    const html = cleanHtml(rawHtml); // 清洁 HTML 输出
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [showCode, htmlCode]);

  const handleClear = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.focus();
      setIsEmpty(true);
      setHtmlCode('');
      setFormatState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        alignLeft: false,
        alignCenter: false,
        alignRight: false,
        alignJustify: false,
        unorderedList: false,
        orderedList: false,
        h1: false,
        h2: false,
        h3: false,
        p: false,
      });
      setFontSize('');
      setFontFamily('');
      localStorage.removeItem('html-editor-content');
    }
  }, []);

  const handleOptimizeHtml = useCallback(() => {
    if (showCode) {
      // 源码模式下格式化 htmlCode
      setOriginalHtml(htmlCode);
      const formatted = formatHtml(htmlCode);
      setHtmlCode(formatted);
      setIsOptimized(true);
    } else if (editorRef.current) {
      // 预览模式下先清理再格式化
      const rawHtml = editorRef.current.innerHTML;
      setOriginalHtml(rawHtml);
      const cleaned = cleanHtml(rawHtml);
      const formatted = formatHtml(cleaned);
      setHtmlCode(formatted);
      setShowCode(true);
      setIsOptimized(true);
    }
  }, [showCode, htmlCode]);

  const handleRestoreHtml = useCallback(() => {
    if (originalHtml) {
      setHtmlCode(originalHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = originalHtml;
        updateEmptyState();
      }
      setShowCode(false);
      setIsOptimized(false);
    }
  }, [originalHtml, updateEmptyState]);

  const handleFontSize = useCallback((size) => {
    setFontSize(size);
    exec('fontSize', '7');
    const editor = editorRef.current;
    if (!editor) return;
    const fonts = editor.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      font.removeAttribute('size');
      font.style.fontSize = size;
    });
  }, [exec]);

  const handleFontFamily = useCallback((family) => {
    setFontFamily(family);
    if (family) {
      exec('fontName', family);
    } else {
      exec('removeFormat');
    }
  }, [exec]);

  const handleColor = useCallback((color) => {
    exec('foreColor', color);
  }, [exec]);

  const handleBgColor = useCallback((color) => {
    exec('hiliteColor', color);
  }, [exec]);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer) {
        savedRangeRef.current = range.cloneRange();
        return;
      }
    }
    if (!savedRangeRef.current) {
      editor.focus();
      const newSelection = window.getSelection();
      if (newSelection.rangeCount > 0) {
        savedRangeRef.current = newSelection.getRangeAt(0).cloneRange();
      } else {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        savedRangeRef.current = range;
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    if (savedRangeRef.current) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        savedRangeRef.current = range;
        window.getSelection().addRange(range);
      }
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      savedRangeRef.current = range;
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  const handleInsertLink = useCallback(() => {
    saveSelection();
    const selection = window.getSelection();
    const selectedText = selection.toString();
    setModalData({ type: 'link', url: 'https://', text: selectedText });
    setModalType('link');
  }, [saveSelection]);

  const handleInsertImage = useCallback(() => {
    saveSelection();
    setModalData({ type: 'image', url: 'https://', alt: '', isBase64: false });
    setImageTab('upload');
    setModalType('image');
  }, [saveSelection]);

  const handleInsertHr = useCallback(() => {
    exec('insertHorizontalRule');
  }, [exec]);

  const handleInsertTable = useCallback(() => {
    saveSelection();
    setModalData({ type: 'table', rows: 3, cols: 3 });
    setModalType('table');
  }, [saveSelection]);

  const handleModalConfirm = useCallback(() => {
    restoreSelection();

    if (modalType === 'link') {
      const { url, text } = modalData;
      if (url && url !== 'https://' && isSafeUrl(url)) {
        if (text) {
          exec('insertHTML', `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`);
        } else {
          exec('createLink', url);
        }
      }
    } else if (modalType === 'image') {
      const { url, alt } = modalData;
      if (url && url !== 'https://' && isSafeUrl(url)) {
        exec('insertHTML', `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt || '')}" style="max-width:100%;height:auto" />`);
      }
    } else if (modalType === 'table') {
      const r = parseInt(modalData.rows);
      const c = parseInt(modalData.cols);
      if (isNaN(r) || isNaN(c) || r < 1 || c < 1) return;

      let table = '<table style="border-collapse:collapse;width:100%;margin:8px 0">';
      for (let i = 0; i < r; i++) {
        table += '<tr>';
        for (let j = 0; j < c; j++) {
          const tag = i === 0 ? 'th' : 'td';
          table += `<${tag} style="border:1px solid #ddd;padding:8px;text-align:left">${i === 0 ? '标题' : ''}</${tag}>`;
        }
        table += '</tr>';
      }
      table += '</table><p><br></p>';
      exec('insertHTML', table);
    }
    setModalType(null);
    setModalData({});
    savedRangeRef.current = null;
  }, [modalType, modalData, exec, restoreSelection]);

  const handleModalCancel = useCallback(() => {
    setModalType(null);
    setModalData({});
  }, []);

  // 粘贴处理：智能保留格式并清理垃圾代码
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    if (html) {
      // 清理 HTML 并插入
      const cleanedHtml = cleanHtml(html);
      if (cleanedHtml) {
        exec('insertHTML', cleanedHtml);
      } else {
        exec('insertText', text);
      }
    } else {
      exec('insertText', text);
    }
  }, [exec]);

  // 表格右键菜单处理
  const handleContextMenu = useCallback((e) => {
    const target = e.target;
    if (target.tagName === 'TD' || target.tagName === 'TH') {
      e.preventDefault();
      setSelectedCell(target);
      setTableMenu({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleAddRow = useCallback(() => {
    if (!selectedCell) return;
    const row = selectedCell.closest('tr');
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    const newRow = table.insertRow(row.rowIndex + 1);
    const cols = row.cells.length;
    for (let i = 0; i < cols; i++) {
      const cell = newRow.insertCell();
      cell.style.border = '1px solid #ddd';
      cell.style.padding = '8px';
      cell.innerHTML = '&nbsp;';
    }
    setTableMenu(null);
    setSelectedCell(null);
  }, [selectedCell]);

  const handleAddCol = useCallback(() => {
    if (!selectedCell) return;
    const table = selectedCell.closest('table');
    const cellIndex = selectedCell.cellIndex;
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const cell = row.insertCell(cellIndex + 1);
      cell.style.border = '1px solid #ddd';
      cell.style.padding = '8px';
      cell.innerHTML = i === 0 ? '标题' : '&nbsp;';
      if (i === 0) {
        const newTh = document.createElement('th');
        newTh.style.border = '1px solid #ddd';
        newTh.style.padding = '8px';
        newTh.innerHTML = '标题';
        cell.replaceWith(newTh);
      }
    }
    setTableMenu(null);
    setSelectedCell(null);
  }, [selectedCell]);

  const handleDeleteRow = useCallback(() => {
    if (!selectedCell) return;
    const row = selectedCell.closest('tr');
    if (!row) return;
    const table = row.closest('table');
    if (!table) return;
    if (table.rows.length > 1) {
      row.remove();
    }
    setTableMenu(null);
    setSelectedCell(null);
  }, [selectedCell]);

  const handleDeleteCol = useCallback(() => {
    if (!selectedCell) return;
    const table = selectedCell.closest('table');
    const cellIndex = selectedCell.cellIndex;
    for (let i = table.rows.length - 1; i >= 0; i--) {
      const row = table.rows[i];
      if (row.cells.length > 1) {
        row.deleteCell(cellIndex);
      }
    }
    setTableMenu(null);
    setSelectedCell(null);
  }, [selectedCell]);

  const handleDeleteTable = useCallback(() => {
    if (!selectedCell) return;
    const table = selectedCell.closest('table');
    table.remove();
    setTableMenu(null);
    setSelectedCell(null);
  }, [selectedCell]);

  // 点击其他地方关闭表格菜单
  useEffect(() => {
    const handleClick = () => {
      setTableMenu(null);
      setSelectedCell(null);
    };
    if (tableMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [tableMenu]);

  // 图片点击处理
  const handleEditorClick = useCallback((e) => {
    const target = e.target;
    if (target.tagName === 'IMG' && editorRef.current?.contains(target)) {
      setSelectedImage(target);
      setImageSize({
        width: target.offsetWidth,
        height: target.offsetHeight
      });
    } else {
      setSelectedImage(null);
    }
  }, []);

  const handleEditorScroll = useCallback(() => {
    if (!selectedImage || !editorRef.current) return;
    
    const imgRect = selectedImage.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    const left = imgRect.left - editorRect.left;
    const top = imgRect.top - editorRect.top + editorRef.current.scrollTop;
    
    const borderEl = document.getElementById('image-selected-border');
    if (borderEl) {
      borderEl.style.left = `${left}px`;
      borderEl.style.top = `${top}px`;
      borderEl.style.width = `${imgRect.width}px`;
      borderEl.style.height = `${imgRect.height}px`;
    }
    
    ['nw', 'ne', 'sw', 'se'].forEach(corner => {
      const handleEl = document.getElementById(`image-resize-handle-${corner}`);
      if (handleEl) {
        const isTop = corner.includes('n');
        const isLeft = corner.includes('w');
        handleEl.style.left = isLeft ? `${left - 6}px` : `${left + imgRect.width - 6}px`;
        handleEl.style.top = isTop ? `${top - 6}px` : `${top + imgRect.height - 6}px`;
      }
    });

    if (imageToolbarRef.current) {
      const toolbarHeight = 36;
      const margin = 12;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - imgRect.bottom;
      const showBelow = spaceBelow >= toolbarHeight + margin;
      const toolbarTop = showBelow
        ? imgRect.bottom + margin
        : imgRect.top - toolbarHeight - margin;
      
      let toolbarLeft = imgRect.left + imgRect.width / 2;
      const estimatedToolbarWidth = 280;
      const actualToolbarWidth = imageToolbarRef.current.offsetWidth || estimatedToolbarWidth;
      const halfWidth = actualToolbarWidth / 2;
      const padding = 8;

      const toolbarLeftEdge = toolbarLeft - halfWidth;
      const toolbarRightEdge = toolbarLeft + halfWidth;

      if (toolbarLeftEdge < padding) {
        toolbarLeft = halfWidth + padding;
      } else if (toolbarRightEdge > viewportWidth - padding) {
        toolbarLeft = viewportWidth - halfWidth - padding;
      }

      imageToolbarRef.current.style.left = `${toolbarLeft}px`;
      imageToolbarRef.current.style.top = `${toolbarTop}px`;
    }
  }, [selectedImage]);

  // 开始拖拽调整图片大小
  const handleResizeStart = useCallback((e, corner) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImage) return;

    const rect = selectedImage.getBoundingClientRect();
    const aspectRatio = rect.width / rect.height;

    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      aspectRatio,
      corner
    };

    const handleMouseMove = (moveEvent) => {
      if (!dragStateRef.current || !selectedImage) return;

      const { startX, startY, startWidth, startHeight, aspectRatio, corner } = dragStateRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth, newHeight;

      // 根据拖拽角落计算新尺寸
      if (corner === 'se' || corner === 'ne') {
        newWidth = startWidth + deltaX;
      } else {
        newWidth = startWidth - deltaX;
      }

      // 保持宽高比
      newHeight = newWidth / aspectRatio;

      // 最小尺寸约束
      const minWidth = 50;
      const maxWidth = editorRef.current?.offsetWidth || 800;
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = newWidth / aspectRatio;

      // 应用新尺寸
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = `${newHeight}px`;

      // 更新显示尺寸
      setImageSize({
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      updateEmptyState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selectedImage, updateEmptyState]);

  const handleImagePresetSize = useCallback((percent) => {
    if (!selectedImage || !editorRef.current) return;
    const editorWidth = editorRef.current.clientWidth;
    const newWidth = Math.max(50, editorWidth * percent / 100);
    const aspectRatio = selectedImage.offsetWidth / selectedImage.offsetHeight;
    const newHeight = newWidth / aspectRatio;
    selectedImage.style.width = `${newWidth}px`;
    selectedImage.style.height = `${newHeight}px`;
    setImageSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
    updateEmptyState();
  }, [selectedImage, updateEmptyState]);

  const handleImageAlign = useCallback((align) => {
    if (!selectedImage) return;
    const img = selectedImage;
    img.removeAttribute('align');
    if (align === 'left') {
      img.style.cssText = img.style.cssText.replace(/margin[^;]+;?/g, '').replace(/display[^;]+;?/g, '');
      img.style.float = 'left';
      img.style.margin = '0 12px 8px 0';
    } else if (align === 'right') {
      img.style.cssText = img.style.cssText.replace(/margin[^;]+;?/g, '').replace(/display[^;]+;?/g, '');
      img.style.float = 'right';
      img.style.margin = '0 0 8px 12px';
    } else {
      img.style.cssText = img.style.cssText.replace(/float[^;]+;?/g, '').replace(/margin[^;]+;?/g, '');
      img.style.display = 'block';
      img.style.margin = '1em auto';
    }
    updateEmptyState();
  }, [selectedImage, updateEmptyState]);

  const fontSizeOptions = FONT_SIZES.map(s => ({ label: s, value: s }));
  const fontFamilyOptions = FONT_FAMILIES.map(f => ({ label: f.label, value: f.value }));

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 高亮匹配项
  const highlightMatch = useCallback((match) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const text = editor.innerText || '';
    const beforeText = text.substring(0, match.index);
    const lines = beforeText.split('\n');
    const lineIndex = lines.length - 1;
    const charIndex = lines[lineIndex].length;

    // 使用 Range API 定位并滚动到匹配项
    const range = document.createRange();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let targetNode = null;
    let targetOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent.length;

      if (currentOffset + nodeLength > match.index) {
        targetNode = node;
        targetOffset = match.index - currentOffset;
        break;
      }
      currentOffset += nodeLength;
    }

    if (targetNode) {
      try {
        range.setStart(targetNode, targetOffset);
        range.setEnd(targetNode, targetOffset + match.length);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // 滚动到可见区域
        const rect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        if (rect.top < editorRect.top || rect.bottom > editorRect.bottom) {
          range.startContainer.parentElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      } catch (e) {
        console.error('Highlight error:', e);
      }
    }
  }, []);

  // 查找文本
  const performFind = useCallback(() => {
    if (!findText || !editorRef.current) {
      setFindMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const editor = editorRef.current;
    const text = editor.innerText || '';
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0]
      });
    }

    setFindMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);

    // 高亮第一个匹配
    if (matches.length > 0) {
      highlightMatch(matches[0]);
    }
  }, [findText, caseSensitive, highlightMatch]);

  // 自动查找：findText 或 caseSensitive 变化时触发（加防抖优化性能）
  useEffect(() => {
    if (!showFindReplace) return;
    const timer = setTimeout(() => {
      performFind();
    }, 250);
    return () => clearTimeout(timer);
  }, [findText, caseSensitive, showFindReplace, performFind]);

  // 上一个匹配项
  const findPrevious = useCallback(() => {
    if (findMatches.length === 0) return;
    const newIndex = currentMatchIndex <= 0 ? findMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    highlightMatch(findMatches[newIndex]);
  }, [findMatches, currentMatchIndex, highlightMatch]);

  // 下一个匹配项
  const findNext = useCallback(() => {
    if (findMatches.length === 0) return;
    const newIndex = currentMatchIndex >= findMatches.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    highlightMatch(findMatches[newIndex]);
  }, [findMatches, currentMatchIndex, highlightMatch]);

  // 替换当前匹配项
  const replaceCurrent = useCallback(() => {
    if (currentMatchIndex < 0 || !editorRef.current) return;

    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    const match = findMatches[currentMatchIndex];

    if (selectedText === match.text) {
      range.deleteContents();
      range.insertNode(document.createTextNode(replaceText));
      performFind(); // 重新查找
    }
  }, [currentMatchIndex, findMatches, replaceText, performFind]);

  // 替换所有匹配项（保留 HTML 格式）
  const replaceAll = useCallback(() => {
    if (findMatches.length === 0 || !editorRef.current) return;

    const editor = editorRef.current;
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const original = node.textContent;
      const replaced = original.replace(regex, replaceText);
      if (replaced !== original) {
        node.textContent = replaced;
      }
    });

    updateEmptyState();
    setFindMatches([]);
    setCurrentMatchIndex(-1);
  }, [findMatches, findText, replaceText, caseSensitive, updateEmptyState]);

  // 关闭查找替换面板
  const closeFindReplace = useCallback(() => {
    setShowFindReplace(false);
    setFindText('');
    setReplaceText('');
    setFindMatches([]);
    setCurrentMatchIndex(-1);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+F 打开查找
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
        setTimeout(() => findInputRef.current?.focus(), 100);
      }
      // Esc 退出全屏或关闭查找面板
      if (e.key === 'Escape') {
        if (showFindReplace) {
          closeFindReplace();
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace, isFullscreen, closeFindReplace]);

  return (
    <div className="w-full">
      {/* 页面标题 */}
      {!isFullscreen && (
        <div className="mb-4 md:mb-5 lg:mb-6">
          <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">HTML 编辑器</h1>
          <p className="text-[13.5px] text-text-secondary leading-relaxed">
            像 Word 一样编辑富文本内容，支持导出为 HTML 代码。
          </p>
        </div>
      )}

      {/* 编辑器容器 */}
      <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''}`}>
        {/* 工具栏 */}
        <div className="border-b border-gray-200 bg-gray-50/80 px-2 sm:px-3 py-2">
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarBtn icon={Undo2} onClick={() => exec('undo')} title="撤销 (Ctrl+Z)" />
            <ToolbarBtn icon={Redo2} onClick={() => exec('redo')} title="恢复 (Ctrl+Y)" />
            <ToolbarDivider />

            <ToolbarSelect
              value={fontFamily}
              options={fontFamilyOptions}
              onChange={handleFontFamily}
              title="字体"
              width="100px"
            />
            <ToolbarSelect
              value={fontSize}
              options={fontSizeOptions}
              onChange={handleFontSize}
              title="字号"
              width="70px"
            />
            <ToolbarDivider />

            <ToolbarBtn icon={Bold} onClick={() => exec('bold')} active={formatState.bold} title="加粗 (Ctrl+B)" />
            <ToolbarBtn icon={Italic} onClick={() => exec('italic')} active={formatState.italic} title="斜体 (Ctrl+I)" />
            <ToolbarBtn icon={Underline} onClick={() => exec('underline')} active={formatState.underline} title="下划线 (Ctrl+U)" />
            <ToolbarBtn icon={Strikethrough} onClick={() => exec('strikeThrough')} active={formatState.strikethrough} title="删除线" />
            <ToolbarDivider />

            <ToolbarBtn icon={Heading1} onClick={() => exec('formatBlock', 'h1')} active={formatState.h1} title="标题 1" />
            <ToolbarBtn icon={Heading2} onClick={() => exec('formatBlock', 'h2')} active={formatState.h2} title="标题 2" />
            <ToolbarBtn icon={Heading3} onClick={() => exec('formatBlock', 'h3')} active={formatState.h3} title="标题 3" />
            <ToolbarBtn icon={Type} onClick={() => exec('formatBlock', 'p')} active={formatState.p} title="正文" />
            <ToolbarDivider />

            <ToolbarBtn icon={AlignLeft} onClick={() => exec('justifyLeft')} active={formatState.alignLeft} title="左对齐" />
            <ToolbarBtn icon={AlignCenter} onClick={() => exec('justifyCenter')} active={formatState.alignCenter} title="居中" />
            <ToolbarBtn icon={AlignRight} onClick={() => exec('justifyRight')} active={formatState.alignRight} title="右对齐" />
            <ToolbarBtn icon={AlignJustify} onClick={() => exec('justifyFull')} active={formatState.alignJustify} title="两端对齐" />
            <ToolbarDivider />

            <ToolbarBtn icon={List} onClick={() => exec('insertUnorderedList')} active={formatState.unorderedList} title="无序列表" />
            <ToolbarBtn icon={ListOrdered} onClick={() => exec('insertOrderedList')} active={formatState.orderedList} title="有序列表" />
            <ToolbarBtn icon={Outdent} onClick={() => exec('outdent')} title="减少缩进" />
            <ToolbarBtn icon={Indent} onClick={() => exec('indent')} title="增加缩进" />
            <ToolbarDivider />

            <ToolbarBtn icon={Quote} onClick={() => exec('formatBlock', 'blockquote')} title="引用块" />
            <ToolbarBtn icon={Terminal} onClick={() => exec('formatBlock', 'pre')} title="代码块" />
            <ToolbarDivider />

            <ToolbarBtn icon={Minus} onClick={handleInsertHr} title="分割线" />
            <ToolbarBtn icon={Code} onClick={toggleCodeView} active={showCode} title="HTML 源码" />
            <ToolbarDivider />

            <ColorPicker icon="A" label="文字颜色" colors={COLORS} onSelect={handleColor} theme={theme} />
            <ColorPicker icon="BG" label="背景颜色" colors={COLORS} onSelect={handleBgColor} theme={theme} isBg />
            <ToolbarDivider />
            <ToolbarBtn icon={Link} onClick={handleInsertLink} title="插入链接" />
            <ToolbarBtn icon={Image} onClick={handleInsertImage} title="插入图片" />
            <ToolbarBtn icon={Table} onClick={handleInsertTable} title="插入表格" />
            <ToolbarDivider />
            <ToolbarBtn icon={Search} onClick={() => setShowFindReplace(!showFindReplace)} active={showFindReplace} title="查找替换 (Ctrl+F)" />
            <ToolbarBtn icon={isFullscreen ? Minimize : Maximize} onClick={toggleFullscreen} active={isFullscreen} title={isFullscreen ? "退出全屏 (Esc)" : "全屏编辑"} />
          </div>
        </div>

        {/* 查找替换面板 */}
        {showFindReplace && (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={findInputRef}
                  type="text"
                  value={findText}
                  onChange={(e) => {
                    setFindText(e.target.value);
                  }}
                  placeholder="查找内容"
                  className="flex-1 h-[32px] px-3 rounded-md border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
                />
                <button
                  onClick={findPrevious}
                  disabled={findMatches.length === 0}
                  className="px-2 py-1 text-[12px] text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="上一个"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={findNext}
                  disabled={findMatches.length === 0}
                  className="px-2 py-1 text-[12px] text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="下一个"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-gray-500">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => {
                      setCaseSensitive(e.target.checked);
                    }}
                    className="w-3.5 h-3.5"
                  />
                  区分大小写
                </label>
                {findMatches.length > 0 && (
                  <span className="text-gray-400">
                    {currentMatchIndex + 1} / {findMatches.length}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="替换为"
                className="flex-1 h-[32px] px-3 rounded-md border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              />
              <button
                onClick={replaceCurrent}
                disabled={currentMatchIndex < 0}
                className="px-3 py-1 text-[12px] text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.accent }}
              >
                替换
              </button>
              <button
                onClick={replaceAll}
                disabled={findMatches.length === 0}
                className="px-3 py-1 text-[12px] text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.accent }}
              >
                全部替换
              </button>
              <button
                onClick={closeFindReplace}
                className="px-2 py-1 text-[12px] text-gray-500 hover:text-gray-700"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 编辑区域 */}
        <div className={`relative ${isFullscreen ? 'flex-1 overflow-hidden flex flex-col' : ''}`}>
          {isEmpty && !showCode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-[14px] text-gray-300">点击此处开始编辑内容...</span>
            </div>
          )}
          {showCode ? (
            <div className={`code-view ${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
              <textarea
                value={htmlCode}
                onChange={handleCodeChange}
                className={`w-full p-3 sm:p-4 font-mono text-[13px] text-gray-700 bg-gray-50 resize-none focus:outline-none border-none leading-relaxed ${isFullscreen ? 'flex-1' : 'h-[400px] sm:h-[500px]'}`}
                spellCheck={false}
              />
              <div className="flex gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={applyCode}
                  className="px-4 py-[6px] rounded-md text-[12px] font-semibold text-white cursor-pointer transition-all"
                  style={{ backgroundColor: theme.accent }}
                >
                  应用修改
                </button>
                <button
                  onClick={() => setShowCode(false)}
                  className="px-4 py-[6px] rounded-md text-[12px] font-semibold text-gray-500 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              onClick={handleEditorClick}
              onScroll={handleEditorScroll}
              className={`editor-content ${isFullscreen ? 'flex-1 max-h-none' : ''}`}
              spellCheck={false}
              role="textbox"
              aria-multiline="true"
              aria-label="HTML 编辑区域"
            />
          )}

          {/* 图片调整手柄 */}
          {selectedImage && !showCode && (() => {
            const imgRect = selectedImage.getBoundingClientRect();
            const editorRect = editorRef.current?.getBoundingClientRect();
            if (!editorRect) return null;

            const left = imgRect.left - editorRect.left;
            const top = imgRect.top - editorRect.top + editorRef.current.scrollTop;
            const width = imgRect.width;
            const height = imgRect.height;

            return (
              <>
                {/* 选中边框 */}
                <div
                  id="image-selected-border"
                  className="absolute pointer-events-none border-2 border-blue-500 z-40"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`
                  }}
                />
                {/* 四角手柄 */}
                {['nw', 'ne', 'sw', 'se'].map(corner => {
                  const isTop = corner.includes('n');
                  const isLeft = corner.includes('w');
                  const cursor = corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize';

                  return (
                    <div
                      key={corner}
                      id={`image-resize-handle-${corner}`}
                      onMouseDown={(e) => handleResizeStart(e, corner)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm z-50 hover:bg-blue-100"
                      style={{
                        left: isLeft ? `${left - 6}px` : `${left + width - 6}px`,
                        top: isTop ? `${top - 6}px` : `${top + height - 6}px`,
                        cursor
                      }}
                    />
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* 底部操作栏 */}
        <div className={`flex items-center justify-between flex-wrap gap-2 ${isFullscreen ? 'px-4 py-3 border-t border-gray-200 bg-gray-50' : 'mt-4'}`}>
          <div className="text-[12px] text-gray-400 flex items-center gap-3">
            {isEmpty ? '暂无内容' : `${wordCount.words} 字 / ${wordCount.chars} 字符`}
            {saveError && !isEmpty ? (
              <span className="text-amber-500" title="localStorage 配额超限或被禁用，内容不会自动保存，请及时导出">
                · 自动保存已暂停（存储空间不足）
              </span>
            ) : lastSavedTime && !isEmpty && (
              <span className="text-gray-300">
                · 自动保存于 {lastSavedTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleOptimizeHtml}
              disabled={isEmpty}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="格式化 HTML 代码，添加缩进和换行"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">格式化代码</span>
            </button>
            {isOptimized && (
              <button
                onClick={handleRestoreHtml}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-orange-600 border border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 hover:border-orange-300 transition-all"
                title="恢复到格式化前的代码"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">恢复</span>
              </button>
            )}
            <button
              onClick={handleClear}
              disabled={isEmpty}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">清空</span>
            </button>
            <button
              onClick={handleCopyHtml}
              disabled={isEmpty}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copied ? '已复制!' : '复制 HTML'}</span>
            </button>
            <button
              onClick={() => {
                if (showCode) {
                  setShowCode(false);
                } else {
                  toggleCodeView();
                }
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              {showCode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showCode ? '预览' : '查看源码'}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={isEmpty}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-[7px] rounded-lg text-[12.5px] font-semibold text-white cursor-pointer transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{
                backgroundColor: theme.accent,
                boxShadow: `0 1px 3px rgba(${theme.shadow}, 0.25)`,
              }}
              onMouseEnter={(e) => {
                if (!isEmpty) {
                  e.currentTarget.style.backgroundColor = theme.hover;
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(${theme.shadow}, 0.3)`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 1px 3px rgba(${theme.shadow}, 0.25)`;
              }}
            >
              <Download className="w-3.5 h-3.5" />
              导出 HTML
            </button>
          </div>
        </div>
      </div>

      {/* 图片浮动工具栏 - 使用 Portal 渲染到 body 避免被裁剪 */}
      {selectedImage && !showCode && createPortal(
        (() => {
          const imgRect = selectedImage.getBoundingClientRect();
          const toolbarHeight = 36;
          const margin = 12;
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // 判断下方是否有足够空间
          const spaceBelow = viewportHeight - imgRect.bottom;
          const showBelow = spaceBelow >= toolbarHeight + margin;

          // 计算垂直位置
          const toolbarTop = showBelow
            ? imgRect.bottom + margin
            : imgRect.top - toolbarHeight - margin;

          // 计算水平位置，居中对准图片
          let toolbarLeft = imgRect.left + imgRect.width / 2;

          // 使用实际工具栏宽度（如果可用），否则使用估算值
          const estimatedToolbarWidth = 280;
          const actualToolbarWidth = imageToolbarRef.current?.offsetWidth || estimatedToolbarWidth;
          const halfWidth = actualToolbarWidth / 2;
          const padding = 8;

          // 确保不超出视口边界
          const toolbarLeftEdge = toolbarLeft - halfWidth;
          const toolbarRightEdge = toolbarLeft + halfWidth;

          if (toolbarLeftEdge < padding) {
            toolbarLeft = halfWidth + padding;
          } else if (toolbarRightEdge > viewportWidth - padding) {
            toolbarLeft = viewportWidth - halfWidth - padding;
          }

          return (
            <div
              ref={imageToolbarRef}
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-2 z-[9999]"
              style={{
                left: `${toolbarLeft}px`,
                top: `${toolbarTop}px`,
                transform: 'translateX(-50%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 尺寸显示 */}
              <span className="text-xs text-gray-500 px-1">
                {imageSize.width}×{imageSize.height}
              </span>
              {/* 分隔线 */}
              <div className="w-px h-4 bg-gray-200" />
              {/* 预设尺寸 */}
              {[25, 50, 75, 100].map(percent => (
                <button
                  key={percent}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleImagePresetSize(percent);
                  }}
                  className="px-2 py-1 text-xs text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  {percent}%
                </button>
              ))}
              {/* 分隔线 */}
              <div className="w-px h-4 bg-gray-200" />
              {/* 对齐按钮 */}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleImageAlign('left');
                }}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="左对齐"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleImageAlign('center');
                }}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="居中"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleImageAlign('right');
                }}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="右对齐"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          );
        })(),
        document.body
      )}

      {/* 表格右键菜单 */}
      {tableMenu && (
        <div
          className="fixed z-[200] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]"
          style={{ left: tableMenu.x, top: tableMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleAddRow} className="w-full px-3 py-1.5 text-left text-[13px] text-gray-700 hover:bg-gray-100 transition-colors">
            向下插入行
          </button>
          <button onClick={handleAddCol} className="w-full px-3 py-1.5 text-left text-[13px] text-gray-700 hover:bg-gray-100 transition-colors">
            向右插入列
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button onClick={handleDeleteRow} className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors">
            删除行
          </button>
          <button onClick={handleDeleteCol} className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors">
            删除列
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button onClick={handleDeleteTable} className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors">
            删除表格
          </button>
        </div>
      )}



      {/* 恢复确认模态框 */}
      <Modal isOpen={showRestoreModal} onClose={handleRestoreDismiss} title="恢复内容" theme={theme}>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">检测到未保存的内容，是否恢复？</p>
          <div className="flex gap-2">
            <button
              onClick={handleRestoreConfirm}
              className="flex-1 h-9 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all"
              style={{ backgroundColor: theme.accent }}
            >
              恢复
            </button>
            <button
              onClick={handleRestoreDismiss}
              className="flex-1 h-9 rounded-lg text-sm font-semibold text-gray-500 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
            >
              丢弃
            </button>
          </div>
        </div>
      </Modal>

      {/* 模态框 */}
      <Modal isOpen={modalType === 'link'} onClose={handleModalCancel} title="插入链接" theme={theme}>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5">链接地址</label>
            <input
              type="text"
              value={modalData.url || ''}
              onChange={(e) => setModalData({ ...modalData, url: e.target.value })}
              className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              placeholder="https://"
            />
          </div>
          {modalData.text && (
            <div>
              <label className="block text-[13px] text-gray-600 mb-1.5">链接文本</label>
              <input
                type="text"
                value={modalData.text || ''}
                onChange={(e) => setModalData({ ...modalData, text: e.target.value })}
                className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleModalConfirm}
              className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all"
              style={{ backgroundColor: theme.accent }}
            >
              确定
            </button>
            <button
              onClick={handleModalCancel}
              className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-gray-500 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'image'} onClose={handleModalCancel} title="插入图片" theme={theme}>
        <div className="space-y-3">
          {/* Tab 切换 */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setImageTab('upload')}
              className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${
                imageTab === 'upload'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              本地上传
            </button>
            <button
              onClick={() => setImageTab('url')}
              className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${
                imageTab === 'url'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              网络图片
            </button>
          </div>

          {/* 本地上传 */}
          {imageTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result;
                      setModalData({ ...modalData, url: base64, isBase64: true });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result;
                      setModalData({ ...modalData, url: base64, isBase64: true });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-[13px] text-gray-600 mb-1">
                  {modalData.url && modalData.isBase64 ? '已选择图片' : '点击选择或拖拽图片到此处'}
                </p>
                <p className="text-[12px] text-gray-400">支持 JPG、PNG、GIF 等格式</p>
                {modalData.url && modalData.isBase64 && (
                  <div className="mt-3">
                    <img
                      src={modalData.url}
                      alt="预览"
                      className="max-w-[200px] max-h-[150px] mx-auto rounded border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 网络图片 */}
          {imageTab === 'url' && (
            <div>
              <label className="block text-[13px] text-gray-600 mb-1.5">图片地址</label>
              <input
                type="text"
                value={modalData.url || ''}
                onChange={(e) => setModalData({ ...modalData, url: e.target.value, isBase64: false })}
                className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
                placeholder="https://"
              />
              {modalData.url && !modalData.isBase64 && modalData.url !== 'https://' && (
                <div className="mt-3">
                  <img
                    src={modalData.url}
                    alt="预览"
                    className="max-w-[200px] max-h-[150px] mx-auto rounded border border-gray-200"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5">替代文本 (可选)</label>
            <input
              type="text"
              value={modalData.alt || ''}
              onChange={(e) => setModalData({ ...modalData, alt: e.target.value })}
              className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              placeholder="图片描述"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleModalConfirm}
              disabled={!modalData.url || (imageTab === 'url' && modalData.url === 'https://')}
              className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.accent }}
            >
              确定
            </button>
            <button
              onClick={handleModalCancel}
              className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-gray-500 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'table'} onClose={handleModalCancel} title="插入表格" theme={theme}>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5">行数</label>
            <input
              type="number"
              value={modalData.rows || 3}
              onChange={(e) => setModalData({ ...modalData, rows: e.target.value })}
              className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              min="1"
              max="20"
            />
          </div>
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5">列数</label>
            <input
              type="number"
              value={modalData.cols || 3}
              onChange={(e) => setModalData({ ...modalData, cols: e.target.value })}
              className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              min="1"
              max="10"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleModalConfirm}
              className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all"
              style={{ backgroundColor: theme.accent }}
            >
              确定
            </button>
            <button
              onClick={handleModalCancel}
              className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-gray-500 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ColorPicker({ icon, label, colors, onSelect, theme, isBg }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }}
        title={label}
        className="w-[30px] h-[30px] rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 relative"
      >
        <span className="text-[11px] font-bold">{icon}</span>
        <span
          className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-3.5 h-[3px] rounded-sm"
          style={{ backgroundColor: isBg ? '#fde68a' : theme.accent }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 w-[180px]">
          <div className="grid grid-cols-10 gap-[2px]">
            {colors.map(color => (
              <button
                key={color}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(color);
                  setOpen(false);
                }}
                className="w-4 h-4 rounded-sm border border-gray-200 cursor-pointer hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
