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
  X, Sparkles, Quote, Terminal,
  Maximize, Minimize, Search, Replace, ChevronDown, ChevronUp,
} from 'lucide-react';
import { safeGetItem, safeSetItemWithRetry, safeRemoveItem } from '@/lib/storage';
import { countWords } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { Table as TableExtension } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Modal from '@/components/ui/Modal';
import { ToolbarBtn, ToolbarDivider, ToolbarSelect } from '@/components/ui/Toolbar';
import { formatHtml, cleanHtml, escapeHtml, isSafeUrl } from './lib/htmlUtils';
import LinkModal from './components/LinkModal';
import ImageModal from './components/ImageModal';
import TableModal from './components/TableModal';
import EditorToolbar from './components/EditorToolbar';
import FindReplaceBar from './components/FindReplaceBar';
import EditorArea from './components/EditorArea';
import useFindReplace from './hooks/useFindReplace';
import useImageResize from './hooks/useImageResize';

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

export default function HtmlEditor() {
  const { theme } = useTheme();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      FontFamily,
      ImageExtension,
      LinkExtension,
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: '',
    onUpdate: ({ editor }) => handleInput(editor)
  });

  const [showCode, setShowCode] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState('16px');
  const [fontFamily, setFontFamily] = useState('');
  
  const [modalType, setModalType] = useState(null);
  const [linkInitialData, setLinkInitialData] = useState({});
  const [tableMenu, setTableMenu] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [isOptimized, setIsOptimized] = useState(false);
  const [originalHtml, setOriginalHtml] = useState('');
  const savedRangeRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const savedContentRef = useRef(null);

  useEffect(() => {
    // 检查是否有未保存的内容
    const savedContent = safeGetItem('html-editor-content');
    if (savedContent) {
      savedContentRef.current = savedContent;
      setShowRestoreModal(true);
    }
  }, []);

  // 更新空状态与字数统计（提前定义，供 handleRestoreConfirm 引用）
  const debouncedCountWords = useDebouncedCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setWordCount(countWords(text));
  }, 300);

  const updateEmptyState = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setIsEmpty(!content || content === '<br>' || content === '<div><br></div>');
    debouncedCountWords();
  }, [debouncedCountWords]);

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

  const {
    selectedImage,
    imageSize,
    imageToolbarRef,
    handleResizeStart,
    handleImagePresetSize,
    handleImageAlign,
    handleEditorClick,
    handleEditorScroll,
  } = useImageResize({ editor, updateEmptyState });

  const {
    showFindReplace,
    setShowFindReplace,
    findText,
    setFindText,
    replaceText,
    setReplaceText,
    findMatches,
    currentMatchIndex,
    caseSensitive,
    setCaseSensitive,
    findInputRef,
    findNext,
    findPrevious,
    replaceCurrent,
    replaceAll,
    closeFindReplace,
  } = useFindReplace({ editor, updateEmptyState });

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

  

  

  const handleInput = useCallback((editorInstance = editor) => {
    updateEmptyState(editorInstance);
    if (showCode && editorInstance) {
      setHtmlCode(editorInstance.getHTML());
    }
  }, [showCode, updateEmptyState, editor]);

  const toggleCodeView = useCallback(() => {
    if (!showCode && editor) {
      setHtmlCode(editor.getHTML());
    }
    setShowCode(!showCode);
  }, [showCode, editor]);

  const handleCodeChange = useCallback((e) => {
    setHtmlCode(e.target.value);
  }, []);

  const applyCode = useCallback(() => {
    if (editor) {
      editor.commands.setContent(cleanHtml(htmlCode));
      updateEmptyState();
      setShowCode(false);
    }
  }, [htmlCode, updateEmptyState, editor]);

  const handleExport = useCallback(() => {
    // 在源码模式下使用 htmlCode，在预览模式下使用 editorRef.current.innerHTML
    const rawHtml = showCode ? htmlCode : (editor?.getHTML() || '');
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
    const rawHtml = showCode ? htmlCode : (editor?.getHTML() || '');
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
    // TipTap doesn't have a native fontSize extension in StarterKit, requires custom extension or TextStyle inline CSS
    // Skipping complex native fontSize implementation for simplicity if unsupported natively, but we can set inline style if needed.
  }, []);

  const handleFontFamily = useCallback((family) => {
    setFontFamily(family);
    if (family) {
      editor?.chain().focus().setFontFamily(family).run();
    } else {
      editor?.chain().focus().unsetFontFamily().run();
    }
  }, [editor]);

  

  

  

  

  const handleInsertLink = useCallback(() => {
    setLinkInitialData({ url: 'https://', text: '' });
    setModalType('link');
  }, []);

  const handleInsertImage = useCallback(() => {
    setModalType('image');
  }, []);

  const handleInsertHr = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
  }, [editor]);

  const handleInsertTable = useCallback(() => {
    setModalType('table');
  }, []);

  const handleLinkConfirm = useCallback(({ url, text }) => {
    if (url && url !== 'https://' && isSafeUrl(url)) {
       editor?.chain().focus().setLink({ href: url }).run();
       if (text) {
         editor?.chain().focus().insertContent(text).run();
       }
    }
    setModalType(null);
  }, [editor]);

  const handleImageConfirm = useCallback(({ url, alt }) => {
    if (url && url !== 'https://' && isSafeUrl(url)) {
      editor?.chain().focus().setImage({ src: url, alt }).run();
    }
    setModalType(null);
  }, [editor]);

  const handleTableConfirm = useCallback(({ rows, cols }) => {
    const r = parseInt(rows);
    const c = parseInt(cols);
    if (!isNaN(r) && !isNaN(c) && r > 0 && c > 0) {
      editor?.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
    }
    setModalType(null);
  }, [editor]);

  const handleModalCancel = useCallback(() => {
    setModalType(null);
  }, []);

  // 粘贴处理：智能保留格式并清理垃圾代码
  const handlePaste = useCallback((e) => {
    // Tiptap handles paste mostly, we don't need manual preventDefault unless we want to override.
  }, []);

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

  const fontSizeOptions = FONT_SIZES.map(s => ({ label: s, value: s }));
  const fontFamilyOptions = FONT_FAMILIES.map(f => ({ label: f.label, value: f.value }));

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

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
        <EditorToolbar
          theme={theme}
          editor={editor}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontFamilyOptions={fontFamilyOptions}
          fontSizeOptions={fontSizeOptions}
          handleFontFamily={handleFontFamily}
          handleFontSize={handleFontSize}
          handleInsertHr={handleInsertHr}
          showCode={showCode}
          toggleCodeView={toggleCodeView}
          handleInsertLink={handleInsertLink}
          handleInsertImage={handleInsertImage}
          handleInsertTable={handleInsertTable}
          showFindReplace={showFindReplace}
          setShowFindReplace={setShowFindReplace}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          colors={COLORS}
        />

        <FindReplaceBar
          theme={theme}
          findInputRef={findInputRef}
          findText={findText}
          setFindText={setFindText}
          findPrevious={findPrevious}
          findNext={findNext}
          findMatches={findMatches}
          caseSensitive={caseSensitive}
          setCaseSensitive={setCaseSensitive}
          currentMatchIndex={currentMatchIndex}
          replaceText={replaceText}
          setReplaceText={setReplaceText}
          replaceCurrent={replaceCurrent}
          replaceAll={replaceAll}
          closeFindReplace={closeFindReplace}
        />

        <EditorArea
          editor={editor}
          showCode={showCode}
          htmlCode={htmlCode}
          handleCodeChange={handleCodeChange}
          applyCode={applyCode}
          setShowCode={setShowCode}
          isFullscreen={isFullscreen}
          isEmpty={isEmpty}
          handleInput={handleInput}
          handlePaste={handlePaste}
          handleContextMenu={handleContextMenu}
          handleEditorClick={handleEditorClick}
          handleEditorScroll={handleEditorScroll}
          theme={theme}
          selectedImage={selectedImage}
          handleResizeStart={handleResizeStart}
        />

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
      <LinkModal
        isOpen={modalType === 'link'}
        onConfirm={handleLinkConfirm}
        onCancel={handleModalCancel}
        initialData={linkInitialData}
        theme={theme}
      />

      <ImageModal
        isOpen={modalType === 'image'}
        onConfirm={handleImageConfirm}
        onCancel={handleModalCancel}
        theme={theme}
      />

      <TableModal
        isOpen={modalType === 'table'}
        onConfirm={handleTableConfirm}
        onCancel={handleModalCancel}
        theme={theme}
      />
    </div>
  );
}
