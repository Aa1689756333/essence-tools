'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * 通用 Modal 组件
 * @param {boolean} isOpen - 是否显示
 * @param {function} onClose - 关闭回调
 * @param {string} title - 标题(可选)
 * @param {React.ReactNode} children - 内容
 * @param {string} maxWidth - 最大宽度,默认 'max-w-md'
 * @param {boolean} showCloseButton - 是否显示关闭按钮,默认 true
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  showCloseButton = true,
}) {
  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-up"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部背景饰条 */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'var(--theme-gradient, linear-gradient(90deg, #10b981, #34d399))' }}
        />

        {/* 关闭按钮 */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-50 flex items-center justify-center w-8 h-8 rounded-full text-text-tertiary bg-bg-primary/30 ring-1 ring-inset ring-border/30 hover:bg-bg-primary hover:text-text hover:ring-border/60 hover:shadow-sm transition-all duration-200 active:scale-90 group"
            aria-label="关闭弹窗"
          >
            <X
              className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90"
              strokeWidth={2.5}
            />
          </button>
        )}

        {/* 标题 */}
        {title && (
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-text tracking-tight">{title}</h2>
          </div>
        )}

        {/* 内容 */}
        {children}
      </div>
    </div>
  );

  // 使用 portal 渲染到 body
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
