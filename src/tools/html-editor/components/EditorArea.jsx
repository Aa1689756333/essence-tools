import { EditorContent } from '@tiptap/react';

export default function EditorArea({
  editor, showCode, htmlCode, handleCodeChange, applyCode, setShowCode,
  isFullscreen, isEmpty, handleInput, handlePaste, handleContextMenu,
  handleEditorClick, handleEditorScroll, theme, selectedImage, handleResizeStart,
}) {
  return (
    <div className={`relative ${isFullscreen ? 'flex-1 overflow-hidden flex flex-col' : ''}`}>
      {isEmpty && !showCode && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"><span className="text-[14px] text-gray-300">点击此处开始编辑内容...</span></div>}
      {showCode ? (
        <div className={`code-view ${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
          <textarea value={htmlCode} onChange={handleCodeChange} className={`w-full p-3 sm:p-4 font-mono text-[13px] text-gray-700 bg-gray-50 resize-none focus:outline-none border-none leading-relaxed ${isFullscreen ? 'flex-1' : 'h-[400px] sm:h-[500px]'}`} spellCheck={false} />
          <div className="flex gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
            <button onClick={applyCode} className="px-4 py-[6px] rounded-md text-[12px] font-semibold text-white cursor-pointer transition-all" style={{ backgroundColor: theme.accent }}>应用修改</button>
            <button onClick={() => setShowCode(false)} className="px-4 py-[6px] rounded-md text-[12px] font-semibold text-gray-500 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all">取消</button>
          </div>
        </div>
      ) : (
        <EditorContent 
          editor={editor} 
          onContextMenu={handleContextMenu} 
          onClick={handleEditorClick} 
          onScroll={handleEditorScroll} 
          className={`editor-content ${isFullscreen ? 'flex-1 max-h-none' : ''}`} 
        />
      )}
      {/* Rest of the component for image resize logic */}
      {selectedImage && !showCode && (() => {
        const imgRect = selectedImage.getBoundingClientRect();
        // Since we removed editorRef, we'll try to find the editor container DOM element
        const editorContainer = editor?.view?.dom;
        if (!editorContainer) return null;
        const editorRect = editorContainer.getBoundingClientRect();
        const left = imgRect.left - editorRect.left;
        const top = imgRect.top - editorRect.top + editorContainer.scrollTop;
        const width = imgRect.width;
        const height = imgRect.height;
        return <>
          <div id="image-selected-border" className="absolute pointer-events-none border-2 border-blue-500 z-40" style={{ left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }} />
          {['nw', 'ne', 'sw', 'se'].map(corner => {
            const isTop = corner.includes('n');
            const isLeft = corner.includes('w');
            const cursor = corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize';
            return <div key={corner} id={`image-resize-handle-${corner}`} onMouseDown={(e) => handleResizeStart(e, corner)} onClick={(e) => e.stopPropagation()} className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm z-50 hover:bg-blue-100" style={{ left: isLeft ? `${left - 6}px` : `${left + width - 6}px`, top: isTop ? `${top - 6}px` : `${top + height - 6}px`, cursor }} />;
          })}
        </>;
      })()}
    </div>
  );
}
