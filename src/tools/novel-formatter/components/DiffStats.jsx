'use client';

import { useTheme } from '@/shell/ThemeProvider';

export default function DiffStats({ stats }) {
  const { theme } = useTheme();
  if (!stats) return null;

  return (
    <div className="mt-3.5 px-3 sm:px-[18px] py-2.5 bg-bg border border-border rounded-[10px] text-[12.5px] text-text-secondary text-center">
      {stats.diff !== 0 ? (
        <>
          排版完成：原文 <span className="font-bold" style={{ color: theme.accent }}>{stats.before}</span> 字
          {' → '}
          排版后 <span className="font-bold" style={{ color: theme.accent }}>{stats.after}</span> 字
          （变化 <span className="font-bold" style={{ color: theme.accent }}>
            {stats.diff > 0 ? '+' : ''}{stats.diff}
          </span> 字）
        </>
      ) : (
        <>
          排版完成：原文与排版后均为{' '}
          <span className="font-bold" style={{ color: theme.accent }}>{stats.before}</span> 字，文本已符合排版规范
        </>
      )}
    </div>
  );
}
