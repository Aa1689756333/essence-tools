import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo2, Redo2, Code, Indent, Outdent, Minus, Type,
  Link, Image, Table, Search, Maximize, Minimize,
  Quote, Terminal,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ToolbarBtn, ToolbarDivider, ToolbarSelect } from '@/components/ui/Toolbar';

export default function EditorToolbar({
  theme, formatState, exec, fontFamily, fontSize, fontFamilyOptions, fontSizeOptions,
  handleFontFamily, handleFontSize, handleInsertHr, showCode, toggleCodeView,
  handleColor, handleBgColor, handleInsertLink, handleInsertImage, handleInsertTable,
  showFindReplace, setShowFindReplace, isFullscreen, toggleFullscreen, colors,
}) {
  return (
    <div className="border-b border-gray-200 bg-gray-50/80 px-2 sm:px-3 py-2">
      <div className="flex items-center gap-0.5 flex-wrap">
        <ToolbarBtn icon={Undo2} onClick={() => exec('undo')} title="撤销 (Ctrl+Z)" />
        <ToolbarBtn icon={Redo2} onClick={() => exec('redo')} title="恢复 (Ctrl+Y)" />
        <ToolbarDivider />
        <ToolbarSelect value={fontFamily} options={fontFamilyOptions} onChange={handleFontFamily} title="字体" width="100px" />
        <ToolbarSelect value={fontSize} options={fontSizeOptions} onChange={handleFontSize} title="字号" width="70px" />
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
        <ColorPicker icon="A" label="文字颜色" colors={colors} onSelect={handleColor} theme={theme} />
        <ColorPicker icon="BG" label="背景颜色" colors={colors} onSelect={handleBgColor} theme={theme} isBg />
        <ToolbarDivider />
        <ToolbarBtn icon={Link} onClick={handleInsertLink} title="插入链接" />
        <ToolbarBtn icon={Image} onClick={handleInsertImage} title="插入图片" />
        <ToolbarBtn icon={Table} onClick={handleInsertTable} title="插入表格" />
        <ToolbarDivider />
        <ToolbarBtn icon={Search} onClick={() => setShowFindReplace(!showFindReplace)} active={showFindReplace} title="查找替换 (Ctrl+F)" />
        <ToolbarBtn icon={isFullscreen ? Minimize : Maximize} onClick={toggleFullscreen} active={isFullscreen} title={isFullscreen ? '退出全屏 (Esc)' : '全屏编辑'} />
      </div>
    </div>
  );
}

function ColorPicker({ icon, label, colors, onSelect, theme, isBg }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }} title={label} className="w-[30px] h-[30px] rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 relative">
        <span className="text-[11px] font-bold">{icon}</span>
        <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-3.5 h-[3px] rounded-sm" style={{ backgroundColor: isBg ? '#fde68a' : theme.accent }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 w-[180px]">
          <div className="grid grid-cols-10 gap-[2px]">
            {colors.map(color => (
              <button key={color} onMouseDown={(e) => { e.preventDefault(); onSelect(color); setOpen(false); }} className="w-4 h-4 rounded-sm border border-gray-200 cursor-pointer hover:scale-125 transition-transform" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
