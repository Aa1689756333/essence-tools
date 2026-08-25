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
                style={{ backgroundColor: 'var(--theme-subtle, #ecfdf5)', color: 'var(--theme-accent, #10b981)' }}
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

        {/* 月度日历小组件 (高级游戏化日历) */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {currentYear}年 {currentMonth + 1}月 打卡日历
            </span>
            <span className="text-[11px] text-text-tertiary flex items-center gap-1">
              连续签到 <span className="text-emerald-500 font-bold">{info?.continuousCheckIn || user?.continuousCheckIn || 0}</span> 天
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
              <div key={d} className="py-1 text-text-tertiary font-medium text-[11px]">
                {d}
              </div>
            ))}
            {daysArray.map((day) => {
              const isToday = day === todayDate;
              const isPast = day < todayDate;
              const isChecked = (info?.checkedDays || []).includes(day) || (isToday && info?.todayChecked);
              const isMissed = isPast && !isChecked;

              const pastPoints = historyPointsMap[day];

              let isProjectedMilestone = false;
              let milestoneBonus = 0;
              if (!isPast && !isToday && info?.nextMilestone) {
                const diff = day - todayDate;
                const projectedDay = (info.cycleDay || 1) + diff - (info.todayChecked ? 1 : 0);
                if (projectedDay === info.nextMilestone.day) {
                  isProjectedMilestone = true;
                  milestoneBonus = info.nextMilestone.bonus;
                }
              }

              let basePointsStr = '';
              if (info?.config) {
                if (info.mode === 'A') basePointsStr = info.config.capped?.basePoints || 1;
                else if (info.mode === 'B') basePointsStr = '阶梯';
                else if (info.mode === 'C') basePointsStr = '固定';
              }

              return (
                <div
                  key={day}
                  className={`relative flex flex-col items-center justify-center rounded-xl p-1 transition-all
                    ${isChecked ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : ''}
                    ${isMissed ? 'bg-bg-primary/40 text-text-tertiary opacity-40' : ''}
                    ${isToday && !isChecked ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse border border-emerald-400' : ''}
                    ${isProjectedMilestone ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md shadow-amber-500/20' : ''}
                    ${!isChecked && !isMissed && !isToday && !isProjectedMilestone ? 'bg-bg-primary/50 text-text-secondary border border-transparent' : ''}
                  `}
                  style={{ aspectRatio: '1/1.2' }}
                >
                  {/* 顶部日期 */}
                  <span className={`text-[11px] font-bold ${(isToday && !isChecked) || isProjectedMilestone ? 'text-white/90' : 'opacity-80'}`}>
                    {isToday ? '今天' : day}
                  </span>

                  {/* 底部状态/积分/图标 */}
                  <div className="mt-0.5 flex items-center justify-center h-4 w-full">
                    {isChecked ? (
                      <span className="text-[10px] font-bold flex items-center gap-0.5">
                         {pastPoints ? `+${pastPoints}` : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </span>
                    ) : isToday && !isChecked ? (
                      <span className="text-[11px] font-bold">+{info?.todayExpected || 0}</span>
                    ) : isProjectedMilestone ? (
                      <span className="text-[10px] font-bold flex items-center gap-0.5"><Award className="w-3 h-3" />+{milestoneBonus}</span>
                    ) : !isMissed ? (
                      <span className="text-[9px] font-medium opacity-60 flex items-center">
                        +{basePointsStr || '?'}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </Modal>
  );
}
