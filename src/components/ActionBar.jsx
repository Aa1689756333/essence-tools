export default function ActionBar({ onFormat, onSample, onClear, onCopy, canCopy, copyLabel, disabled }) {
  return (
    <nav className="flex items-center justify-center gap-2 mt-5" role="toolbar" aria-label="操作按钮">
      <button onClick={onFormat} disabled={disabled} className="btn btn-lg btn-dark">
        排版
      </button>

      <span className="w-px h-4 bg-stone-200/60 mx-1" />

      <button onClick={onSample} className="btn btn-md btn-subtle">测试文本</button>
      <button onClick={onClear} className="btn btn-md btn-subtle">清空</button>
      <button onClick={onCopy} disabled={!canCopy} className="btn btn-md btn-subtle">
        {copyLabel}
      </button>
    </nav>
  );
}
