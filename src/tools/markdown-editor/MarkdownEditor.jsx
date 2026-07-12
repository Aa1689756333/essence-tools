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
  Eye, EyeOff, Columns,
  CheckSquare,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function ToolbarBtn({ icon: Icon, onClick, active, title }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-[30px] h-[30px] rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 ${
        active
          ? 'bg-gray-200 text-gray-800'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      <Icon className="w-[15px] h-[15px]" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />;
}

export default function MarkdownEditor() {
  const { theme } = useTheme();
  const textareaRef = useRef(null);
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'edit' | 'preview' | 'split'
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [history, setHistory] = useState(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  const renderedHtml = useMemo(() => {
    if (!markdown.trim()) return '';
    const raw = marked.parse(markdown);
    return DOMPurify.sanitize(raw);
  }, [markdown]);

  const isEmpty = !markdown.trim();

  const pushHistory = useCallback((value) => {
    if (isUndoRedo) return;
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(value);
      if (newHistory.length > 200) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = Math.min(prev + 1, 199);
      return newIndex;
    });
  }, [historyIndex, isUndoRedo]);

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setMarkdown(value);
    pushHistory(value);
  }, [pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    setIsUndoRedo(true);
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setMarkdown(history[newIndex]);
    setTimeout(() => setIsUndoRedo(false), 0);
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    setIsUndoRedo(true);
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setMarkdown(history[newIndex]);
    setTimeout(() => setIsUndoRedo(false), 0);
  }, [historyIndex, history]);

  const insertAtCursor = useCallback((before, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.substring(start, end);
    const text = selected || placeholder;
    const newText = markdown.substring(0, start) + before + text + after + markdown.substring(end);
    setMarkdown(newText);
    pushHistory(newText);
    setTimeout(() => {
      ta.focus();
      const cursorPos = start + before.length;
      ta.setSelectionRange(cursorPos, cursorPos + text.length);
    }, 0);
  }, [markdown, pushHistory]);

  const insertAtLineStart = useCallback((prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = markdown.lastIndexOf('\n', start - 1) + 1;
    const newText = markdown.substring(0, lineStart) + prefix + markdown.substring(lineStart);
    setMarkdown(newText);
    pushHistory(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [markdown, pushHistory]);

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
  const handleCodeBlock = useCallback(() => insertAtCursor('\n```\n', '\n```\n', '代码块'), [insertAtCursor]);
  const handleLink = useCallback(() => insertAtCursor('[', '](https://)', '链接文本'), [insertAtCursor]);
  const handleImage = useCallback(() => insertAtCursor('![', '](https://)', '图片描述'), [insertAtCursor]);
  const handleHr = useCallback(() => insertAtCursor('\n---\n', '', ''), [insertAtCursor]);
  const handleTask = useCallback(() => insertAtLineStart('- [ ] '), [insertAtLineStart]);

  const handleClear = useCallback(() => {
    setMarkdown('');
    pushHistory('');
    textareaRef.current?.focus();
  }, [pushHistory]);

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

  const handleCopyHtml = useCallback(() => {
    const html = renderedHtml;
    navigator.clipboard.writeText(html).then(() => {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 1500);
    });
  }, [renderedHtml]);

  const handleExportMd = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown]);

  const handleExportHtml = useCallback(() => {
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
    pre { background: #f6f8fa; padding: 1em; border-radius: 6px; overflow-x: auto; }
    code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre code { background: transparent; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1em; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f6f8fa; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [renderedHtml]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); handleBold(); }
      else if (e.key === 'i') { e.preventDefault(); handleItalic(); }
      else if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo(); }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ', '', '');
    }
  }, [handleBold, handleItalic, handleUndo, handleRedo, insertAtCursor]);

  const wordCount = useMemo(() => {
    if (!markdown.trim()) return 0;
    return markdown.trim().split(/\s+/).length;
  }, [markdown]);

  const lineCount = useMemo(() => {
    if (!markdown) return 1;
    return markdown.split('\n').length;
  }, [markdown]);

  return (
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">Markdown 编辑器</h1>
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          编写 Markdown 语法，实时预览渲染效果，支持导出为 Markdown 或 HTML 文件。
        </p>
      </div>

      {/* 编辑器容器 */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* 工具栏 */}
        <div className="border-b border-gray-200 bg-gray-50/80 px-2 sm:px-3 py-2">
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarBtn icon={Undo2} onClick={handleUndo} title="撤销 (Ctrl+Z)" />
            <ToolbarBtn icon={Redo2} onClick={handleRedo} title="恢复 (Ctrl+Y)" />
            <ToolbarDivider />

            <ToolbarBtn icon={Heading1} onClick={handleH1} title="标题 1" />
            <ToolbarBtn icon={Heading2} onClick={handleH2} title="标题 2" />
            <ToolbarBtn icon={Heading3} onClick={handleH3} title="标题 3" />
            <ToolbarDivider />

            <ToolbarBtn icon={Bold} onClick={handleBold} title="加粗 (Ctrl+B)" />
            <ToolbarBtn icon={Italic} onClick={handleItalic} title="斜体 (Ctrl+I)" />
            <ToolbarBtn icon={Strikethrough} onClick={handleStrike} title="删除线" />
            <ToolbarDivider />

            <ToolbarBtn icon={List} onClick={handleUl} title="无序列表" />
            <ToolbarBtn icon={ListOrdered} onClick={handleOl} title="有序列表" />
            <ToolbarBtn icon={CheckSquare} onClick={handleTask} title="任务列表" />
            <ToolbarBtn icon={Quote} onClick={handleQuote} title="引用" />
            <ToolbarDivider />

            <ToolbarBtn icon={Code} onClick={handleInlineCode} title="行内代码" />
            <ToolbarBtn icon={Code2} onClick={handleCodeBlock} title="代码块" />
            <ToolbarBtn icon={Link} onClick={handleLink} title="链接" />
            <ToolbarBtn icon={Image} onClick={handleImage} title="图片" />
            <ToolbarBtn icon={Minus} onClick={handleHr} title="分割线" />
            <ToolbarDivider />

            {/* 视图切换 */}
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                onMouseDown={(e) => { e.preventDefault(); setViewMode('edit'); }}
                title="仅编辑"
                className={`h-[30px] px-2 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 text-[12px] ${
                  viewMode === 'edit' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">编辑</span>
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); setViewMode('split'); }}
                title="分屏"
                className={`h-[30px] px-2 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 text-[12px] ${
                  viewMode === 'split' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">分屏</span>
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); setViewMode('preview'); }}
                title="仅预览"
                className={`h-[30px] px-2 rounded-md flex items-center gap-1 cursor-pointer transition-all duration-150 text-[12px] ${
                  viewMode === 'preview' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">预览</span>
              </button>
            </div>
          </div>
        </div>

        {/* 编辑/预览区域 */}
        <div className="md-editor-body">
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`md-editor-pane ${viewMode === 'split' ? 'md-editor-pane--split' : ''}`}>
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-[14px] text-gray-300">点击此处开始编写 Markdown...</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="md-textarea"
                spellCheck={false}
                placeholder=""
              />
            </div>
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`md-preview-pane ${viewMode === 'split' ? 'md-preview-pane--split' : ''}`}>
              {isEmpty ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-[14px] text-gray-300">预览区域</span>
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
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[12px] text-gray-400">
          <span>{isEmpty ? '暂无内容' : `${lineCount} 行 · ${wordCount} 词`}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleClear}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">清空</span>
          </button>
          <button
            onClick={handleCopyMarkdown}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedMd ? '已复制!' : '复制 MD'}</span>
          </button>
          <button
            onClick={handleCopyHtml}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copiedHtml ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Code2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedHtml ? '已复制!' : '复制 HTML'}</span>
          </button>
          <button
            onClick={handleExportMd}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-[7px] rounded-lg text-[12.5px] font-medium text-gray-500 border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出 MD</span>
          </button>
          <button
            onClick={handleExportHtml}
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
  );
}
