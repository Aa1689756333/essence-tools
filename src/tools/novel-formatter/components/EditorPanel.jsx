'use client';

export default function EditorPanel({
  textareaRef,
  overlayRef,
  inputCount,
  onInput,
  onMouseMove,
  onMouseLeave,
}) {
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[13px] font-semibold text-gray-600">
        <span>原文输入</span>
        <span className="text-[11.5px] text-gray-400 font-normal bg-gray-100 px-2 py-0.5 rounded-[5px]">{inputCount} 字</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={overlayRef}
          className="highlight-overlay absolute top-0 left-0 w-full h-full overflow-hidden p-5 pr-[37px] pointer-events-none z-[1] font-serif-cjk text-[15px] leading-[1.9] whitespace-pre-wrap break-all box-border text-gray-900 bg-white"
        />
        <textarea
          ref={textareaRef}
          className="textarea-invisible absolute top-0 left-0 w-full h-full overflow-y-scroll p-5 border-none outline-none resize-none font-serif-cjk text-[15px] leading-[1.9] whitespace-pre-wrap break-all box-border z-[2]"
          placeholder="在此粘贴小说纯文本..."
          onInput={onInput}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        />
      </div>
    </div>
  );
}
