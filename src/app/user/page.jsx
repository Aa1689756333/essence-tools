'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Award,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Coins,
  Flame,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const shortcuts = [
  {
    href: '/user/profile',
    title: '个人资料',
    description: '修改昵称，查看账号信息',
    icon: UserRound,
  },
  { href: '/user/points', title: '积分记录', description: '查看积分余额和流水', icon: Coins },
  {
    href: '/user/security',
    title: '账号安全',
    description: '修改密码和注销账号',
    icon: LockKeyhole,
  },
];

function getJoinedDays(createdAt) {
  if (!createdAt) return 1;
  const difference = Date.now() - new Date(createdAt).getTime();
  return Math.max(1, Math.floor(difference / 86400000) + 1);
}

function formatTransactionTime(value) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserOverviewPage() {
  const { user, openCheckIn } = useAuth();
  const currentMonthLabel = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });
  const [checkInInfo, setCheckInInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/user/checkin');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '概览数据加载失败');
      setCheckInInfo(data);
    } catch (requestError) {
      setError(requestError.message || '概览数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const stats = [
    {
      label: '积分余额',
      value: user?.points ?? 0,
      detail: '查看积分明细',
      icon: Coins,
      color: 'text-amber-500',
      href: '/user/points',
    },
    {
      label: '账号状态',
      value: user?.status === 'ACTIVE' ? '正常' : '已停用',
      detail: user?.role === 'ADMIN' ? '管理员账户' : '普通用户账户',
      icon: ShieldCheck,
      color: user?.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500',
      href: '/user/security',
    },
    {
      label: '加入天数',
      value: `${getJoinedDays(user?.createdAt)} 天`,
      detail: '感谢你的使用',
      icon: CalendarDays,
      color: 'text-sky-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text">账户概览</h2>
        <p className="mt-1 text-sm text-text-secondary">查看账户状态，并快速进入常用用户功能。</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-secondary">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
              <p className="mt-3 text-xl font-bold text-text">{stat.value}</p>
              <p className="mt-1 text-[11px] text-text-secondary">{stat.detail}</p>
            </>
          );
          const className =
            'rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md';

          if (stat.action) {
            return (
              <button key={stat.label} type="button" onClick={stat.action} className={className}>
                {content}
              </button>
            );
          }
          if (stat.href) {
            return (
              <Link key={stat.label} href={stat.href} className={className}>
                {content}
              </Link>
            );
          }
          return (
            <div key={stat.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      {/* 签到状态卡片群 */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-text">签到状态</h3>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {currentMonthLabel} · 开启新的连签周期赚取奖励
            </p>
          </div>
          <button
            type="button"
            onClick={openCheckIn}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
              checkInInfo?.todayChecked
                ? 'bg-bg-primary border-border text-text-secondary cursor-default'
                : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${checkInInfo?.todayChecked ? 'text-text-tertiary' : 'text-white'}`}
              aria-hidden="true"
            />
            {checkInInfo?.todayChecked ? '今日已签到' : '立即打卡'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Card 1: 本月打卡 */}
          <div className="rounded-xl bg-bg-primary p-4 border border-border/50">
            <div className="text-[11px] text-text-secondary mb-1">本月打卡</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-text">
                {checkInInfo?.monthCheckinCount || 0}
              </span>
              <span className="text-xs text-text-tertiary">
                / {checkInInfo?.daysInMonth || 30} 天
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-text-tertiary truncate">
              {checkInInfo?.currentTier || '正在计算签到奖励'}
            </div>
          </div>

          {/* Card 2: 连签进度 */}
          <div className="rounded-xl bg-bg-primary p-4 border border-border/50">
            <div className="text-[11px] text-text-secondary mb-1">当前连续签到</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-500">
                {checkInInfo?.cycleDay || 1}
              </span>
              <span className="text-xs text-text-tertiary">天</span>
            </div>
            <div className="mt-1.5 text-[10px] text-emerald-600/70 dark:text-emerald-400/70 truncate">
              保持连签，获取更高基础奖励
            </div>
          </div>

          {/* Card 3: 下一个里程碑 */}
          <div className="relative overflow-hidden rounded-xl bg-bg-primary p-4 border border-border/50">
            {checkInInfo?.nextMilestone ? (
              <>
                <div className="text-[11px] text-text-secondary mb-1">距离下个大奖</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-amber-500">
                    {checkInInfo.nextMilestone.daysRemaining}
                  </span>
                  <span className="text-xs text-text-tertiary">天</span>
                </div>
                <div className="mt-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate">
                  可额外获得 +{checkInInfo.nextMilestone.bonus} 积分
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-text-secondary mb-1">里程碑状态</div>
                <div className="text-sm font-semibold text-text-secondary mt-1">暂无下一阶段</div>
                <div className="mt-1.5 text-[10px] text-text-tertiary truncate">
                  当前周期奖励已全部解锁
                </div>
              </>
            )}
            <Award className="absolute -right-3 -bottom-3 h-16 w-16 -rotate-12 text-amber-500/10 pointer-events-none" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-text">快捷入口</h3>
          </div>
          <div className="grid gap-3">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-primary text-[var(--theme-accent)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-text">{item.title}</h4>
                    <p className="mt-1 truncate text-xs text-text-secondary">{item.description}</p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-text">最近积分动态</h3>
            </div>
            <Link
              href="/user/points"
              className="text-xs font-medium text-[var(--theme-accent)] hover:underline"
            >
              查看全部
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="正在加载积分动态">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded-xl bg-bg-primary" />
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-36 flex-col items-center justify-center text-center">
              <p className="text-xs text-rose-500">{error}</p>
              <button
                type="button"
                onClick={fetchOverview}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text hover:bg-bg-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                重试
              </button>
            </div>
          ) : checkInInfo?.history?.length ? (
            <div className="divide-y divide-border">
              {checkInInfo.history.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <CircleCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text">
                      {transaction.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {formatTransactionTime(transaction.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                  >
                    {transaction.amount >= 0 ? '+' : ''}
                    {transaction.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center text-center">
              <Coins className="mb-3 h-8 w-8 text-text-secondary" aria-hidden="true" />
              <p className="text-sm font-medium text-text">暂无积分记录</p>
              <button
                type="button"
                onClick={openCheckIn}
                className="mt-2 text-xs font-medium text-[var(--theme-accent)] hover:underline"
              >
                去签到赚取积分
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
