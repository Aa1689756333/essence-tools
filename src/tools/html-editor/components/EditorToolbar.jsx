import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo2, Redo2, Code, Indent, Outdent, Minus, Type,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Search, Maximize, Minimize,
  Quote, Terminal,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ToolbarBtn, ToolbarDivider, ToolbarSelect } from '@/components/ui/Toolbar';

export default function EditorToolbar({
  theme, editor, fontFamily, fontSize, fontFamilyOptions, fontSizeOptions,
  handleFontFamily, handleFontSize, handleInsertHr, showCode, toggleCodeView,
  handleColor, handleBgColor, handleInsertLink, handleInsertImage, handleInsertTable,
  showFindReplace, setShowFindReplace, isFullscreen, toggleFullscreen, colors,
}) {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-border bg-bg/80 px-2 sm:px-3 py-2">
      <div className="flex items-center gap-0.5 flex-wrap">
        <ToolbarBtn icon={Undo2} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销 (Ctrl+Z)" />
        <ToolbarBtn icon={Redo2} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="恢复 (Ctrl+Y)" />
        <ToolbarDivider />
        <ToolbarSelect value={fontFamily} options={fontFamilyOptions} onChange={handleFontFamily} title="字体" width="100px" />
        <ToolbarSelect value={fontSize} options={fontSizeOptions} onChange={handleFontSize} title="字号" width="70px" />
        <ToolbarDivider />
        <ToolbarBtn icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗 (Ctrl+B)" />
        <ToolbarBtn icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体 (Ctrl+I)" />
        <ToolbarBtn icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线 (Ctrl+U)" />
        <ToolbarBtn icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线" />
        <ToolbarDivider />
        <ToolbarBtn icon={Heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="标题 1" />
        <ToolbarBtn icon={Heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="标题 2" />
        <ToolbarBtn icon={Heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="标题 3" />
        <ToolbarBtn icon={Type} onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="正文" />
        <ToolbarDivider />
        <ToolbarBtn icon={AlignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="左对齐" />
        <ToolbarBtn icon={AlignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="居中" />
        <ToolbarBtn icon={AlignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="右对齐" />
        <ToolbarBtn icon={AlignJustify} onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="两端对齐" />
        <ToolbarDivider />
        <ToolbarBtn icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表" />
        <ToolbarBtn icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表" />
        <ToolbarDivider />
        <ToolbarBtn icon={Quote} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用块" />
        <ToolbarBtn icon={Terminal} onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块" />
        <ToolbarDivider />
        <ToolbarBtn icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线" />
        <ToolbarBtn icon={Code} onClick={toggleCodeView} active={showCode} title="HTML 源码" />
        <ToolbarDivider />
        <ColorPicker icon="A" label="文字颜色" colors={colors} onSelect={(color) => editor.chain().focus().setColor(color).run()} theme={theme} />
        {/* Background color requires a custom extension or inline style, omit or adjust if unsupported */}
        <ToolbarDivider />
        <ToolbarBtn icon={LinkIcon} onClick={handleInsertLink} active={editor.isActive('link')} title="插入链接" />
        <ToolbarBtn icon={ImageIcon} onClick={handleInsertImage} active={editor.isActive('image')} title="插入图片" />
        <ToolbarBtn icon={TableIcon} onClick={handleInsertTable} active={editor.isActive('table')} title="插入表格" />
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
      <button onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }} title={label} className="w-[30px] h-[30px] rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 text-text-secondary hover:bg-bg hover:text-text relative">
        <span className="text-[11px] font-bold">{icon}</span>
        <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-3.5 h-[3px] rounded-sm" style={{ backgroundColor: isBg ? '#fde68a' : theme.accent }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-card rounded-lg border border-border shadow-lg z-50 w-[180px]">
          <div className="grid grid-cols-10 gap-[2px]">
            {colors.map(color => (
              <button key={color} onMouseDown={(e) => { e.preventDefault(); onSelect(color); setOpen(false); }} className="w-4 h-4 rounded-sm border border-border cursor-pointer hover:scale-125 transition-transform" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
