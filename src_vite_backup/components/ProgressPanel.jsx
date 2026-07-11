const phaseLabels = [
  { name: '字符级转换', desc: '全角/半角统一 · 间隔号规范' },
  { name: '标点统一', desc: '标点转换 · 省略号 · 破折号 · 引号状态机' },
  { name: '空格处理', desc: '中英文间距 · 标点间距 · 拆行保护' },
  { name: '段落处理', desc: '缩进 · 章节标题 · 段落去重 · 对话格式' },
];

const spinner = (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const check = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function ProgressPanel({ activePhase }) {
  return (
    <div className="mt-4 px-5 py-4 bg-[#faf7f0] border border-border rounded-md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent">{spinner}</span>
        <span className="text-[13px] font-semibold text-text-secondary">排版处理中...</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {phaseLabels.map((phase, i) => {
          let icon, nameClass, descClass;

          if (i < activePhase) {
            icon = <span className="text-success">{check}</span>;
            nameClass = 'text-text';
            descClass = 'text-text-secondary';
          } else if (i === activePhase) {
            icon = <span className="text-accent">{spinner}</span>;
            nameClass = 'text-accent font-semibold';
            descClass = 'text-accent/60';
          } else {
            icon = (
              <span className="text-[#d4c5b2]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
            );
            nameClass = 'text-[#c5b8a5]';
            descClass = 'text-[#d4c5b2]';
          }

          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <div className="min-w-0">
                <div className={`text-[13px] leading-tight ${nameClass}`}>{phase.name}</div>
                <div className={`text-[11px] leading-tight mt-0.5 ${descClass}`}>{phase.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 进度条 */}
      <div className="mt-3 h-1 bg-[#e8e0d4] rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((activePhase + 1) / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}
