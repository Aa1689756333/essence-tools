import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getRequestUser } from '@/lib/request-user';
import {  } from '@/lib/auth';
import { getSystemSettings } from '@/lib/settings';

export async function GET() {
  const user = await getRequestUser({ withDB: true });
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const year = startOfToday.getFullYear();
  const month = String(startOfToday.getMonth() + 1).padStart(2, '0');
  const day = String(startOfToday.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const [totalUsers, todayNewUsers, todayCheckIns, pointAgg, recentUsers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startOfToday } } }),
    db.user.count({ where: { lastCheckInDate: todayStr } }),
    db.pointTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } },
    }),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        points: true,
        createdAt: true,
      },
    }),
  ]);

  const settings = await getSystemSettings();
  let smtpConfig = {};
  try { smtpConfig = JSON.parse(settings.smtp_config || '{}'); } catch {}

  const isSmtpConfigured = Boolean(smtpConfig.host && smtpConfig.user && smtpConfig.pass);

  return NextResponse.json({
    stats: {
      totalUsers,
      todayNewUsers,
      todayCheckIns,
      totalPointsIssued: pointAgg._sum.amount || 0,
      isSmtpConfigured,
      allowRegistration: settings.allow_registration === 'true',
      emailMode: settings.email_mode,
    },
    recentUsers,
  });
}
