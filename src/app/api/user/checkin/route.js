import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getSystemSettings } from '@/lib/settings';

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

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const today = getLocalDateStr();
  const yesterday = getYesterdayDateStr();
  const todayChecked = user.lastCheckInDate === today;

  const history = await db.pointTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // 当月全勤进度统计
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
  let monthFullBonus = 0;
  try {
    if (settings.checkin_config) {
      monthFullBonus = JSON.parse(settings.checkin_config).monthFullBonus || 0;
    }
  } catch {}

  return NextResponse.json({
    todayChecked,
    continuousCheckIn: user.lastCheckInDate === today || user.lastCheckInDate === yesterday ? user.continuousCheckIn : 0,
    lastCheckInDate: user.lastCheckInDate,
    points: user.points,
    history,
    monthCheckinCount: checkedDays.length,
    daysInMonth,
    checkedDays,
    monthFullBonus,
  });
}

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const today = getLocalDateStr();
    if (user.lastCheckInDate === today) {
      return NextResponse.json({ error: '您今天已经签过到了，明天再来吧！' }, { status: 400 });
    }

    const yesterday = getYesterdayDateStr();
    let newContinuous = 1;
    if (user.lastCheckInDate === yesterday) {
      newContinuous = user.continuousCheckIn + 1;
    }

    const settings = await getSystemSettings();
    let checkinCfg = {
      basePoints: 3,
      bonusRules: [
        { minDays: 3, maxDays: 6, extraPoints: 2 },
        { minDays: 7, extraPoints: 4 },
      ],
      dailyCap: 7,
    };

    try {
      if (settings.checkin_config) {
        checkinCfg = { ...checkinCfg, ...JSON.parse(settings.checkin_config) };
      }
    } catch {}

    let earned = checkinCfg.basePoints || 3;
    const rules = checkinCfg.bonusRules || [];

    for (const rule of rules) {
      const min = rule.minDays || 0;
      const max = rule.maxDays || Infinity;
      if (newContinuous >= min && newContinuous <= max) {
        earned += (rule.extraPoints || 0);
      }
    }

    if (checkinCfg.dailyCap) {
      earned = Math.min(earned, checkinCfg.dailyCap);
    }

    // 整月全勤奖励：本月最后一天签到，且当月每天都已签到（不受 dailyCap 限制）
    let fullMonthBonus = 0;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isLastDayOfMonth = now.getDate() === daysInMonth;
    if (isLastDayOfMonth && (checkinCfg.monthFullBonus || 0) > 0) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const priorCheckins = await db.pointTransaction.count({
        where: {
          userId: user.id,
          type: 'CHECKIN',
          createdAt: { gte: monthStart, lt: nextMonthStart },
        },
      });
      // priorCheckins 不含本次签到，+1 后覆盖当月每一天即为全勤
      if (priorCheckins + 1 >= daysInMonth) {
        fullMonthBonus = checkinCfg.monthFullBonus;
      }
    }

    const totalEarned = earned + fullMonthBonus;
    const checkinBalance = user.points + earned;
    const finalBalance = user.points + totalEarned;

    const txOps = [
      db.user.update({
        where: { id: user.id },
        data: {
          points: { increment: totalEarned },
          continuousCheckIn: newContinuous,
          lastCheckInDate: today,
        },
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
      }),
      db.pointTransaction.create({
        data: {
          userId: user.id,
          amount: earned,
          balance: checkinBalance,
          type: 'CHECKIN',
          description: `签到成功 (+${earned} 积分，已连续 ${newContinuous} 天)`,
        },
      }),
    ];

    if (fullMonthBonus > 0) {
      txOps.push(
        db.pointTransaction.create({
          data: {
            userId: user.id,
            amount: fullMonthBonus,
            balance: finalBalance,
            type: 'MONTH_FULL_BONUS',
            description: `🎊 ${now.getMonth() + 1}月整月全勤奖励 (+${fullMonthBonus} 积分)`,
          },
        })
      );
    }

    const [updatedUser, transaction] = await db.$transaction(txOps);

    const message = fullMonthBonus > 0
      ? `签到成功！增加 ${earned} 积分，整月全勤额外奖励 ${fullMonthBonus} 积分！`
      : `签到成功！增加 ${earned} 积分`;

    return NextResponse.json({
      message,
      user: updatedUser,
      earned,
      fullMonthBonus,
      totalEarned,
      continuousCheckIn: newContinuous,
      transaction,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '签到失败' }, { status: 500 });
  }
}
