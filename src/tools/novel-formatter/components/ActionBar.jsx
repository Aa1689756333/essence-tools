'use client';

export default function ActionBar({ onFormat, onSample, onClear, onCopy, canCopy, copyLabel, disabled }) {
  return (
    <div className="flex gap-2.5 justify-center mt-[18px]">
      <button
        onClick={onFormat}
        disabled={disabled}
        className="px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-emerald-600 text-white shadow-[0_1px_3px_rgba(5,150,105,0.25)] hover:bg-emerald-700 hover:shadow-[0_4px_12px_rgba(5,150,105,0.3)] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
      >
        一键排版
      </button>
      <button
        onClick={onSample}
        className="px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-transparent text-gray-600 border border-dashed border-gray-300 hover:bg-gray-50 hover:border-solid hover:border-gray-400"
      >
        测试文本
      </button>
      <button
        onClick={onClear}
        className="px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-transparent text-gray-600 border border-dashed border-gray-300 hover:bg-gray-50 hover:border-solid hover:border-gray-400"
      >
        清空
      </button>
      <button
        onClick={onCopy}
        disabled={!canCopy}
        className="px-7 py-[9px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all bg-transparent text-gray-600 border border-dashed border-gray-300 hover:bg-gray-50 hover:border-solid hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {copyLabel || '复制结果'}
      </button>
    </div>
  );
}
