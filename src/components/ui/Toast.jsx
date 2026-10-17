'use client';

import { useToast } from '@/context/ToastContext';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const toastStyles = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-500',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-500',
    icon: XCircle,
  },
  info: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-500',
    icon: Info,
  },
};

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type] || toastStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-in slide-in-from-right duration-300 ${style.bg} ${style.border}`}
            style={{ minWidth: '280px', maxWidth: '400px' }}
          >
            <Icon className={`w-5 h-5 shrink-0 ${style.text}`} />
            <span className={`flex-1 text-sm font-medium ${style.text}`}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5 text-text-secondary" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
