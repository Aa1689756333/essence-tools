import { ChevronDown, ChevronUp, X } from 'lucide-react';

export default function FindReplaceBar({
  theme, findInputRef, findText, setFindText, findPrevious, findNext,
  findMatches, caseSensitive, setCaseSensitive, currentMatchIndex,
  replaceText, setReplaceText, replaceCurrent, replaceAll, closeFindReplace,
}) {
  return (
    <div className="border-b border-border bg-bg px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 flex items-center gap-2">
          <input ref={findInputRef} type="text" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="查找内容" className="flex-1 h-[32px] px-3 rounded-md border border-border text-[13px] focus:outline-none focus:border-border-light" />
          <button onClick={findPrevious} disabled={findMatches.length === 0} className="px-2 py-1 text-[12px] text-text-secondary bg-card border border-border rounded-md hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed" title="上一个"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={findNext} disabled={findMatches.length === 0} className="px-2 py-1 text-[12px] text-text-secondary bg-card border border-border rounded-md hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed" title="下一个"><ChevronDown className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="w-3.5 h-3.5" />
            区分大小写
          </label>
          {findMatches.length > 0 && <span className="text-text-tertiary">{currentMatchIndex + 1} / {findMatches.length}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="替换为" className="flex-1 h-[32px] px-3 rounded-md border border-border text-[13px] focus:outline-none focus:border-border-light" />
        <button onClick={replaceCurrent} disabled={currentMatchIndex < 0} className="px-3 py-1 text-[12px] text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: theme.accent }}>替换</button>
        <button onClick={replaceAll} disabled={findMatches.length === 0} className="px-3 py-1 text-[12px] text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: theme.accent }}>全部替换</button>
        <button onClick={closeFindReplace} className="px-2 py-1 text-[12px] text-text-secondary hover:text-text" title="关闭"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
