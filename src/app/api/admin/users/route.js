import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { validateBody, adminUserPatchSchema } from '@/lib/validate';

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
    // 使用 zod 校验请求体
    const validation = await validateBody(req, adminUserPatchSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: validation.status }
      );
    }

    const { userId, action, role, status, pointsDelta, reason } = validation.data;

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 });
    }

    if (action === 'update_role') {
      // 自我保护：防止管理员降级自己
      if (userId === currentUser.id && role !== 'ADMIN') {
        return NextResponse.json({ error: '不能降级自己的管理员权限' }, { status: 403 });
      }

      // 系统保护：防止降级最后一个管理员
      if (role !== 'ADMIN' && targetUser.role === 'ADMIN') {
        const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
        if (adminCount === 1) {
          return NextResponse.json({ error: '不能降级系统唯一的管理员' }, { status: 403 });
        }
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, nickname: true, role: true, status: true, points: true },
      });
      return NextResponse.json({ message: '用户角色已更新', user: updated });
    }

    if (action === 'update_status') {
      // 自我保护：防止管理员封禁自己
      if (userId === currentUser.id && status === 'BANNED') {
        return NextResponse.json({ error: '不能封禁自己的账号' }, { status: 403 });
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
