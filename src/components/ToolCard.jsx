'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const colorMap = {
  amber:   { bg: '#fef3c7', border: 'rgba(217,119,6,0.25)', line: 'linear-gradient(90deg, #d97706, #f59e0b)' },
  emerald: { bg: '#ecfdf5', border: 'rgba(5,150,105,0.25)', line: 'linear-gradient(90deg, #059669, #34d399)' },
  indigo:  { bg: '#eef2ff', border: 'rgba(79,70,229,0.25)', line: 'linear-gradient(90deg, #4f46e5, #818cf8)' },
  rose:    { bg: '#fff1f2', border: 'rgba(225,29,72,0.25)',  line: 'linear-gradient(90deg, #e11d48, #fb7185)' },
  cyan:    { bg: '#ecfeff', border: 'rgba(8,145,178,0.25)',  line: 'linear-gradient(90deg, #0891b2, #22d3ee)' },
  violet:  { bg: '#f5f3ff', border: 'rgba(124,58,237,0.25)', line: 'linear-gradient(90deg, #7c3aed, #a78bfa)' },
};

export default function ToolCard({ tool, index }) {
  const color = colorMap[tool.color] || colorMap.amber;

  return (
    <Link
      href={tool.path}
      className="group relative block rounded-xl border border-border bg-card p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-up"
      style={{
        animationDelay: `${index * 40}ms`,
        '--card-border-hover': color.border,
        '--card-line': color.line,
      }}
    >
      {/* 顶部装饰线 - hover 时淡入 */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: color.line }}
      />

      {/* 图标 */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl"
        style={{ background: color.bg }}
      >
        {tool.emoji || '🔧'}
      </div>

      {/* 标题 */}
      <h3 className="text-[15px] font-semibold text-text mb-1.5 group-hover:text-accent transition-colors duration-200">
        {tool.name}
      </h3>

      {/* 描述 */}
      <p className="text-[13px] text-text-secondary leading-relaxed mb-3.5">
        {tool.desc}
      </p>

      {/* 标签 */}
      <div className="flex items-center gap-1.5">
        {tool.tags.map(tag => (
          <span
            key={tag}
            className="text-[11px] px-2.5 py-0.5 rounded-full bg-bg text-text-secondary font-medium"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
          <ArrowRight className="w-4 h-4 text-text-secondary" />
        </span>
      </div>
    </Link>
  );
}
