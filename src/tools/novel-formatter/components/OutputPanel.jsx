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
    <div className="flex flex-col bg-card-bg border border-border rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2.5 bg-[#faf7f0] border-b border-border text-[13px] font-semibold text-text-secondary">
        <span>排版结果</span>
        <span className="text-xs text-[#b0a492] font-normal">{outputCount} 字</span>
      </div>
      <div
        ref={outputRef}
        className={`flex-1 overflow-y-auto p-5 font-serif-cjk text-[15px] leading-[1.9] whitespace-pre-wrap break-all ${isEmpty ? 'text-[#c5b8a5]' : ''}`}
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
