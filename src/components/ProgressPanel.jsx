const phases = ['字符转换', '标点统一', '空格处理', '段落处理'];

function StepDot({ state }) {
  if (state === 'complete') {
    return (
      <div className="w-[18px] h-[18px] rounded-full bg-brand flex items-center justify-center shrink-0 z-10 transition-all duration-500">
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    );
  }

  if (state === 'active') {
    return (
      <div className="w-[18px] h-[18px] rounded-full bg-brand animate-pulse-dot flex items-center justify-center shrink-0 z-10 transition-all duration-500">
        <svg className="w-2.5 h-2.5 text-white animate-spin-slow" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-[18px] h-[18px] rounded-full bg-stone-100 border border-stone-200/60 flex items-center justify-center shrink-0 z-10 transition-all duration-500">
      <span className="w-1 h-1 rounded-full bg-stone-300" />
    </div>
  );
}

export default function ProgressPanel({ activePhase }) {
  return (
    <div className="mt-5 animate-fade-up" role="status" aria-label="排版处理进度">
      <div className="px-8 py-5 floating-card">
        {/* 步骤条 */}
        <div className="flex items-start">
          {phases.map((name, i) => {
            const state = i < activePhase ? 'complete' : i === activePhase ? 'active' : 'pending';
            const isLast = i === phases.length - 1;

            return (
              <div key={i} className="flex items-start flex-1 min-w-0 last:flex-initial">
                <div className="flex flex-col items-center gap-2">
                  <StepDot state={state} />
                  <span className={`text-[11px] font-medium whitespace-nowrap transition-colors duration-500 ${
                    state === 'complete' ? 'text-brand' :
                    state === 'active' ? 'text-stone-600' : 'text-stone-300'
                  }`}>
                    {name}
                  </span>
                </div>

                {!isLast && (
                  <div className="flex-1 pt-[8px] px-3 min-w-[20px]">
                    <div className="h-px bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand/70 rounded-full transition-all duration-700 ease-out"
                        style={{ width: i < activePhase ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
