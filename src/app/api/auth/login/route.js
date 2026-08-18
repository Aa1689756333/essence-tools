import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: '请填写邮箱和密码' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    if (user.status === 'BANNED') {
      return NextResponse.json({ error: '该账户已被冻结禁用，请联系管理员' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const token = await createToken({ id: user.id, email: user.email, role: user.role });

    const safeUser = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      points: user.points,
      continuousCheckIn: user.continuousCheckIn,
      lastCheckInDate: user.lastCheckInDate,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({ user: safeUser, message: '登录成功' });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || '登录失败' }, { status: 500 });
  }
}
