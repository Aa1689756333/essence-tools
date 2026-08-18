import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')));
  const query = searchParams.get('q')?.trim() || '';
  const role = searchParams.get('role') || 'ALL';
  const status = searchParams.get('status') || 'ALL';

  const where = {};

  if (query) {
    where.OR = [
      { email: { contains: query } },
      { nickname: { contains: query } },
    ];
  }

  if (role !== 'ALL') where.role = role;
  if (status !== 'ALL') where.status = status;

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
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
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PATCH(req) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  try {
    const { userId, action, role, status, pointsDelta, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: '缺少目标用户 ID' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 });
    }

    if (action === 'update_role') {
      if (!['USER', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: '无效的角色类型' }, { status: 400 });
      }
      const updated = await db.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, nickname: true, role: true, status: true, points: true },
      });
      return NextResponse.json({ message: '用户角色已更新', user: updated });
    }

    if (action === 'update_status') {
      if (!['ACTIVE', 'BANNED'].includes(status)) {
        return NextResponse.json({ error: '无效的状态类型' }, { status: 400 });
      }
      const updated = await db.user.update({
        where: { id: userId },
        data: { status },
        select: { id: true, email: true, nickname: true, role: true, status: true, points: true },
      });
      return NextResponse.json({ message: status === 'BANNED' ? '用户已被封禁' : '用户已被解封', user: updated });
    }

    if (action === 'adjust_points') {
      const delta = parseInt(pointsDelta || '0');
      if (isNaN(delta) || delta === 0) {
        return NextResponse.json({ error: '请输入有效的积分变动数值' }, { status: 400 });
      }

      const newBalance = Math.max(0, targetUser.points + delta);

      const [updated] = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { points: newBalance },
          select: { id: true, email: true, nickname: true, role: true, status: true, points: true },
        }),
        db.pointTransaction.create({
          data: {
            userId,
            amount: delta,
            balance: newBalance,
            type: 'ADMIN_ADJUST',
            description: reason?.trim() || `管理员手动调整积分 (${delta > 0 ? '+' : ''}${delta})`,
          },
        }),
      ]);

      return NextResponse.json({ message: '积分调整成功', user: updated });
    }

    return NextResponse.json({ error: '未知的操作类型' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || '更新操作失败' }, { status: 500 });
  }
}
