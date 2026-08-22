'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Calendar, Flame, Coins, CheckCircle2, Loader2, Sparkles, Award } from 'lucide-react';

export default function CheckInModal() {
  const { showCheckInModal, closeCheckIn, user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCheckInInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/checkin');
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } catch {
      setError('加载签到信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showCheckInModal) {
      setError('');
      setSuccessMsg('');
      fetchCheckInInfo();
    }
  }, [showCheckInModal, fetchCheckInInfo]);

  if (!showCheckInModal) return null;

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      setError('');
      setSuccessMsg('');
      const res = await fetch('/api/user/checkin', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '签到失败');
      }

      setSuccessMsg(`🎉 ${data.message}`);
      if (data.user) {
        updateUser(data.user);
      }
      await fetchCheckInInfo();
    } catch (err) {
      setError(err.message || '签到异常');
    } finally {
      setCheckingIn(false);
    }
  };

  // 简单日历渲染 (当月)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDate = now.getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-up">
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* 顶部饰条 */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'var(--theme-gradient, linear-gradient(90deg, #10b981, #34d399))' }}
        />

        {/* 关闭按钮 */}
        <button
          onClick={closeCheckIn}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text hover:bg-bg-primary transition-colors cursor-pointer"
          aria-label="关闭弹窗"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 头部摘要 */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-text">每日签到</span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
                style={{ backgroundColor: 'var(--theme-subtle, #ecfdf5)', color: 'var(--theme-accent, #10b981)' }}
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                连续 {info?.continuousCheckIn || user?.continuousCheckIn || 0} 天
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">坚持每日打卡，积累稀缺积分</p>
          </div>

          <div className="text-right">
            <div className="text-xs text-text-tertiary">当前积分</div>
            <div className="text-xl font-bold text-text flex items-center gap-1 justify-end">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{user?.points || info?.points || 0}</span>
            </div>
          </div>
        </div>

        {/* 提示消息 */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* 签到按钮区域 */}
        <div className="mb-6">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || info?.todayChecked}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              info?.todayChecked
                ? 'bg-bg-primary text-text-tertiary border border-border cursor-not-allowed'
                : 'text-white hover:shadow-lg hover:scale-[1.01]'
            }`}
            style={
              !info?.todayChecked
                ? { background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }
                : {}
            }
          >
            {checkingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>打卡中...</span>
              </>
            ) : info?.todayChecked ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>今日已签到 (连续 {info?.continuousCheckIn} 天)</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>立即打卡签到 (+3~7 积分)</span>
              </>
            )}
          </button>
        </div>

        {/* 月度日历小组件 */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {currentYear}年 {currentMonth + 1}月 打卡概览
            </span>
            <span className="text-[11px] text-text-tertiary">稀缺积分规则</span>
          </div>

          {/* 整月全勤进度 */}
          {info?.monthFullBonus > 0 && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <Award className="w-3.5 h-3.5" />
                  整月全勤奖励 +{info.monthFullBonus} 积分
                </span>
                <span className="text-text-tertiary">
                  {info?.monthCheckinCount || 0}/{info?.daysInMonth || daysInMonth} 天
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-primary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                  style={{ width: `${Math.min(100, ((info?.monthCheckinCount || 0) / (info?.daysInMonth || daysInMonth)) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-text-tertiary mt-1.5">
                当月每天签到，月末最后一天可领取全勤奖励
              </p>
            </div>
          )}

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <div key={d} className="py-1 text-text-tertiary font-medium text-[11px]">
                {d}
              </div>
            ))}
            {daysArray.map((day) => {
              const isToday = day === todayDate;
              const isChecked = (info?.checkedDays || []).includes(day) || (isToday && info?.todayChecked);

              return (
                <div
                  key={day}
                  className={`h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                    isChecked
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                      : isToday
                      ? 'border border-border bg-bg-primary text-text font-bold'
                      : 'bg-bg-primary/50 text-text-secondary'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* 近期积分明细 */}
        <div>
          <h4 className="text-xs font-semibold text-text-secondary mb-2">积分交易记录</h4>
          <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {loading ? (
              <div className="text-center py-4 text-xs text-text-tertiary flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中...
              </div>
            ) : info?.history && info.history.length > 0 ? (
              info.history.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-bg-primary/40 border border-border/50 text-xs"
                >
                  <div>
                    <div className="font-medium text-text">{tx.description}</div>
                    <div className="text-[10px] text-text-tertiary">
                      {new Date(tx.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-text-tertiary">暂无积分记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
