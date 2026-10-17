'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Flame, Coins, CheckCircle2, Loader2, Sparkles, Award } from 'lucide-react';
import Modal from '@/components/ui/Modal';

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

  // 映射历史积分以便在日历上显示精确数值
  const historyPointsMap = {};
  if (info?.history) {
    info.history.forEach((tx) => {
      if (tx.type === 'CHECKIN') {
        const d = new Date(tx.createdAt).getDate();
        historyPointsMap[d] = tx.amount;
      }
    });
  }

  return (
    <Modal isOpen={showCheckInModal} onClose={closeCheckIn} maxWidth="max-w-lg">
      {/* 头部摘要 */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-text">每日签到</span>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
              style={{
                backgroundColor: 'var(--theme-subtle, #ecfdf5)',
                color: 'var(--theme-accent, #10b981)',
              }}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              连续 {info?.continuousCheckIn || user?.continuousCheckIn || 0} 天
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">坚持每日打卡，积累积分</p>
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
      <div className="mb-4">
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
              <span>立即打卡签到 (+{info?.todayExpected ?? 0} 积分)</span>
            </>
          )}
        </button>
      </div>

      {/* 里程碑进度预告 (多节点全景图) */}
      {(() => {
        const allMilestones = info?.config
          ? (info.config.mode === 'A'
              ? info.config.capped?.milestones
              : info.config.mode === 'B'
                ? info.config.tiered?.milestones
                : []) || []
          : [];

        if (!allMilestones.length || !info?.nextMilestone) return null;

        const maxDay = Math.max(...allMilestones.map((m) => m.day));
        const currentDay = info?.cycleDay || 1;
        const progressPercent = Math.min(100, Math.max(0, (currentDay / maxDay) * 100));

        return (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 to-amber-500/10 ring-1 ring-inset ring-amber-500/20">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <Award className="w-4 h-4 text-amber-500 drop-shadow-sm" />
                再连续签到{' '}
                <span className="text-amber-600 dark:text-amber-300 text-sm tabular-nums px-0.5">
                  {info.nextMilestone.daysRemaining}
                </span>{' '}
                天可解锁大奖
              </span>
              <span className="font-extrabold tabular-nums text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                +{info.nextMilestone.bonus}{' '}
                <span className="text-[10px] font-medium opacity-70 tracking-wide">积分</span>
              </span>
            </div>

            {/* 多节点进度条 */}
            <div className="w-full mt-9 mb-7 px-5 sm:px-6">
              <div className="relative h-1.5 w-full">
                {/* 背景轨道 */}
                <div className="absolute top-0 left-0 w-full h-full bg-amber-500/10 rounded-full ring-1 ring-inset ring-amber-500/10" />
                {/* 激活轨道 */}
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700 ease-out shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* 节点 */}
                {allMilestones.map((m) => {
                  const isCompleted = currentDay >= m.day;
                  const isNext = info.nextMilestone.day === m.day;
                  const leftPercent = (m.day / maxDay) * 100;

                  return (
                    <div
                      key={m.day}
                      className="absolute top-1/2 flex flex-col items-center z-10"
                      style={{ left: `${leftPercent}%`, transform: `translate(-50%, -50%)` }}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full ring-4 transition-all ${
                          isCompleted
                            ? 'bg-amber-500 ring-[#fffbeb] dark:ring-[#2d1b06]'
                            : isNext
                              ? 'bg-amber-400 ring-amber-200 dark:ring-amber-900/80 scale-125 shadow-sm'
                              : 'bg-amber-500/20 ring-[#fffbeb] dark:ring-[#2d1b06]'
                        }`}
                      />

                      {/* 底部天数 */}
                      <div
                        className={`absolute top-full mt-1.5 text-[10px] font-bold tabular-nums whitespace-nowrap ${
                          isNext
                            ? 'text-amber-600 dark:text-amber-400'
                            : isCompleted
                              ? 'text-amber-600/80 dark:text-amber-400/80'
                              : 'text-amber-700/40 dark:text-amber-400/40'
                        }`}
                      >
                        {m.day}天
                      </div>

                      {/* 顶部积分 */}
                      <div
                        className={`absolute bottom-full mb-1.5 text-[9px] font-extrabold tabular-nums whitespace-nowrap ${
                          isNext
                            ? 'text-amber-500 drop-shadow-sm text-[10px]'
                            : isCompleted
                              ? 'text-amber-500/80'
                              : 'text-amber-500/40'
                        }`}
                      >
                        +{m.bonus}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 月度日历小组件 (高级游戏化日历) */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {currentYear}年 {currentMonth + 1}月 打卡日历
          </span>
          <span className="text-[11px] text-text-tertiary flex items-center gap-1">
            连续签到{' '}
            <span className="text-emerald-500 font-bold">
              {info?.continuousCheckIn || user?.continuousCheckIn || 0}
            </span>{' '}
            天
          </span>
        </div>

        {/* 整月全勤进度 (极简版) */}
        {(info?.monthFullBonus ?? 0) > 0 && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              全月满签可额外获 +{info.monthFullBonus} 积分
            </span>
            <span className="text-[11px] text-text-tertiary font-medium">
              {info?.monthCheckinCount || 0}/{info?.daysInMonth || daysInMonth}
            </span>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 text-center text-xs">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div
              key={d}
              className="py-2 text-text-tertiary/60 font-bold text-[10px] tracking-widest"
            >
              {d}
            </div>
          ))}
          {(() => {
            let allMilestones = [];
            if (info?.config) {
              allMilestones =
                info.mode === 'A'
                  ? info.config.capped?.milestones || []
                  : info.mode === 'B'
                    ? info.config.tiered?.milestones || []
                    : [];
            }

            return daysArray.map((day) => {
              const isToday = day === todayDate;
              const isPast = day < todayDate;
              const isChecked =
                (info?.checkedDays || []).includes(day) || (isToday && info?.todayChecked);
              const isMissed = isPast && !isChecked;

              const pastPoints = historyPointsMap[day];

              let projectedDay = 1;
              let isNextMilestone = false;
              let isFutureMilestone = false;
              let milestoneBonus = 0;
              let projectedPoints = '?';

              if (!isPast && !isToday) {
                const diff = day - todayDate;
                projectedDay = (info?.cycleDay || 1) + diff - (info?.todayChecked ? 1 : 0);

                // 精准预测未来积分
                if (info?.config) {
                  const cfg = info.config;
                  if (cfg.mode === 'A') {
                    projectedPoints = cfg.capped?.basePoints || 1;
                  } else if (cfg.mode === 'B') {
                    const tier = (cfg.tiered?.dailyTiers || []).find(
                      (t) => projectedDay >= t.minDays && projectedDay <= t.maxDays
                    );
                    projectedPoints = tier ? tier.dailyPoints : 1;
                  } else if (cfg.mode === 'C') {
                    projectedPoints = cfg.daily?.days?.[projectedDay - 1] || 1;
                  }
                }

                // 预测大奖 (区分"下一个"与"其余")
                const hitMilestone = allMilestones.find((m) => m.day === projectedDay);
                if (hitMilestone) {
                  milestoneBonus = hitMilestone.bonus;
                  if (info?.nextMilestone && projectedDay === info.nextMilestone.day) {
                    isNextMilestone = true;
                  } else {
                    isFutureMilestone = true;
                  }
                }
              }

              // 统一的里程碑标识 (用于顶部日期颜色等)
              const isAnyProjectedMilestone = isNextMilestone || isFutureMilestone;

              return (
                <div
                  key={day}
                  className={`group relative flex flex-col items-center justify-center gap-0.5 p-1 rounded-[14px] transition-all duration-300 aspect-square
                      ${isChecked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' : ''}
                      ${isMissed ? 'bg-bg-primary/20 text-text-tertiary opacity-50' : ''}
                      ${isToday && !isChecked ? 'bg-emerald-500 text-white shadow-[0_8px_16px_-4px_rgba(16,185,129,0.4)] ring-1 ring-inset ring-white/20' : ''}
                      ${isNextMilestone ? 'bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-400/40 shadow-sm' : ''}
                      ${isFutureMilestone ? 'bg-amber-50/40 dark:bg-amber-900/10 text-amber-600/70 dark:text-amber-400/70 ring-1 ring-inset ring-amber-500/15' : ''}
                      ${!isChecked && !isMissed && !isToday && !isAnyProjectedMilestone ? 'bg-bg-primary/30 text-text-secondary hover:bg-bg-primary/50' : ''}
                    `}
                >
                  {/* 顶部日期 */}
                  <span
                    className={`text-xs sm:text-[13px] font-medium tabular-nums tracking-tight ${isToday && !isChecked ? 'text-white' : isNextMilestone ? 'text-amber-600 dark:text-amber-400' : isFutureMilestone ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-text-secondary'}`}
                  >
                    {isToday ? '今' : day}
                  </span>

                  {/* 底部状态/积分/图标 */}
                  <div className="flex items-center justify-center w-full">
                    {isChecked ? (
                      <span className="text-[10px] sm:text-[11px] font-semibold tabular-nums flex items-center gap-0.5">
                        {pastPoints ? (
                          `+${pastPoints}`
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </span>
                    ) : isToday && !isChecked ? (
                      <span className="text-xs sm:text-[13px] font-bold tabular-nums drop-shadow-md">
                        +{info?.todayExpected || 0}
                      </span>
                    ) : isNextMilestone ? (
                      <span className="text-[10px] sm:text-[11px] font-bold tabular-nums flex items-center gap-0.5">
                        <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-500/20 opacity-80" />
                        +{milestoneBonus}
                      </span>
                    ) : isFutureMilestone ? (
                      <span className="text-[9px] sm:text-[10px] font-semibold tabular-nums flex items-center gap-0.5">
                        <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-40" />+{milestoneBonus}
                      </span>
                    ) : !isMissed ? (
                      <span className="text-[9px] sm:text-[11px] font-medium tabular-nums text-text-tertiary/70 flex items-center">
                        +{projectedPoints}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </Modal>
  );
}
