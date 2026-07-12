'use client';

import { useTheme } from '@/shell/ThemeProvider';

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
  const { theme } = useTheme();

  return (
    <div className="mt-4 px-3 sm:px-5 py-4 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: theme.accent }}>{spinner}</span>
        <span className="text-[13px] font-semibold text-gray-500">排版处理中...</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {phaseLabels.map((phase, i) => {
          let icon, nameStyle, descStyle;

          if (i < activePhase) {
            icon = <span style={{ color: theme.accent }}>{check}</span>;
            nameStyle = { color: '#111827' };
            descStyle = { color: '#6b7280' };
          } else if (i === activePhase) {
            icon = <span style={{ color: theme.accent }}>{spinner}</span>;
            nameStyle = { color: theme.accent, fontWeight: 600 };
            descStyle = { color: theme.accent, opacity: 0.6 };
          } else {
            icon = (
              <span className="text-gray-300">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
            );
            nameStyle = { color: '#9ca3af' };
            descStyle = { color: '#d1d5db' };
          }

          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <div className="min-w-0">
                <div className="text-[13px] leading-tight" style={nameStyle}>{phase.name}</div>
                <div className="text-[11px] leading-tight mt-0.5" style={descStyle}>{phase.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 进度条 */}
      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${((activePhase + 1) / 4) * 100}%`,
            backgroundColor: theme.accent,
          }}
        />
      </div>
    </div>
  );
}
