'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const colorMap = {
  mint:   { bg: '#ecfdf5', tagBg: '#ecfdf5', tagColor: '#059669', line: 'linear-gradient(90deg, #059669, #34d399)' },
  pink:   { bg: '#fdf2f8', tagBg: '#fdf2f8', tagColor: '#db2777', line: 'linear-gradient(90deg, #db2777, #f472b6)' },
  lemon:  { bg: '#fefce8', tagBg: '#fefce8', tagColor: '#ca8a04', line: 'linear-gradient(90deg, #ca8a04, #facc15)' },
  sky:    { bg: '#ecfeff', tagBg: '#ecfeff', tagColor: '#0891b2', line: 'linear-gradient(90deg, #0891b2, #22d3ee)' },
  lilac:  { bg: '#f5f3ff', tagBg: '#f5f3ff', tagColor: '#7c3aed', line: 'linear-gradient(90deg, #7c3aed, #a78bfa)' },
};

export default function ToolCard({ tool, index }) {
  const color = colorMap[tool.color] || colorMap.mint;

  return (
    <Link
      href={tool.path}
      className="group relative block rounded-[14px] border border-gray-200 bg-white p-4 sm:p-6 transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:border-gray-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-up"
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
        {tool.emoji || '🔧'}
      </div>

      {/* 标题 */}
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5 tracking-tight">
        {tool.name}
      </h3>

      {/* 描述 */}
      <p className="text-[13px] text-gray-400 leading-[1.65] mb-4">
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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-[350ms] bg-gray-50 shrink-0">
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}
