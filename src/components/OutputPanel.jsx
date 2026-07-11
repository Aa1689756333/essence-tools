export default function OutputPanel({
  outputRef,
  paragraphs,
  outputText,
  outputCount,
  onMouseOver,
  onMouseLeave,
}) {
  const isEmpty = !outputText ||
    outputText === '排版结果将显示在这里...' ||
    outputText === '请先在左侧输入文本...';

  return (
    <section className="floating-card flex flex-col">
      <header className="flex justify-between items-center px-5 py-2.5">
        <span className="text-[11px] font-medium text-stone-400/70 tracking-[0.15em] uppercase">Output</span>
        <span className="text-[11px] text-stone-300 tabular-nums" aria-live="polite">
          {outputCount}
        </span>
      </header>
      <div className="card-divider" />

      <div
        ref={outputRef}
        role="region"
        aria-label="排版结果输出区域"
        className={`custom-scrollbar flex-1 overflow-y-auto px-5 py-4 font-serif-cjk text-[15px] leading-[1.95] whitespace-pre-wrap break-all ${isEmpty ? 'text-stone-300' : 'text-stone-600'}`}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <svg className="w-6 h-6 text-stone-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-[11px] text-stone-300 font-light tracking-wide">
              {outputText || '等待排版…'}
            </span>
          </div>
        ) : (
          paragraphs.map((para, i) => {
            if (para.text === '') {
              return <span key={i}>&nbsp;</span>;
            }
            return (
              <p
                key={i}
                className="output-paragraph"
                data-input-line={para.inputLine >= 0 ? para.inputLine : undefined}
              >
                {para.text}
              </p>
            );
          })
        )}
      </div>
    </section>
  );
}
