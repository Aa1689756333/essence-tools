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
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex justify-between items-center px-3 sm:px-4 py-2.5 bg-bg border-b border-border text-[13px] font-semibold text-text-secondary">
        <span>原文输入</span>
        <span className="text-[11.5px] text-text-secondary font-normal bg-bg border border-border px-2 py-0.5 rounded-[5px]">{inputCount} 字</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={overlayRef}
          className="highlight-overlay custom-scrollbar absolute top-0 left-0 w-full h-full overflow-hidden p-3 sm:p-5 pr-[37px] pointer-events-none z-[1] font-serif-cjk text-[15px] leading-[1.9] whitespace-pre-wrap break-all box-border text-text bg-card"
        />
        <textarea
          ref={textareaRef}
          className="textarea-invisible custom-scrollbar absolute top-0 left-0 w-full h-full overflow-y-scroll p-3 sm:p-5 border-none outline-none resize-none font-serif-cjk text-[15px] leading-[1.9] whitespace-pre-wrap break-all box-border z-[2] bg-transparent text-text"
          placeholder="在此粘贴小说纯文本..."
          aria-label="原文输入框"
          onInput={onInput}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        />
      </div>
    </div>
  );
}
