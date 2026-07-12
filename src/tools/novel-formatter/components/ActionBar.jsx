'use client';

export default function ActionBar({ onFormat, onSample, onClear, onCopy, canCopy, copyLabel, disabled }) {
  return (
    <div className="flex gap-3 justify-center mt-5">
      <button
        onClick={onFormat}
        disabled={disabled}
        className="px-8 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        一键排版
      </button>
      <button
        onClick={onSample}
        className="px-8 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all bg-transparent text-gray-600 border border-dashed border-gray-300 hover:bg-gray-50"
      >
        测试文本
      </button>
      <button
        onClick={onClear}
        className="px-8 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all bg-transparent text-gray-600 border border-dashed border-gray-300 hover:bg-gray-50"
      >
        清空
      </button>
      <button
        onClick={onCopy}
        disabled={!canCopy}
        className="px-8 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all bg-transparent text-gray-600 border border-dashed border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {copyLabel || '复制结果'}
      </button>
    </div>
  );
}
