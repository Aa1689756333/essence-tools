'use client';

import Link from 'next/link';
import { Coins, Flame } from 'lucide-react';
import { getUserAvatarUrl } from '@/lib/avatar';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('zh-CN');
}

export default function UserBanner({ user }) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <Link
          href="/user/profile"
          className="flex min-w-0 items-center gap-3 rounded-xl transition-opacity hover:opacity-80"
        >
          <img
            src={getUserAvatarUrl(user)}
            alt="用户头像"
            className="h-12 w-12 shrink-0 rounded-2xl object-cover bg-bg-primary ring-1 ring-border/50"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-text">
                {user.nickname}
              </h1>
              {user.role === 'ADMIN' && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:text-primary-light">
                  管理员
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-text-secondary">
              {user.email} · 注册于 {formatDate(user.createdAt)}
            </p>
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <Link
            href="/user/points"
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 transition-colors hover:bg-bg-primary"
          >
            <Coins className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>
              <span className="block text-[11px] text-text-secondary">积分余额</span>
              <span className="block text-sm font-bold text-text">{user.points ?? 0}</span>
            </span>
          </Link>
          <Link
            href="/user/points"
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 transition-colors hover:bg-bg-primary"
          >
            <Flame className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <span>
              <span className="block text-[11px] text-text-secondary">连续签到</span>
              <span className="block text-sm font-bold text-text">
                {user.continuousCheckIn ?? 0} 天
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
