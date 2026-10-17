import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-user';
import {} from '@/lib/auth';
import { testSmtpConnection } from '@/lib/mailer';

export async function POST(req) {
  const currentUser = await getRequestUser({ withDB: true });
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  try {
    const { smtpConfig, targetEmail } = await req.json();

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ error: '请提供有效的接收测试邮件的邮箱' }, { status: 400 });
    }

    const result = await testSmtpConnection(smtpConfig, targetEmail);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return NextResponse.json({ error: error.message || '测试邮件发送异常' }, { status: 500 });
  }
}
