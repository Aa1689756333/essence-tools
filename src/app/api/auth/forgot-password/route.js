import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import db from '@/lib/db';
import { sendVerificationEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIP, RateLimitRules } from '@/lib/rateLimit';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
});

export async function POST(request) {
  try {
    // 速率限制检查
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(`forgot-password:${clientIP}`, RateLimitRules.FORGOT_PASSWORD);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rateLimitResult.retryAfter / 60)} 分钟后重试` },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(RateLimitRules.FORGOT_PASSWORD.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          }
        }
      );
    }

    // 解析并验证请求体
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
    }

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // 检查用户是否存在
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // 如果用户不存在，也返回成功（防止邮箱枚举攻击）
    if (!user) {
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，我们将发送密码重置验证码',
      });
    }

    // 3. 生成 6 位重置验证码
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟有效期

    // 删除该邮箱之前的所有密码重置验证码
    await db.emailVerification.deleteMany({
      where: {
        email: email.toLowerCase(),
        type: 'RESET_PASSWORD',
      },
    });

    // 创建新的验证码记录
    await db.emailVerification.create({
      data: {
        email: email.toLowerCase(),
        code,
        type: 'RESET_PASSWORD',
        expiresAt,
      },
    });

    // 发送验证码邮件
    try {
      await sendVerificationEmail(email, code, 'RESET_PASSWORD');
    } catch (error) {
      console.error('发送密码重置邮件失败:', error);
      // 即使邮件发送失败，也返回成功（防止邮箱枚举）
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，我们将发送密码重置验证码',
      });
    }

    return NextResponse.json({
      success: true,
      message: '密码重置验证码已发送到您的邮箱',
    });
  } catch (error) {
    console.error('忘记密码 API 错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
