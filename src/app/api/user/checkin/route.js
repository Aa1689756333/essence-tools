import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getRequestUser } from '@/lib/request-user';
import { getSystemSettings, normalizeCheckinConfig } from '@/lib/settings';
import { computeEarned, getCycleDay } from '@/lib/checkin-core';

function getLocalDateStr(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
}

function getNextMilestone(config, mode, cycleDay) {
  if (mode === 'C') return null;

  const milestones = mode === 'A'
    ? config.capped.milestones
    : config.tiered.milestones;
  const next = (milestones || [])
    .filter((milestone) => milestone.day > cycleDay)
    .sort((a, b) => a.day - b.day)[0];

  return next ? { day: next.day, bonus: next.bonus, daysRemaining: next.day - cycleDay } : null;
}

function getCurrentTierDescription(config, mode, cycleDay) {
  if (mode === 'A') {
    const matchedRules = (config.capped.bonusRules || []).filter(
      (rule) => cycleDay >= rule.minDays && cycleDay <= (rule.maxDays ?? Infinity)
    );
    const dailyEarned = computeEarned(mode, config, cycleDay).dailyEarned;
    return `基础 ${config.capped.basePoints} 分，日常封顶 ${config.capped.dailyCap} �?{matchedRules.length ? `，当前额外奖�?${matchedRules.reduce((sum, rule) => sum + (rule.extraPoints || 0), 0)} 分` : ''}，今日到�?${dailyEarned} 分`;
  }

  if (mode === 'B') {
    const tier = (config.tiered.dailyTiers || []).find(
      ({ minDays, maxDays }) => cycleDay >= minDays && cycleDay <= maxDays
    );
    return tier ? `�?${tier.minDays}-${tier.maxDays} 天，每日基准 ${tier.dailyPoints} 分` : '当前无匹配积分档�?;
  }

  const dailyEarned = config.daily.days?.[cycleDay - 1] || 0;
  return `�?${cycleDay} 天自定义 ${dailyEarned} 分`;
}

export async function GET() {
  const user = await getRequestUser({ withDB: true });
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const today = getLocalDateStr();
  const yesterday = getYesterdayDateStr();
  const todayChecked = user.lastCheckInDate === today;
  const continuousCheckIn = user.lastCheckInDate === today || user.lastCheckInDate === yesterday
    ? user.continuousCheckIn
    : 0;

  const history = await db.pointTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthCheckins = await db.pointTransaction.findMany({
    where: {
      userId: user.id,
      type: 'CHECKIN',
      createdAt: { gte: monthStart, lt: nextMonthStart },
    },
    select: { createdAt: true },
  });
  const checkedDays = [...new Set(monthCheckins.map((tx) => tx.createdAt.getDate()))];

  const settings = await getSystemSettings();
  const config = normalizeCheckinConfig(settings.checkin_config);
  const cycleDay = continuousCheckIn > 0
    ? getCycleDay(continuousCheckIn, config.cycleLength, config.cycleReset)
    : 1;
  const expected = computeEarned(config.mode, config, cycleDay);

  return NextResponse.json({
    todayChecked,
    continuousCheckIn,
    lastCheckInDate: user.lastCheckInDate,
    points: user.points,
    history,
    monthCheckinCount: checkedDays.length,
    daysInMonth,
    checkedDays,
    monthFullBonus: 0,
    mode: config.mode,
    cycleDay,
    todayExpected: todayChecked ? 0 : expected.totalEarned,
    currentTier: getCurrentTierDescription(config, config.mode, cycleDay),
    nextMilestone: getNextMilestone(config, config.mode, cycleDay),
  });
}

export async function POST() {
  try {
    const user = await getRequestUser({ withDB: true });
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const today = getLocalDateStr();
    const yesterday = getYesterdayDateStr();
    const settings = await getSystemSettings();
    const config = normalizeCheckinConfig(settings.checkin_config);

    const result = await db.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { lastCheckInDate: true, continuousCheckIn: true, points: true },
      });
      const newContinuous = currentUser.lastCheckInDate === yesterday
        ? currentUser.continuousCheckIn + 1
        : 1;
      const cycleDay = getCycleDay(newContinuous, config.cycleLength, config.cycleReset);
      const earned = computeEarned(config.mode, config, cycleDay);

      const affected = await tx.user.updateMany({
        where: { id: user.id, NOT: { lastCheckInDate: today } },
        data: {
          points: { increment: earned.totalEarned },
          continuousCheckIn: newContinuous,
          lastCheckInDate: today,
        },
      });
      if (affected.count === 0) throw new Error('ALREADY_CHECKED');

      const dailyBalance = currentUser.points + earned.dailyEarned;
      const transactions = [];
      if (earned.dailyEarned > 0) {
        transactions.push(await tx.pointTransaction.create({
          data: {
            userId: user.id,
            amount: earned.dailyEarned,
            balance: dailyBalance,
            type: 'CHECKIN',
            description: `签到成功 (+${earned.dailyEarned} 积分，已连续 ${newContinuous} �?`,
          },
        }));
      }
      if (earned.milestoneBonus > 0) {
        transactions.push(await tx.pointTransaction.create({
          data: {
            userId: user.id,
            amount: earned.milestoneBonus,
            balance: currentUser.points + earned.totalEarned,
            type: 'MILESTONE_BONUS',
            description: `连签�?${cycleDay} 天里程碑奖励 (+${earned.milestoneBonus} 积分)`,
          },
        }));
      }

      const checkInLog = await tx.checkInLog.create({
        data: { userId: user.id, date: today, earned: earned.totalEarned },
      });
      const updatedUser = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          role: true,
          status: true,
          points: true,
          continuousCheckIn: true,
          lastCheckInDate: true,
        },
      });

      return { updatedUser, transactions, checkInLog, earned, newContinuous, cycleDay };
    });

    return NextResponse.json({
      message: `签到成功！增�?${result.earned.totalEarned} 积分`,
      user: result.updatedUser,
      earned: result.earned.totalEarned,
      dailyEarned: result.earned.dailyEarned,
      milestoneBonus: result.earned.milestoneBonus,
      fullMonthBonus: 0,
      totalEarned: result.earned.totalEarned,
      continuousCheckIn: result.newContinuous,
      cycleDay: result.cycleDay,
      transactions: result.transactions,
    });
  } catch (error) {
    if (error.message === 'ALREADY_CHECKED' || error.code === 'P2002') {
      return NextResponse.json({ error: '您今天已经签过到了，明天再来吧！' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || '签到失败' }, { status: 500 });
  }
}

