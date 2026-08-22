import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/settings';
import { isSmtpConfigured } from '@/lib/mailer';

// 公开的注册相关配置，供前端决定是否展示验证码输入
export async function GET() {
  try {
    const settings = await getSystemSettings();
    // 仅返回开关状态，不检查 SMTP 配置
    const emailVerification = settings.email_verification === 'true';

    return NextResponse.json({
      allowRegistration: settings.allow_registration !== 'false',
      emailVerification,
    });
  } catch {
    return NextResponse.json({ allowRegistration: true, emailVerification: false });
  }
}
