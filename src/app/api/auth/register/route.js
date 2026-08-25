import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, createToken, COOKIE_NAME } from '@/lib/auth';
import { getSystemSettings, validateEmailRule } from '@/lib/settings';
import { isSmtpConfigured } from '@/lib/mailer';
import { verifyEmailCode } from '@/lib/verification';
import { validateBody, registerSchema } from '@/lib/validate';
import { checkRateLimit, getClientIP, RateLimitRules } from '@/lib/rateLimit';

export async function POST(req) {
  try {
    // 速率限制检查
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(`register:${clientIP}`, RateLimitRules.REGISTER);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rateLimitResult.retryAfter / 60)} 分钟后重试` },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(RateLimitRules.REGISTER.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          }
        }
      );
    }

    const validation = await validateBody(req, registerSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: validation.status });
    }
    
    const { email, password, nickname, code } = validation.data;

    const settings = await getSystemSettings();
    if (settings.allow_registration === 'false') {
      return NextResponse.json({ error: '系统已暂停新用户注册' }, { status: 403 });
    }

    const emailCheck = await validateEmailRule(email);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.reason }, { status: 403 });
    }

    // 邮箱验证码校验（开关开启时强制，未开启则跳过）
    if (settings.email_verification === 'true') {
      if (!(await isSmtpConfigured())) {
        return NextResponse.json(
          { error: '系统未配置邮箱 SMTP，无法完成注册。请联系管理员。' },
          { status: 503 }
        );
      }
      const codeCheck = await verifyEmailCode(email, code);
      if (!codeCheck.ok) {
        return NextResponse.json({ error: codeCheck.error }, { status: 400 });
      }
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    const totalUsers = await db.user.count();
    const role = totalUsers === 0 ? 'ADMIN' : 'USER';
    const passwordHash = await hashPassword(password);
    const userNickname = nickname?.trim() || email.split('@')[0];

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        nickname: userNickname,
        role,
        points: 0,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        points: true,
        continuousCheckIn: true,
        lastCheckInDate: true,
        createdAt: true,
      },
    });

    const token = await createToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user, message: '注册成功' });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || '注册失败' }, { status: 500 });
  }
}
