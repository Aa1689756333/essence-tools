'use client';

export default function DiffStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-[13px] text-gray-500 text-center">
      {stats.diff !== 0 ? (
        <>
          排版完成：原文 <span className="font-bold text-emerald-600">{stats.before}</span> 字
          {' → '}
          排版后 <span className="font-bold text-emerald-600">{stats.after}</span> 字
          （变化 <span className="font-bold text-emerald-600">
            {stats.diff > 0 ? '+' : ''}{stats.diff}
          </span> 字）
        </>
      ) : (
        <>
          排版完成：原文与排版后均为{' '}
          <span className="font-bold text-emerald-600">{stats.before}</span> 字，文本已符合排版规范
        </>
      )}
    </div>
  );
}
