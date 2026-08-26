'use client';

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
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden" role="region" aria-label="排版结果">
      <div className="flex justify-between items-center px-3 sm:px-4 py-2.5 bg-bg border-b border-border text-[13px] font-semibold text-text-secondary">
        <span>排版结果</span>
        <span className="text-[11.5px] text-text-secondary font-normal bg-bg border border-border px-2 py-0.5 rounded-[5px]">{outputCount} 字</span>
      </div>
      <div
        ref={outputRef}
        className={`relative flex-1 overflow-y-auto p-3 sm:p-5 font-serif-cjk text-[15px] leading-[1.9] whitespace-pre-wrap break-all text-text ${isEmpty ? 'text-text-tertiary' : ''}`}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        {isEmpty ? (
          outputText || '排版结果将显示在这里...'
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
    </div>
  );
}
