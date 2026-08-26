'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  Check,
  Copy,
  IdCard,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  Dices,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getUserAvatarUrl, AVATAR_STYLES, AVATAR_STYLE_LABELS } from '@/lib/avatar';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserProfilePage() {
  const { user, refreshUser, updateUser } = useAuth();
  const { toast } = useToast();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatarStyle, setAvatarStyle] = useState(user?.avatarStyle || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.avatarSeed || user?.id || '');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNickname(user?.nickname || '');
    setAvatarStyle(user?.avatarStyle || '');
    setAvatarSeed(user?.avatarSeed || user?.id || '');
  }, [user?.nickname, user?.avatarStyle, user?.avatarSeed, user?.id]);

  const handleRandomizeAvatar = useCallback(async () => {
    // Generate a new random seed (short string)
    const newSeed = Date.now().toString(36).substring(3, 9);
    setAvatarSeed(newSeed);
  }, []);

  const handleStyleChange = (e) => {
    setAvatarStyle(e.target.value);
  };

  const saveAvatar = async (style, seed) => {
    try {
      setSavingAvatar(true);

      // If style is empty, default to computing it
      let targetStyle = style;
      if (!targetStyle) {
        let hash = 0;
        const str = user.id || '';
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        targetStyle = AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
      }

      // Eagerly update context to survive Fast Refresh remounts
      updateUser({ avatarStyle: targetStyle, avatarSeed: seed });

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_avatar',
          avatarStyle: targetStyle,
          avatarSeed: seed,
        }),
      });
      if (response.ok) {
        toast.success('头像已保存');
      } else {
        toast.error('头像保存失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setSavingAvatar(false);
    }
  };

  const trimmedNickname = nickname.trim();
  const hasChanged = trimmedNickname !== user?.nickname;

  const validateNickname = () => {
    if (!trimmedNickname) return '昵称不能为空';
    if (trimmedNickname.length > 50) return '昵称不能超过 50 个字符';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateNickname();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_nickname', nickname: trimmedNickname }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || '昵称更新失败');
        return;
      }

      await refreshUser();
      toast.success(data.message || '昵称更新成功');
    } catch {
      toast.error('昵称更新失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success('用户 ID 已复制');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const accountItems = [
    { label: '邮箱', value: user.email, description: '邮箱暂不支持修改', icon: Mail },
    { label: '注册时间', value: formatDate(user.createdAt), icon: CalendarDays },
    { label: '账号角色', value: user.role === 'ADMIN' ? '管理员' : '普通用户', icon: ShieldCheck },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-primary text-[var(--theme-accent)]">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">个人资料</h2>
            <p className="mt-0.5 text-xs text-text-secondary">修改公开显示的昵称</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-bg-primary p-4">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={getUserAvatarUrl({ id: user.id, avatarStyle, avatarSeed })}
                alt="头像预览"
                className="h-16 w-16 shrink-0 rounded-2xl object-cover bg-card shadow-sm border border-border/50"
              />
              <div>
                <p className="text-sm font-bold text-text">自定义头像</p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                  无限生成，尽情探索
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={avatarStyle || ''}
                onChange={handleStyleChange}
                disabled={savingAvatar}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-text outline-none focus:border-[var(--theme-accent)] cursor-pointer shadow-sm"
              >
                <option value="" disabled>
                  选择偏好风格
                </option>
                {AVATAR_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {AVATAR_STYLE_LABELS[s] || s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                disabled={savingAvatar}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-text shadow-sm transition-colors hover:bg-bg-primary hover:text-text disabled:opacity-50"
              >
                <Dices className={`h-3.5 w-3.5 ${savingAvatar ? 'animate-spin' : ''}`} />
                换个长相
              </button>
            </div>
          </div>

          {(avatarStyle !== (user?.avatarStyle || '') ||
            avatarSeed !== (user?.avatarSeed || user?.id || '')) && (
            <div className="mt-4 flex justify-end pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={() => saveAvatar(avatarStyle, avatarSeed)}
                disabled={savingAvatar}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))',
                }}
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {savingAvatar ? '保存中...' : '保存新头像'}
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="profile-nickname" className="mb-2 block text-xs font-semibold text-text">
            昵称
          </label>
          <input
            id="profile-nickname"
            type="text"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              if (error) setError('');
            }}
            onBlur={() => setError(validateNickname())}
            maxLength={50}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'nickname-error' : 'nickname-help'}
            className={`w-full rounded-xl border bg-bg px-4 py-2.5 text-sm text-text outline-none transition-colors focus:border-[var(--theme-accent)] ${error ? 'border-rose-500' : 'border-border'}`}
          />
          <div className="mt-2 flex items-start justify-between gap-3 text-[11px]">
            {error ? (
              <p id="nickname-error" className="text-rose-500">
                {error}
              </p>
            ) : (
              <p id="nickname-help" className="text-text-secondary">
                昵称长度为 1–50 个字符，且不能与其他用户重复。
              </p>
            )}
            <span className="shrink-0 text-text-secondary">{nickname.length}/50</span>
          </div>
          <button
            type="submit"
            disabled={!hasChanged || submitting || Boolean(validateNickname())}
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))',
            }}
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {submitting ? '正在保存...' : '保存昵称'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-primary text-[var(--theme-accent)]">
            <IdCard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">账号信息</h2>
            <p className="mt-0.5 text-xs text-text-secondary">以下信息仅供查看</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {accountItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-3 py-4 first:pt-0">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] text-text-secondary">{item.label}</p>
                  <p className="mt-1 break-all text-sm font-medium text-text">{item.value}</p>
                  {item.description && (
                    <p className="mt-1 text-[11px] text-text-secondary">{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-start gap-3 py-4">
            <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-text-secondary">用户 ID</p>
              <p className="mt-1 break-all font-mono text-xs font-medium text-text">{user.id}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-primary hover:text-text"
              aria-label="复制用户 ID"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
