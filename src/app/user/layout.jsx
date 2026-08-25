'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldCheck, UserRound, Coins, LockKeyhole } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserBanner from '@/components/user/UserBanner';

const tabs = [
  { path: '/user', name: '概览', icon: UserRound },
  { path: '/user/profile', name: '个人资料', icon: UserRound },
  { path: '/user/points', name: '积分记录', icon: Coins },
  { path: '/user/security', name: '账号安全', icon: LockKeyhole },
];

export default function UserLayout({ children }) {
  const { user, loading, openAuth } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-text-secondary">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-500" aria-hidden="true" />
        <p className="text-sm font-medium">正在加载账户信息...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg animate-fade-up">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text">请先登录</h2>
        <p className="mb-6 text-xs leading-relaxed text-text-secondary">登录后即可查看个人资料、积分记录和账号安全设置。</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
          >
            立即登录
          </button>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-bg-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-up">
      <UserBanner user={user} />
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-bg-primary p-1" role="tablist" aria-label="用户中心导航">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              role="tab"
              aria-current={isActive ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${isActive ? 'bg-card font-semibold text-text shadow-xs' : 'text-text-secondary hover:text-text'}`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[var(--theme-accent)]' : ''}`} aria-hidden="true" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
