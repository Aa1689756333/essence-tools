'use client';

import { useTheme } from '@/shell/ThemeProvider';

export default function ActionBar({
  onFormat,
  onSample,
  onClear,
  onCopy,
  canCopy,
  copyLabel,
  disabled,
}) {
  const { theme } = useTheme();

  return (
    <div className="flex gap-2 sm:gap-2.5 justify-center mt-[18px] flex-wrap">
      <button
        onClick={onFormat}
        disabled={disabled}
        className="px-4 sm:px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all text-white hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          backgroundColor: theme.accent,
          boxShadow: `0 1px 3px rgba(${theme.shadow}, 0.25)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.hover;
          e.currentTarget.style.boxShadow = `0 4px 12px rgba(${theme.shadow}, 0.3)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.accent;
          e.currentTarget.style.boxShadow = `0 1px 3px rgba(${theme.shadow}, 0.25)`;
        }}
      >
        一键排版
      </button>
      <button
        onClick={onSample}
        className="px-4 sm:px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-card text-text-secondary border border-dashed border-border hover:bg-bg hover:border-solid hover:text-text hover:border-text-secondary/50"
      >
        测试文本
      </button>
      <button
        onClick={onClear}
        className="px-4 sm:px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-card text-text-secondary border border-dashed border-border hover:bg-bg hover:border-solid hover:text-text hover:border-text-secondary/50"
      >
        清空
      </button>
      <button
        onClick={onCopy}
        disabled={!canCopy}
        className="px-4 sm:px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-card text-text-secondary border border-dashed border-border hover:bg-bg hover:border-solid hover:text-text hover:border-text-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {copyLabel || '复制结果'}
      </button>
    </div>
  );
}
