'use client';

/**
 * 公共工具栏组件，供 HtmlEditor / MarkdownEditor 等复用。
 *
 * variant 用于保留两个编辑器原有外观：
 * - 'theme'（默认）：跟随主题变量（HtmlEditor 使用）
 * - 'gray'：固定灰阶配色（MarkdownEditor 使用）
 */

/**
 * 工具栏按钮
 * @param {React.ComponentType} icon - lucide 图标组件
 * @param {function} onClick - 点击回调
 * @param {boolean} [active] - 是否高亮激活
 * @param {string} title - 提示文本（同时作为 aria-label）
 * @param {'theme'|'gray'} [variant] - 外观变体
 */
export function ToolbarBtn({ icon: Icon, onClick, active, title, variant = 'theme' }) {
  const activeCls = variant === 'gray'
    ? 'bg-gray-200 text-gray-800'
    : 'bg-bg-primary border border-border text-text font-semibold';
  const inactiveCls = variant === 'gray'
    ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    : 'text-text-secondary hover:bg-bg-primary hover:text-text';
  const focusCls = variant === 'gray'
    ? ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300'
    : '';
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      aria-label={title}
      aria-pressed={active !== undefined ? !!active : undefined}
      className={`w-[30px] h-[30px] rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0${focusCls} ${
        active ? activeCls : inactiveCls
      }`}
    >
      <Icon className="w-[15px] h-[15px]" aria-hidden="true" />
    </button>
  );
}

/** 工具栏分隔线 */
export function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

/**
 * 工具栏下拉选择
 * @param {string} value - 当前值
 * @param {Array<{value?: string, label: string}>} options - 选项列表
 * @param {function} onChange - 变更回调，参数为选中值
 * @param {string} title - 提示文本（同时作为 aria-label）
 * @param {string} [width] - 宽度，如 '100px'
 */
export function ToolbarSelect({ value, options, onChange, title, width }) {
  return (
    <select
      value={value}
      title={title}
      aria-label={title}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className="h-[30px] rounded-md border border-border bg-card text-[12px] text-text px-1.5 cursor-pointer hover:border-border-hover focus:outline-none transition-colors"
      style={{ width: width || 'auto' }}
    >
      {options.map(opt => (
        <option key={opt.value ?? opt.label} value={opt.value ?? opt.label} className="bg-card text-text">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
