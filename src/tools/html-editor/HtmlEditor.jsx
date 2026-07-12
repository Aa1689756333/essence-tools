'use client';

import './styles.css';
import { useState, useRef, useCallback, useEffect } from 'react';
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
  X,
} from 'lucide-react';

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

function ToolbarSelect({ value, options, onChange, title, width }) {
  return (
    <select
      value={value}
      title={title}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className="h-[30px] rounded-md border border-gray-200 bg-white text-[12px] text-gray-600 px-1.5 cursor-pointer hover:border-gray-300 focus:outline-none transition-colors"
      style={{ width: width || 'auto' }}
    >
      {options.map(opt => (
        <option key={opt.value ?? opt.label} value={opt.value ?? opt.label}>
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

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  // 检测当前格式状态
  useEffect(() => {
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

    document.addEventListener('selectionchange', updateFormatState);
    return () => document.removeEventListener('selectionchange', updateFormatState);
  }, [showCode]);

  const exec = useCallback((cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
    updateEmptyState();
  }, []);

  const updateEmptyState = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setIsEmpty(!content || content === '<br>' || content === '<div><br></div>');
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
      editorRef.current.innerHTML = htmlCode;
      updateEmptyState();
      setShowCode(false);
    }
  }, [htmlCode, updateEmptyState]);

  const handleExport = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
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
  }, []);

  const handleCopyHtml = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
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
  }, []);

  const handleClear = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.focus();
      setIsEmpty(true);
      setHtmlCode('');
    }
  }, []);

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
    }
  }, [exec]);

  const handleColor = useCallback((color) => {
    exec('foreColor', color);
  }, [exec]);

  const handleBgColor = useCallback((color) => {
    exec('hiliteColor', color);
  }, [exec]);

  const handleInsertLink = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    setModalData({ type: 'link', url: 'https://', text: selectedText });
    setModalType('link');
  }, []);

  const handleInsertImage = useCallback(() => {
    setModalData({ type: 'image', url: 'https://', alt: '' });
    setModalType('image');
  }, []);

  const handleInsertHr = useCallback(() => {
    exec('insertHorizontalRule');
  }, [exec]);

  const handleInsertTable = useCallback(() => {
    setModalData({ type: 'table', rows: 3, cols: 3 });
    setModalType('table');
  }, []);

  const handleModalConfirm = useCallback(() => {
    if (modalType === 'link') {
      const { url, text } = modalData;
      if (url && url !== 'https://') {
        if (text) {
          exec('insertHTML', `<a href="${url}" target="_blank">${text}</a>`);
        } else {
          exec('createLink', url);
        }
      }
    } else if (modalType === 'image') {
      const { url, alt } = modalData;
      if (url && url !== 'https://') {
        exec('insertHTML', `<img src="${url}" alt="${alt || ''}" style="max-width:100%;height:auto" />`);
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
  }, [modalType, modalData, exec]);

  const handleModalCancel = useCallback(() => {
    setModalType(null);
    setModalData({});
  }, []);

  // 粘贴处理：默认清理格式
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    exec('insertText', text);
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
    const row = selectedCell.parentElement;
    const table = row.parentElement;
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
    const row = selectedCell.parentElement;
    const table = row.parentElement;
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

  return (
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">HTML 编辑器</h1>
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          像 Word 一样编辑富文本内容，支持导出为 HTML 代码。
        </p>
      </div>

      {/* 编辑器容器 */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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

            <ToolbarBtn icon={Minus} onClick={handleInsertHr} title="分割线" />
            <ToolbarBtn icon={Code} onClick={toggleCodeView} active={showCode} title="HTML 源码" />
            <ToolbarDivider />

            <ColorPicker icon="A" label="文字颜色" colors={COLORS} onSelect={handleColor} theme={theme} />
            <ColorPicker icon="BG" label="背景颜色" colors={COLORS} onSelect={handleBgColor} theme={theme} isBg />
            <ToolbarDivider />
            <ToolbarBtn icon={Link} onClick={handleInsertLink} title="插入链接" />
            <ToolbarBtn icon={Image} onClick={handleInsertImage} title="插入图片" />
            <ToolbarBtn icon={Table} onClick={handleInsertTable} title="插入表格" />
          </div>
        </div>

        {/* 编辑区域 */}
        <div className="relative">
          {isEmpty && !showCode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-[14px] text-gray-300">点击此处开始编辑内容...</span>
            </div>
          )}
          {showCode ? (
            <div className="code-view">
              <textarea
                value={htmlCode}
                onChange={handleCodeChange}
                className="w-full h-[400px] sm:h-[500px] p-3 sm:p-4 font-mono text-[13px] text-gray-700 bg-gray-50 resize-none focus:outline-none border-none leading-relaxed"
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
              className="editor-content"
              spellCheck={false}
            />
          )}
        </div>
      </div>

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

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <div className="text-[12px] text-gray-400">
          {isEmpty ? '暂无内容' : '编辑中...'}
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
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5">图片地址</label>
            <input
              type="text"
              value={modalData.url || ''}
              onChange={(e) => setModalData({ ...modalData, url: e.target.value })}
              className="w-full h-[36px] px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-gray-300"
              placeholder="https://"
            />
          </div>
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
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
