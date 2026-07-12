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
      className="group relative block rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.02)] overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* 底部装饰线 - hover 时淡入 */}
      <div
        className="absolute bottom-0 left-4 right-4 h-[2px] rounded-t opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: color.line }}
      />

      {/* 图标 */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-[20px] group-hover:scale-105 transition-transform duration-300"
        style={{ background: color.bg }}
      >
        {tool.emoji || '🔧'}
      </div>

      {/* 标题 */}
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
        {tool.name}
      </h3>

      {/* 描述 */}
      <p className="text-[13px] text-gray-400 leading-relaxed mb-3.5">
        {tool.desc}
      </p>

      {/* 标签 */}
      <div className="flex items-center gap-1.5">
        {tool.tags.map(tag => (
          <span
            key={tag}
            className="text-[11px] px-2.5 py-1 rounded-md font-medium"
            style={{ background: color.tagBg, color: color.tagColor }}
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
          <ArrowRight className="w-4 h-4 text-gray-300" />
        </span>
      </div>
    </Link>
  );
}
