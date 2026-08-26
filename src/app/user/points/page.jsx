'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Check, Coins, Flame, Loader2, RefreshCw } from 'lucide-react';
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


function CustomSelect({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div 
      className="relative" 
      tabIndex={0} 
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[100px] px-3 py-1.5 bg-bg-primary hover:bg-bg-primary/80 border border-border/60 rounded-xl text-xs font-medium text-text transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 bg-card border border-border/80 rounded-xl shadow-lg shadow-black/5 overflow-hidden z-20 origin-top-right animate-in fade-in zoom-in-95 duration-150">
          <div className="p-1.5 flex flex-col gap-0.5">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-2.5 py-2 text-left text-xs rounded-lg transition-colors ${
                  value === option.value 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'text-text-secondary hover:bg-bg-primary hover:text-text'
                }`}
              >
                {option.label}
                {value === option.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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



  const currentMonthLabel = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  const totalPages = pointsData?.totalPages || 0;

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text">积分与签到记录</h2>
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-text">签到状态</h3>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{currentMonthLabel} · 开启新的连签周期赚取奖励</p>
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
            <Flame className={`h-3.5 w-3.5 ${checkInInfo?.todayChecked ? 'text-text-tertiary' : 'text-white'}`} aria-hidden="true" />
            {checkInInfo?.todayChecked ? '今日已签到' : '立即打卡'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Card 1: 本月打卡 */}
          <div className="rounded-xl bg-bg-primary p-4 border border-border/50">
            <div className="text-[11px] text-text-secondary mb-1">本月打卡</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-text">{checkInInfo?.monthCheckinCount || 0}</span>
              <span className="text-xs text-text-tertiary">/ {checkInInfo?.daysInMonth || 30} 天</span>
            </div>
            <div className="mt-1.5 text-[10px] text-text-tertiary truncate">
              {checkInInfo?.currentTier || '正在计算签到奖励'}
            </div>
          </div>
          
          {/* Card 2: 连签进度 */}
          <div className="rounded-xl bg-bg-primary p-4 border border-border/50">
            <div className="text-[11px] text-text-secondary mb-1">当前连续签到</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-500">{checkInInfo?.cycleDay || 1}</span>
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
                  <span className="text-xl font-bold text-amber-500">{checkInInfo.nextMilestone.daysRemaining}</span>
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

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" aria-hidden="true" /><h3 className="text-sm font-bold text-text">积分流水</h3></div><div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="font-medium">筛选</span>
          <CustomSelect options={typeOptions} value={type} onChange={handleTypeChange} />
        </div></div>
        {loading ? <div className="flex min-h-48 items-center justify-center text-xs text-text-secondary"><Loader2 className="mr-2 h-4 w-4 animate-spin" />加载中...</div> : pointsData?.items?.length ? <><div className="divide-y divide-border">{pointsData.items.map((transaction) => <div key={transaction.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-bg-primary px-2 py-0.5 text-[10px] font-medium text-text-secondary">{getTypeLabel(transaction.type)}</span><span className="text-xs font-medium text-text">{transaction.description}</span></div><p className="mt-1 text-[11px] text-text-secondary">{formatDate(transaction.createdAt)} · 余额 {transaction.balance}</p></div><span className={`text-sm font-bold ${transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{transaction.amount >= 0 ? '+' : ''}{transaction.amount}</span></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-text-secondary">共 {pointsData.total} 条记录</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label="上一页"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-16 text-center text-xs text-text-secondary">{page} / {totalPages || 1}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label="下一页"><ChevronRight className="h-4 w-4" /></button></div></div></> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><Coins className="mb-3 h-8 w-8 text-text-secondary" aria-hidden="true" /><p className="text-sm font-medium text-text">暂无积分记录</p><button type="button" onClick={openCheckIn} className="mt-2 text-xs font-medium text-[var(--theme-accent)] hover:underline">去签到赚取第一笔积分</button></div>}
      </section>
    </div>
  );
}
