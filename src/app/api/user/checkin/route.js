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

  return NextResponse.json({
    todayChecked,
    continuousCheckIn: user.lastCheckInDate === today || user.lastCheckInDate === yesterday ? user.continuousCheckIn : 0,
    lastCheckInDate: user.lastCheckInDate,
    points: user.points,
    history,
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

    const newBalance = user.points + earned;

    const [updatedUser, transaction] = await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          points: { increment: earned },
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
          balance: newBalance,
          type: 'CHECKIN',
          description: `签到成功 (+${earned} 积分，已连续 ${newContinuous} 天)`,
        },
      }),
    ]);

    return NextResponse.json({
      message: `签到成功！增加 ${earned} 积分`,
      user: updatedUser,
      earned,
      continuousCheckIn: newContinuous,
      transaction,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '签到失败' }, { status: 500 });
  }
}
