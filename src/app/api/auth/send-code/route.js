import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSystemSettings, validateEmailRule } from '@/lib/settings';
import { isSmtpConfigured, sendMail } from '@/lib/mailer';
import { issueCode } from '@/lib/verification';
import { checkRateLimit, getClientIP, RateLimitRules } from '@/lib/rateLimit';

export async function POST(req) {
  try {
    // 速率限制检查
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(`send-code:${clientIP}`, RateLimitRules.SEND_CODE);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rateLimitResult.retryAfter / 60)} 分钟后重试` },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(RateLimitRules.SEND_CODE.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          }
        }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: '请填写邮箱' }, { status: 400 });
    }

    const settings = await getSystemSettings();
    if (settings.allow_registration === 'false') {
      return NextResponse.json({ error: '系统已暂停新用户注册' }, { status: 403 });
    }

    // 邮箱验证必须配置 SMTP，未配置则拒绝发送
    if (!(await isSmtpConfigured())) {
      return NextResponse.json(
        { error: '系统未配置邮箱 SMTP，无法发送验证码。请联系管理员配置。' },
        { status: 503 }
      );
    }

    // 邮箱域名规则校验
    const emailCheck = await validateEmailRule(email);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.reason }, { status: 403 });
    }

    // 已注册的邮箱不再发送
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    const result = await issueCode(email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    await sendMail({
      to: email,
      subject: '【ToolBox】注册验证码',
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #10b981; margin-bottom: 8px;">ToolBox 注册验证码</h2>
          <p style="color: #666; font-size: 14px;">您正在注册 ToolBox 账户，验证码为：</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">${result.code}</div>
          <p style="color: #888; font-size: 13px;">验证码 10 分钟内有效，请勿泄露给他人。若非本人操作，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #aaa;">此邮件由系统自动发出，无需回复。</p>
        </div>
      `,
    });

    return NextResponse.json({ verificationRequired: true, message: '验证码已发送至邮箱' });
  } catch (error) {
    return NextResponse.json({ error: error.message || '验证码发送失败' }, { status: 500 });
  }
}
