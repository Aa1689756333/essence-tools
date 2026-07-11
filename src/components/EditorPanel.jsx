export default function EditorPanel({
  textareaRef,
  overlayRef,
  inputCount,
  onInput,
  onMouseMove,
  onMouseLeave,
}) {
  return (
    <section className="floating-card flex flex-col">
      <header className="flex justify-between items-center px-5 py-2.5">
        <span className="text-[11px] font-medium text-stone-400/70 tracking-[0.15em] uppercase">Input</span>
        <span className="text-[11px] text-stone-300 tabular-nums" aria-live="polite">
          {inputCount}
        </span>
      </header>
      <div className="card-divider" />

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={overlayRef}
          className="highlight-overlay absolute top-0 left-0 w-full h-full overflow-hidden px-5 py-4 pr-[37px] pointer-events-none z-[1] font-serif-cjk text-[15px] leading-[1.95] whitespace-pre-wrap break-all box-border text-stone-600 bg-surface"
        />
        <textarea
          ref={textareaRef}
          className="textarea-invisible custom-scrollbar absolute top-0 left-0 w-full h-full overflow-y-scroll px-5 py-4 border-none outline-none resize-none font-serif-cjk text-[15px] leading-[1.95] whitespace-pre-wrap break-all box-border z-[2]"
          placeholder="在此粘贴小说纯文本…"
          onInput={onInput}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          spellCheck="false"
          aria-label="原文输入区域"
        />
      </div>
    </section>
  );
}
