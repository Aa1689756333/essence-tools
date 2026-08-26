'use client';

import './styles.css';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTheme } from '@/shell/ThemeProvider';
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  Quote, Code, Code2,
  Link, Image, Minus,
  Undo2, Redo2,
  Download, Copy, Check, Trash2,
  Eye, Columns,
  CheckSquare, Maximize, Minimize,
  X, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { countWords } from '@/lib/utils';
import 'highlight.js/styles/github.css';

import { safeGetItem, safeSetItemWithRetry, safeRemoveItem } from '@/lib/storage';
import { ToolbarBtn, ToolbarDivider } from '@/components/ui/Toolbar';

// 使用实例而非全局配置，避免污染其他使用 marked 的代码
const md = new Marked({ breaks: true, gfm: true });

// 通用模态框（与 html-editor 对齐，支持暗黑模式和可访问性）
function Modal({ isOpen, onClose, title, children, theme }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl min-w-[320px] max-w-[90vw] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 id="modal-title" className="text-[15px] font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="关闭弹窗"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:bg-bg hover:text-text transition-colors border border-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// 历史记录配置
const HISTORY_LIMIT = 200;
const HISTORY_DEBOUNCE_MS = 500;

export default function MarkdownEditor() {
  const { theme } = useTheme();
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'edit' | 'preview' | 'split'
  const [copiedMd, setCopiedMd] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const savedContentRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  // 查找替换
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const findInputRef = useRef(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  // 历史记录使用 Ref 保证同步更新，防止闭包失效
  const historyRef = useRef(['']);
  const historyIndexRef = useRef(0);
  const historyTimerRef = useRef(null);
  const pendingValueRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // 监听窗口尺寸检测移动端 & 安全配置 DOMPurify 防止 tabnapping
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    if (typeof window !== 'undefined') {
      DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if ('target' in node) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      });
    }
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端分屏时强制 fallback 到编辑模式
  useEffect(() => {
    if (isMobile && viewMode === 'split') {
      setViewMode('edit');
    }
  }, [isMobile, viewMode]);

  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (!markdown.trim()) {
      setRenderedHtml('');
      return;
    }
    
    if (typeof window === 'undefined') return;

    const render = () => {
      const raw = md.parse(markdown);
      const clean = DOMPurify.sanitize(raw, {
        FORBID_TAGS: ['form', 'style', 'script'],
        ADD_ATTR: ['target', 'rel'],
        ALLOW_DATA_ATTR: false
      });
      setRenderedHtml(clean);
    };

    let idleCallbackId;
    let timeoutId;
    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(render, { timeout: 1000 });
    } else {
      timeoutId = setTimeout(render, 50);
    }

    return () => {
      if (idleCallbackId) window.cancelIdleCallback(idleCallbackId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [markdown]);

  const isEmpty = !markdown.trim();

  // 立即提交一条历史记录（用于工具栏操作、清空等原子动作）
  const commitHistory = useCallback((value) => {
    const idx = historyIndexRef.current;
    const newHistory = historyRef.current.slice(0, idx + 1);
    newHistory.push(value);
    if (newHistory.length > HISTORY_LIMIT) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    const nextIdx = newHistory.length - 1;
    historyIndexRef.current = nextIdx;
    setHistoryIndex(nextIdx);
  }, []);

  // 防抖提交：500ms 内的连续输入合并为一条历史
  const pushHistory = useCallback((value) => {
    pendingValueRef.current = value;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      historyTimerRef.current = null;
      if (pendingValueRef.current !== null) {
        commitHistory(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    }, HISTORY_DEBOUNCE_MS);
  }, [commitHistory]);

  // 立即冲刷待处理的防抖历史（撤销/重做/工具栏操作前调用）
  const flushHistory = useCallback(() => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      if (pendingValueRef.current !== null) {
        commitHistory(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    }
  }, [commitHistory]);

  // 组件卸载时冲刷，避免丢失最后一段未提交的历史
  useEffect(() => {
    return () => flushHistory();
  }, [flushHistory]);

  // 关闭查找替换面板（提前定义，供 Esc useEffect 引用）
  const closeFindReplace = useCallback(() => { setShowFindReplace(false); setFindMatches([]); setCurrentMatchIndex(-1); }, []);

  // Esc：关闭查找替换面板 / 退出全屏
  useEffect(() => {
    if (!isFullscreen && !showFindReplace) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showFindReplace) closeFindReplace();
        else if (isFullscreen) setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen, showFindReplace, closeFindReplace]);

  const toggleFullscreen = useCallback(() => setIsFullscreen(p => !p), []);

  // 启动时检测未保存的内容
  useEffect(() => {
    const saved = safeGetItem('md-editor-content');
    if (saved) {
      savedContentRef.current = saved;
      setShowRestoreModal(true);
    }
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (savedContentRef.current !== null) {
      setMarkdown(savedContentRef.current);
      commitHistory(savedContentRef.current);
    }
    setShowRestoreModal(false);
    savedContentRef.current = null;
  }, [commitHistory]);

  const handleRestoreDismiss = useCallback(() => { safeRemoveItem('md-editor-content'); setShowRestoreModal(false); savedContentRef.current = null; }, []);

  // 自动保存：内容变化 2 秒防抖写入 localStorage
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!isEmpty) {
        const result = safeSetItemWithRetry('md-editor-content', markdown);
        if (result.ok) {
          setLastSavedTime(new Date());
          setSaveError(false);
        } else {
          // 配额超限或隐私模式：不中断编辑，仅提示
          setSaveError(true);
        }
      }
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [markdown, isEmpty]);

  // 代码语法高亮：渲染后对 <pre><code> 元素调用 hljs，并按需加载
  useEffect(() => {
    if (!previewRef.current || !renderedHtml) return;
    const blocks = previewRef.current.querySelectorAll('pre code');
    if (blocks.length === 0) return;

    let mounted = true;

    const highlightBlocks = async () => {
      if (!window.hljs) {
        const [
          { default: hljs },
          { default: javascript },
          { default: css },
          { default: xml },
          { default: json }
        ] = await Promise.all([
          import('highlight.js/lib/core'),
          import('highlight.js/lib/languages/javascript'),
          import('highlight.js/lib/languages/css'),
          import('highlight.js/lib/languages/xml'),
          import('highlight.js/lib/languages/json')
        ]);
        
        hljs.registerLanguage('javascript', javascript);
        hljs.registerLanguage('css', css);
        hljs.registerLanguage('xml', xml);
        hljs.registerLanguage('json', json);
        window.hljs = hljs;
      }

      if (!mounted) return;

      blocks.forEach((block) => {
        if (!block.dataset.highlighted) {
          window.hljs.highlightElement(block);
          block.dataset.highlighted = 'true';
        }
      });
    };

    highlightBlocks();

    return () => {
      mounted = false;
    };
  }, [renderedHtml, viewMode]);

  // 编辑区 ↔ 预览区 滚动同步（分屏模式，比例映射）
  const syncScroll = useCallback((source) => {
    if (isSyncingScroll.current || viewMode !== 'split') return;
    const editor = textareaRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    isSyncingScroll.current = true;
    const maxSrc = source.scrollHeight - source.clientHeight;
    const ratio = maxSrc > 0 ? source.scrollTop / maxSrc : 0;
    if (source === editor) {
      const maxPreview = preview.scrollHeight - preview.clientHeight;
      preview.scrollTop = ratio * maxPreview;
    } else {
      const maxEditor = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = ratio * maxEditor;
    }
    requestAnimationFrame(() => { isSyncingScroll.current = false; });
  }, [viewMode]);

  // ===== 查找替换 =====
  const performFind = useCallback(() => {
    if (!findText) { setFindMatches([]); setCurrentMatchIndex(-1); return; }
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escaped, flags);
    const matches = [];
    let m;
    while ((m = regex.exec(markdown)) !== null) {
      matches.push({ index: m.index, length: m[0].length });
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
    setFindMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [findText, caseSensitive, markdown]);

  // 匹配变化时重新查找
  useEffect(() => {
    if (showFindReplace) performFind();
  }, [showFindReplace, findText, caseSensitive, performFind]);

  // 高亮当前匹配项
  useEffect(() => {
    if (currentMatchIndex < 0 || !findMatches[currentMatchIndex]) return;
    const match = findMatches[currentMatchIndex];
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(match.index, match.index + match.length);
    const linesBefore = markdown.substring(0, match.index).split('\n').length;
    const lineHeight = 24;
    ta.scrollTop = Math.max(0, (linesBefore - 1) * lineHeight - ta.clientHeight / 3);
  }, [currentMatchIndex, findMatches, markdown]);

  const findNext = useCallback(() => {
    if (findMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % findMatches.length);
  }, [findMatches]);

  const findPrev = useCallback(() => {
    if (findMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + findMatches.length) % findMatches.length);
  }, [findMatches]);

  const replaceCurrent = useCallback(() => {
    if (currentMatchIndex < 0 || !findMatches[currentMatchIndex]) return;
    const match = findMatches[currentMatchIndex];
    const newText = markdown.substring(0, match.index) + replaceText + markdown.substring(match.index + match.length);
    setMarkdown(newText);
    flushHistory();
    commitHistory(newText);
  }, [currentMatchIndex, findMatches, replaceText, markdown, flushHistory, commitHistory]);

  const replaceAll = useCallback(() => {
    if (!findText) return;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escaped, flags);
    const newText = markdown.replace(regex, replaceText);
    if (newText !== markdown) {
      setMarkdown(newText);
      flushHistory();
      commitHistory(newText);
    }
    setFindMatches([]);
    setCurrentMatchIndex(-1);
  }, [findText, replaceText, caseSensitive, markdown, flushHistory, commitHistory]);

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setMarkdown(value);
    pushHistory(value);
  }, [pushHistory]);

  const handleUndo = useCallback(() => {
    flushHistory();
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const newIndex = idx - 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    setMarkdown(historyRef.current[newIndex]);
  }, [flushHistory]);

  const handleRedo = useCallback(() => {
    flushHistory();
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    const newIndex = idx + 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    setMarkdown(historyRef.current[newIndex]);
  }, [flushHistory]);

  const insertAtCursor = useCallback((before, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.substring(start, end);
    const text = selected || placeholder;
    const newText = markdown.substring(0, start) + before + text + after + markdown.substring(end);
    setMarkdown(newText);
    // 工具栏操作是原子动作：先冲刷待处理的输入历史，再立即提交
    flushHistory();
    commitHistory(newText);
    setTimeout(() => {
      ta.focus();
      const cursorPos = start + before.length;
      ta.setSelectionRange(cursorPos, cursorPos + text.length);
    }, 0);
  }, [markdown, flushHistory, commitHistory]);

  const insertAtLineStart = useCallback((prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = markdown.lastIndexOf('\n', start - 1) + 1;
    const newText = markdown.substring(0, lineStart) + prefix + markdown.substring(lineStart);
    setMarkdown(newText);
    flushHistory();
    commitHistory(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [markdown, flushHistory, commitHistory]);

  const handleBold = useCallback(() => insertAtCursor('**', '**', '粗体文本'), [insertAtCursor]);
  const handleItalic = useCallback(() => insertAtCursor('*', '*', '斜体文本'), [insertAtCursor]);
  const handleStrike = useCallback(() => insertAtCursor('~~', '~~', '删除线文本'), [insertAtCursor]);
  const handleH1 = useCallback(() => insertAtLineStart('# '), [insertAtLineStart]);
  const handleH2 = useCallback(() => insertAtLineStart('## '), [insertAtLineStart]);
  const handleH3 = useCallback(() => insertAtLineStart('### '), [insertAtLineStart]);
  const handleUl = useCallback(() => insertAtLineStart('- '), [insertAtLineStart]);
  const handleOl = useCallback(() => insertAtLineStart('1. '), [insertAtLineStart]);
  const handleQuote = useCallback(() => insertAtLineStart('> '), [insertAtLineStart]);
  const handleInlineCode = useCallback(() => insertAtCursor('`', '`', '代码'), [insertAtCursor]);
  const handleCodeBlock = useCallback(() => {
    // 智能换行：光标不在行首时前置换行，避免代码块紧贴上一行
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? 0;
    const needsNewline = start > 0 && markdown[start - 1] !== '\n';
    insertAtCursor(needsNewline ? '\n```\n' : '```\n', '\n```\n', '代码块');
  }, [insertAtCursor, markdown]);
  const handleLink = useCallback(() => insertAtCursor('[', '](https://)', '链接文本'), [insertAtCursor]);
  const handleImage = useCallback(() => insertAtCursor('![', '](https://)', '图片描述'), [insertAtCursor]);
  const handleHr = useCallback(() => {
    // 智能换行：光标不在行首时前置换行，避免分割线紧贴上一行
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? 0;
    const needsNewline = start > 0 && markdown[start - 1] !== '\n';
    insertAtCursor(needsNewline ? '\n---\n' : '---\n', '', '');
  }, [insertAtCursor, markdown]);
  const handleTask = useCallback(() => insertAtLineStart('- [ ] '), [insertAtLineStart]);

  const handleClear = useCallback(() => {
    if (markdown.trim()) {
      if (!window.confirm('确定要清空输入内容吗？')) {
        return;
      }
    }
    setMarkdown('');
    // 清空是原子操作：先冲刷待处理历史，再立即提交空字符串
    flushHistory();
    commitHistory('');
    localStorage.removeItem('md-editor-content');
    setLastSavedTime(null);
    textareaRef.current?.focus();
  }, [markdown, flushHistory, commitHistory]);

  const handleCopyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 1500);
    });
  }, [markdown]);

  const handleExportMd = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); handleBold(); }
      else if (e.key === 'i') { e.preventDefault(); handleItalic(); }
      else if (e.key === 'f') { e.preventDefault(); setShowFindReplace(true); setTimeout(() => findInputRef.current?.focus(), 100); }
      else if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo(); }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ', '', '');
    }
  }, [handleBold, handleItalic, handleUndo, handleRedo, insertAtCursor]);

  const wordCount = useMemo(() => countWords(markdown), [markdown]);

  return (
    <div className="w-full">
      {/* 页面标题（全屏时隐藏） */}
      {!isFullscreen && (
        <div className="mb-4 md:mb-5 lg:mb-6">
          <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">Markdown 编辑器</h1>
          <p className="text-[13.5px] text-text-secondary leading-relaxed">
            编写 Markdown 语法，实时预览渲染效果，支持导出为 Markdown 文件。
          </p>
        </div>
      )}

      {/* 编辑器容器 */}
      <div className={`rounded-xl border border-border bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none flex flex-col' : ''}`}>
        {/* 工具栏 */}
        <div className="border-b border-border bg-bg/80 px-2 sm:px-3 py-2">
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide" role="toolbar" aria-label="Markdown 编辑工具栏">
            <ToolbarBtn icon={Undo2} onClick={handleUndo} title="撤销 (Ctrl+Z)" variant="gray" />
            <ToolbarBtn icon={Redo2} onClick={handleRedo} title="恢复 (Ctrl+Y)" variant="gray" />
            <ToolbarDivider />

            <ToolbarBtn icon={Heading1} onClick={handleH1} title="标题 1" variant="gray" />
            <ToolbarBtn icon={Heading2} onClick={handleH2} title="标题 2" variant="gray" />
            <ToolbarBtn icon={Heading3} onClick={handleH3} title="标题 3" variant="gray" />
            <ToolbarDivider />

            <ToolbarBtn icon={Bold} onClick={handleBold} title="加粗 (Ctrl+B)" variant="gray" />
            <ToolbarBtn icon={Italic} onClick={handleItalic} title="斜体 (Ctrl+I)" variant="gray" />
            <ToolbarBtn icon={Strikethrough} onClick={handleStrike} title="删除线" variant="gray" />
            <ToolbarDivider />

            <ToolbarBtn icon={List} onClick={handleUl} title="无序列表" variant="gray" />
            <ToolbarBtn icon={ListOrdered} onClick={handleOl} title="有序列表" variant="gray" />
            <ToolbarBtn icon={CheckSquare} onClick={handleTask} title="任务列表" variant="gray" />
            <ToolbarBtn icon={Quote} onClick={handleQuote} title="引用" variant="gray" />
            <ToolbarDivider />

            <ToolbarBtn icon={Code} onClick={handleInlineCode} title="行内代码" variant="gray" />
            <ToolbarBtn icon={Code2} onClick={handleCodeBlock} title="代码块" variant="gray" />
            <ToolbarBtn icon={Link} onClick={handleLink} title="链接" variant="gray" />
            <ToolbarBtn icon={Image} onClick={handleImage} title="图片" variant="gray" />
            <ToolbarBtn icon={Minus} onClick={handleHr} title="分割线" variant="gray" />
            <ToolbarDivider />

            {/* 视图切换 */}
            <div className="flex items-center gap-0.5 ml-auto shrink-0" role="group" aria-label="视图模式">
              <button
                onMouseDown={(e) => { e.preventDefault(); setViewMode('edit'); }}
                title="仅编辑"
                aria-label="仅编辑"
                aria-pressed={viewMode === 'edit'}
                className={`h-[30px] px-2 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 text-[12px] ${
                  viewMode === 'edit' ? 'bg-bg border border-border text-text font-semibold' : 'text-text-secondary hover:bg-bg hover:text-text'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">编辑</span>
              </button>
              {!isMobile && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setViewMode('split'); }}
                  title="分屏"
                  aria-label="分屏"
                  aria-pressed={viewMode === 'split'}
                  className={`h-[30px] px-2 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 text-[12px] ${
                    viewMode === 'split' ? 'bg-bg border border-border text-text font-semibold' : 'text-text-secondary hover:bg-bg hover:text-text'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">分屏</span>
                </button>
              )}
              <button
                onMouseDown={(e) => { e.preventDefault(); setViewMode('preview'); }}
                title="仅预览"
                aria-label="仅预览"
                aria-pressed={viewMode === 'preview'}
                className={`h-[30px] px-2 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 text-[12px] ${
                  viewMode === 'preview' ? 'bg-bg border border-border text-text font-semibold' : 'text-text-secondary hover:bg-bg hover:text-text'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">预览</span>
              </button>
              <ToolbarDivider />
              <ToolbarBtn
                icon={isFullscreen ? Minimize : Maximize}
                onClick={toggleFullscreen}
                active={isFullscreen}
                title={isFullscreen ? '退出全屏 (Esc)' : '全屏编辑'}
                variant="gray"
              />
            </div>
          </div>
        </div>

        {/* 查找替换面板 */}
        {showFindReplace && (
          <div className="border-b border-border bg-bg/95 px-3 py-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={findInputRef}
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? findPrev() : findNext(); }
                }}
                placeholder="查找..."
                className="flex-1 h-8 px-3 rounded-md text-[13px] bg-card border border-border focus:outline-none focus:border-text-tertiary"
              />
              <button
                onClick={() => setCaseSensitive(prev => !prev)}
                className={`h-8 px-2.5 rounded-md text-[12px] font-medium transition-all ${
                  caseSensitive ? 'bg-gray-200 text-text' : 'text-text-tertiary hover:bg-bg'
                }`}
                title="区分大小写"
              >
                Aa
              </button>
              <span className="text-[12px] text-text-tertiary min-w-[60px] text-center">
                {findText ? `${currentMatchIndex + 1}/${findMatches.length}` : ''}
              </span>
              <ToolbarBtn icon={ChevronUp} onClick={findPrev} title="上一个 (Shift+Enter)" variant="gray" />
              <ToolbarBtn icon={ChevronDown} onClick={findNext} title="下一个 (Enter)" variant="gray" />
              <ToolbarBtn icon={X} onClick={closeFindReplace} title="关闭 (Esc)" variant="gray" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); replaceCurrent(); }
                }}
                placeholder="替换为..."
                className="flex-1 h-8 px-3 rounded-md text-[13px] bg-card border border-border focus:outline-none focus:border-text-tertiary"
              />
              <button
                onClick={replaceCurrent}
                disabled={currentMatchIndex < 0}
                className="h-8 px-3 rounded-md text-[12px] font-medium text-text-secondary bg-card border border-border hover:bg-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                替换
              </button>
              <button
                onClick={replaceAll}
                disabled={!findText}
                className="h-8 px-3 rounded-md text-[12px] font-medium text-text-secondary bg-card border border-border hover:bg-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                全部替换
              </button>
            </div>
          </div>
        )}

        {/* 编辑/预览区域 */}
        <div className={`md-editor-body ${isFullscreen ? 'flex-1 max-h-none' : ''}`}>
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`md-editor-pane ${viewMode === 'split' ? 'md-editor-pane--split' : ''}`}>
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-[14px] text-text-tertiary">点击此处开始编写 Markdown...</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={() => syncScroll(textareaRef.current)}
                className="md-textarea"
                spellCheck={false}
                placeholder=""
                aria-label="Markdown 编辑区"
              />
            </div>
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              ref={previewRef}
              onScroll={() => syncScroll(previewRef.current)}
              className={`md-preview-pane ${viewMode === 'split' ? 'md-preview-pane--split' : ''}`}
              role="region"
              aria-label="预览区"
            >
              {isEmpty ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-[14px] text-text-tertiary">预览区域</span>
                </div>
              ) : (
                <div
                  className="md-preview-content"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className={`flex items-center justify-between flex-wrap gap-2 ${isFullscreen ? 'px-3 py-2 border-t border-border bg-bg' : 'mt-4'}`}>
          <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
            <span>{isEmpty ? '暂无内容' : `${wordCount.words} 字 / ${wordCount.chars} 字符`}</span>
            {saveError && !isEmpty ? (
              <span className="text-amber-500" title="localStorage 配额超限或被禁用，内容不会自动保存，请及时导出">
                · 自动保存已暂停（存储空间不足）
              </span>
            ) : lastSavedTime && !isEmpty && (
              <span className="text-text-tertiary">
                · 自动保存于 {lastSavedTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleClear}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-text-secondary border border-border bg-card cursor-pointer hover:bg-bg hover:border-border-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">清空</span>
          </button>
          <button
            onClick={handleCopyMarkdown}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-text-secondary border border-border bg-card cursor-pointer hover:bg-bg hover:border-border-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedMd ? '已复制!' : '复制 MD'}</span>
          </button>
          <button
            onClick={handleExportMd}
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
            导出 MD
          </button>
        </div>
      </div>
      </div>

      {/* 恢复内容弹窗 */}
      <Modal isOpen={showRestoreModal} onClose={handleRestoreDismiss} title="恢复内容" theme={theme}>
        <div className="space-y-4">
          <p className="text-sm text-text">检测到未保存的内容，是否恢复？</p>
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
              className="flex-1 h-9 rounded-lg text-sm font-semibold text-text-secondary bg-card border border-border cursor-pointer hover:bg-bg transition-all"
            >
              丢弃
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
