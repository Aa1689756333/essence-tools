export default function DiffStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="mt-4 animate-fade-up" role="status" aria-live="polite">
      <div className="flex items-center justify-center gap-6 py-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-stone-400/60 uppercase tracking-widest">原文</span>
          <span className="text-[14px] font-semibold text-stone-500 tabular-nums">{stats.before}</span>
        </div>

        <span className="text-stone-200 text-[10px]">→</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-stone-400/60 uppercase tracking-widest">排版后</span>
          <span className="text-[14px] font-semibold text-stone-500 tabular-nums">{stats.after}</span>
        </div>

        <span className="text-stone-200 text-[10px]">→</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-stone-400/60 uppercase tracking-widest">变化</span>
          <span className={`text-[14px] font-semibold tabular-nums ${stats.diff === 0 ? 'text-green-600/80' : 'text-brand'}`}>
            {stats.diff > 0 ? '+' : ''}{stats.diff}
          </span>
        </div>
      </div>

      {stats.diff === 0 && (
        <p className="text-center text-[10px] text-green-600/70 mt-0.5 tracking-wide">文本已符合排版规范</p>
      )}
    </div>
  );
}
