'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, ChevronLeft, ChevronRight, Coins, Flame, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const typeOptions = [
  { value: '', label: '全部记录' },
  { value: 'CHECKIN', label: '签到' },
  { value: 'MILESTONE_BONUS', label: '里程碑奖励' },
];

function formatDate(value) {
  return new Date(value).toLocaleString('zh-CN');
}

function getTypeLabel(type) {
  return type === 'CHECKIN' ? '签到' : type === 'MILESTONE_BONUS' ? '里程碑奖励' : type;
}

export default function UserPointsPage() {
  const { user, openCheckIn } = useAuth();
  const [checkInInfo, setCheckInInfo] = useState(null);
  const [pointsData, setPointsData] = useState(null);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (type) query.set('type', type);
      const [checkInResponse, pointsResponse] = await Promise.all([
        fetch('/api/user/checkin'),
        fetch(`/api/user/points?${query.toString()}`),
      ]);
      const [checkInData, pointsResult] = await Promise.all([checkInResponse.json(), pointsResponse.json()]);
      if (!checkInResponse.ok) throw new Error(checkInData.error || '签到数据加载失败');
      if (!pointsResponse.ok) throw new Error(pointsResult.error || '积分数据加载失败');
      setCheckInInfo(checkInData);
      setPointsData(pointsResult);
    } catch (requestError) {
      setError(requestError.message || '积分数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = checkInInfo?.daysInMonth || new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [checkInInfo?.daysInMonth]);

  const currentMonthLabel = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  const currentDay = new Date().getDate();
  const totalPages = pointsData?.totalPages || 0;

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text">积分与签到记录</h2>
        <p className="mt-1 text-sm text-text-secondary">查看积分变化和签到状态，签到操作仍通过顶部火焰按钮完成。</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-500">
          <span>{error}</span>
          <button type="button" onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-2.5 py-1.5 hover:bg-rose-500/10"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />重试</button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '当前余额', value: pointsData?.summary?.balance ?? user?.points ?? 0, icon: Coins, color: 'text-amber-500' },
          { label: '本月获得', value: pointsData?.summary?.monthEarned ?? 0, icon: CalendarDays, color: 'text-sky-500' },
          { label: '累计获得', value: pointsData?.summary?.totalEarned ?? 0, icon: Award, color: 'text-emerald-500' },
          { label: '连续签到', value: `${checkInInfo?.continuousCheckIn ?? user?.continuousCheckIn ?? 0} 天`, icon: Flame, color: 'text-orange-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return <div key={stat.label} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs text-text-secondary">{stat.label}</span><Icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" /></div><p className="mt-3 text-xl font-bold text-text">{stat.value}</p></div>;
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Flame className="h-4 w-4 text-emerald-500" aria-hidden="true" /><h3 className="text-sm font-bold text-text">签到状态</h3></div><p className="mt-1 text-xs text-text-secondary">{currentMonthLabel} · 连签第 {checkInInfo?.cycleDay || 1} 天</p></div><button type="button" onClick={openCheckIn} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-bg-primary"><Flame className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />去签到</button></div>
        <div className="mb-5 rounded-xl bg-bg-primary p-3"><div className="flex items-center justify-between gap-3 text-xs text-text-secondary"><span>{checkInInfo?.currentTier || '正在计算签到奖励'}</span><span className="shrink-0">{checkInInfo?.todayChecked ? '今日已签到' : '今日未签到'}</span></div>{checkInInfo?.nextMilestone && <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-[11px] text-text-secondary"><span>距离第 {checkInInfo.nextMilestone.day} 天里程碑</span><span>还差 {checkInInfo.nextMilestone.daysRemaining} 天</span></div><div className="h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${Math.min(100, ((checkInInfo.cycleDay || 1) / checkInInfo.nextMilestone.day) * 100)}%` }} /></div></div>}</div>
        <div className="grid grid-cols-7 gap-1.5 text-center">{['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day} className="py-1 text-[11px] font-medium text-text-tertiary">{day}</span>)}{calendarDays.map((day, index) => { const checked = day && (checkInInfo?.checkedDays || []).includes(day); const today = day === currentDay; return <div key={`${day || 'empty'}-${index}`} className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium ${!day ? '' : checked ? 'border border-emerald-500/30 bg-emerald-500/20 font-bold text-emerald-600 dark:text-emerald-400' : today ? 'border border-border bg-bg-primary font-bold text-text' : 'bg-bg-primary/50 text-text-secondary'}`}>{day}</div>; })}</div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" aria-hidden="true" /><h3 className="text-sm font-bold text-text">积分流水</h3></div><label className="flex items-center gap-2 text-xs text-text-secondary"><span>筛选</span><select value={type} onChange={(event) => handleTypeChange(event.target.value)} className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text outline-none focus:border-[var(--theme-accent)]">{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
        {loading ? <div className="flex min-h-48 items-center justify-center text-xs text-text-secondary"><Loader2 className="mr-2 h-4 w-4 animate-spin" />加载中...</div> : pointsData?.items?.length ? <><div className="divide-y divide-border">{pointsData.items.map((transaction) => <div key={transaction.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-bg-primary px-2 py-0.5 text-[10px] font-medium text-text-secondary">{getTypeLabel(transaction.type)}</span><span className="text-xs font-medium text-text">{transaction.description}</span></div><p className="mt-1 text-[11px] text-text-secondary">{formatDate(transaction.createdAt)} · 余额 {transaction.balance}</p></div><span className={`text-sm font-bold ${transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{transaction.amount >= 0 ? '+' : ''}{transaction.amount}</span></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-text-secondary">共 {pointsData.total} 条记录</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label="上一页"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-16 text-center text-xs text-text-secondary">{page} / {totalPages || 1}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label="下一页"><ChevronRight className="h-4 w-4" /></button></div></div></> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><Coins className="mb-3 h-8 w-8 text-text-secondary" aria-hidden="true" /><p className="text-sm font-medium text-text">暂无积分记录</p><button type="button" onClick={openCheckIn} className="mt-2 text-xs font-medium text-[var(--theme-accent)] hover:underline">去签到赚取第一笔积分</button></div>}
      </section>
    </div>
  );
}
