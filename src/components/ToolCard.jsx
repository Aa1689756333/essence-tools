import { memo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const colorMap = {
  mint:   { bg: 'rgba(16, 185, 129, 0.1)', tagBg: 'rgba(16, 185, 129, 0.15)', tagColor: 'var(--theme-accent, #10b981)', line: 'linear-gradient(90deg, var(--theme-accent), var(--theme-light))' },
  pink:   { bg: 'rgba(251, 113, 133, 0.1)', tagBg: 'rgba(251, 113, 133, 0.15)', tagColor: '#fb7185', line: 'linear-gradient(90deg, #f43f5e, #fb7185)' },
  lemon:  { bg: 'rgba(251, 191, 36, 0.1)', tagBg: 'rgba(251, 191, 36, 0.15)', tagColor: '#fbbf24', line: 'linear-gradient(90deg, #f59e0b, #fbbf24)' },
  sky:    { bg: 'rgba(56, 189, 248, 0.1)', tagBg: 'rgba(56, 189, 248, 0.15)', tagColor: '#38bdf8', line: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' },
  lilac:  { bg: 'rgba(196, 181, 253, 0.1)', tagBg: 'rgba(196, 181, 253, 0.15)', tagColor: '#a78bfa', line: 'linear-gradient(90deg, #7c3aed, #a78bfa)' },
};

function ToolCard({ tool, index }) {
  const color = colorMap[tool.color] || colorMap.mint;

  return (
    <Link
      href={tool.path}
      className="group relative block rounded-[14px] border border-border bg-card p-4 sm:p-6 transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:border-border/80 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.04)] overflow-hidden"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* 底部装饰线 - hover 时淡入 */}
      <div
        className="absolute bottom-0 left-5 right-5 h-[2.5px] rounded-t-[2.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-[350ms]"
        style={{ background: color.line }}
      />

      {/* 图标 */}
      <div
        className="w-[46px] h-[46px] rounded-xl flex items-center justify-center mb-[18px] text-[21px] group-hover:scale-105 transition-transform duration-[350ms] relative"
        style={{ background: color.bg, border: `1px solid ${color.tagBg}` }}
      >
        <span aria-hidden="true">{tool.emoji || '🔧'}</span>
      </div>

      {/* 标题 */}
      <h2 className="text-[15px] font-semibold text-text mb-1.5 tracking-tight">
        {tool.name}
      </h2>

      {/* 描述 */}
      <p className="text-[13px] text-text-secondary leading-[1.65] mb-4 line-clamp-2">
        {tool.desc}
      </p>

      {/* 标签和箭头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tool.tags.map(tag => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-[3px] rounded-[6px] font-medium tracking-tight"
              style={{ background: color.tagBg, color: color.tagColor }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-[350ms] bg-bg-primary shrink-0">
          <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
        </div>
      </div>
    </Link>
  );
}

export default memo(ToolCard);
