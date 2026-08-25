import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SUPPORTED_TYPES = new Set(['CHECKIN', 'MILESTONE_BONUS']);

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getCurrentMonthRange() {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth(), 1),
    lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInteger(searchParams.get('page'), 1);
  const requestedPageSize = parsePositiveInteger(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  const requestedType = searchParams.get('type');
  const type = SUPPORTED_TYPES.has(requestedType) ? requestedType : null;
  const where = {
    userId: user.id,
    ...(type ? { type } : {}),
  };
  const monthRange = getCurrentMonthRange();

  const [items, total, earned, spent, monthEarned] = await Promise.all([
    db.pointTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.pointTransaction.count({ where }),
    db.pointTransaction.aggregate({
      where: { userId: user.id, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    db.pointTransaction.aggregate({
      where: { userId: user.id, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    db.pointTransaction.aggregate({
      where: {
        userId: user.id,
        amount: { gt: 0 },
        createdAt: monthRange,
      },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    summary: {
      balance: user.points,
      totalEarned: earned._sum.amount || 0,
      totalSpent: Math.abs(spent._sum.amount || 0),
      monthEarned: monthEarned._sum.amount || 0,
    },
  });
}
