import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-user';
import {} from '@/lib/auth';
import db from '@/lib/db';
import { z } from 'zod';

// 更新昵称 schema
const updateNicknameSchema = z.object({
  action: z.literal('update_nickname'),
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过50个字符'),
});

// 更新密码 schema
const updatePasswordSchema = z.object({
  action: z.literal('update_password'),
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(6, '新密码至少6个字符').max(128, '密码不能超过128个字符'),
});

// 注销账号 schema
const deleteAccountSchema = z.object({
  action: z.literal('delete_account'),
  password: z.string().min(1, '请输入密码以确认注销'),
});

// 更新头像 schema
const updateAvatarSchema = z.object({
  action: z.literal('update_avatar'),
  avatarStyle: z.string().min(1),
  avatarSeed: z.string().min(1),
});

const profileSchema = z.discriminatedUnion('action', [
  updateNicknameSchema,
  updatePasswordSchema,
  deleteAccountSchema,
  updateAvatarSchema,
]);

// GET: 获取当前用户信息
export async function GET() {
  try {
    const user = await getRequestUser({ withDB: true });
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}

// PATCH: 更新用户资料
export async function PATCH(request) {
  try {
    const user = await getSessionUser(true);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();

    // 验证请求体
    const validation = profileSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ error: '请求参数错误', details: errors }, { status: 400 });
    }

    const data = validation.data;

    // 更新昵称
    if (data.action === 'update_nickname') {
      // 检查昵称是否已被使用
      const existingUser = await db.user.findFirst({
        where: {
          nickname: data.nickname,
          id: { not: user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: '该昵称已被使用' }, { status: 409 });
      }

      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { nickname: data.nickname },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          avatarStyle: true,
          avatarSeed: true,
          role: true,
          status: true,
          points: true,
          continuousCheckIn: true,
          lastCheckInDate: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        message: '昵称更新成功',
        user: updatedUser,
      });
    }

    // 更新头像
    if (data.action === 'update_avatar') {
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          avatarStyle: data.avatarStyle,
          avatarSeed: data.avatarSeed,
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          avatarStyle: true,
          avatarSeed: true,
          role: true,
          status: true,
          points: true,
          continuousCheckIn: true,
          lastCheckInDate: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        message: '头像更新成功',
        user: updatedUser,
      });
    }

    // 更新密码
    if (data.action === 'update_password') {
      // 验证当前密码
      const isValid = await verifyPassword(data.currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
      }

      // 哈希新密码
      const newPasswordHash = await hashPassword(data.newPassword);

      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      return NextResponse.json({
        message: '密码更新成功',
      });
    }

    // 注销账号
    if (data.action === 'delete_account') {
      // 验证密码
      const isValid = await verifyPassword(data.password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: '密码错误' }, { status: 401 });
      }

      // 检查是否是唯一管理员
      if (user.role === 'ADMIN') {
        const adminCount = await db.user.count({
          where: { role: 'ADMIN' },
        });
        if (adminCount === 1) {
          return NextResponse.json({ error: '不能注销系统唯一管理员的账号' }, { status: 403 });
        }
      }

      // 删除用户（cascade 会自动删除关联的 PointTransaction）
      await db.user.delete({
        where: { id: user.id },
      });

      // 清除 session cookie
      const response = NextResponse.json({
        message: '账号注销成功',
      });
      response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: '不支持的操作' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/user/profile error:', error);
    return NextResponse.json({ error: '更新用户资料失败' }, { status: 500 });
  }
}
