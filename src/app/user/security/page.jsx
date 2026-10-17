'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, KeyRound, LogIn, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

function getPasswordStrength(password) {
  if (!password) return { label: '未输入', color: 'bg-border', width: '0%' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { label: '较弱', color: 'bg-rose-500', width: '35%' };
  if (score <= 3) return { label: '中等', color: 'bg-amber-500', width: '65%' };
  return { label: '较强', color: 'bg-emerald-500', width: '100%' };
}

export default function UserSecurityPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码至少需要 6 个字符');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_password', currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordError(data.error || '密码更新失败');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(data.message || '密码更新成功');
    } catch {
      toast.error('密码更新失败，请稍后重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteSubmit = async (event) => {
    event.preventDefault();
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('请输入密码确认注销');
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account', password: deletePassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || '账号注销失败');
        return;
      }
      toast.success(data.message || '账号注销成功');
      await logout();
      router.push('/');
    } catch {
      toast.error('账号注销失败，请稍后重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-primary text-[var(--theme-accent)]">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">修改密码</h2>
            <p className="mt-0.5 text-xs text-text-secondary">定期更新密码，保护账号安全</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-4" noValidate>
          <div>
            <label
              htmlFor="current-password"
              className="mb-2 block text-xs font-semibold text-text"
            >
              当前密码
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-[var(--theme-accent)]"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-xs font-semibold text-text">
              新密码
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setPasswordError('');
              }}
              autoComplete="new-password"
              minLength={6}
              maxLength={128}
              required
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-[var(--theme-accent)]"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-primary">
                <div
                  className={`h-full rounded-full transition-all ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <span className="w-10 text-right text-[11px] text-text-secondary">
                {strength.label}
              </span>
            </div>
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-xs font-semibold text-text"
            >
              确认新密码
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setPasswordError('');
              }}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-[var(--theme-accent)]"
            />
          </div>
          {passwordError && (
            <p className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-500">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {passwordError}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))',
            }}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            {passwordLoading ? '正在更新...' : '更新密码'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-text">登录状态</h2>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              当前会话有效期为 7 天。修改密码不会强制其他设备下线。
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-bg-primary px-3 py-2 text-xs text-text-secondary">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              当前登录账号：{user.email}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/30 bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-rose-500">注销账号</h2>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              注销后，账号、积分、签到记录及相关数据将永久删除，且无法恢复。请确认已保存需要保留的信息。
            </p>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                我要注销账号
              </button>
            ) : (
              <form onSubmit={handleDeleteSubmit} className="mt-4 max-w-md space-y-3" noValidate>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-500">
                  这是不可逆操作。请输入当前密码以确认。
                </div>
                <label htmlFor="delete-password" className="block text-xs font-semibold text-text">
                  当前密码
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(event) => {
                    setDeletePassword(event.target.value);
                    setDeleteError('');
                  }}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-rose-500"
                />
                {deleteError && <p className="text-xs text-rose-500">{deleteError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {deleteLoading ? '处理中...' : '确认注销'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text hover:bg-bg-primary"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
