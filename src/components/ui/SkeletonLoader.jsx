'use client';

/**
 * 通用骨架屏组件，用于工具组件懒加载时的占位。
 * 使用应用主题变量，样式与整体 UI 风格一致。
 */
export default function SkeletonLoader() {
  const block = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
  };
  const bar = {
    background: 'var(--border-secondary)',
    borderRadius: '6px',
  };

  return (
    <div style={{ padding: '24px', width: '100%' }} aria-busy="true" aria-live="polite">
      {/* 顶部标题占位 */}
      <div
        className="animate-pulse"
        style={{ ...bar, height: '28px', width: '40%', marginBottom: '20px' }}
      />

      {/* 工具栏占位 */}
      <div
        className="animate-pulse"
        style={{
          ...block,
          height: '48px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 14px',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...bar, height: '20px', width: '32px' }} />
        ))}
      </div>

      {/* 主体双栏占位 */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div className="animate-pulse" style={{ ...block, flex: 1, height: '420px' }} />
        <div className="animate-pulse" style={{ ...block, flex: 1, height: '420px' }} />
      </div>
    </div>
  );
}
