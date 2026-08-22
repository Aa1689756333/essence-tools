import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  code: z.string().length(6, '验证码必须是6位'),
  newPassword: z.string().min(6, '密码长度至少6位').max(128, '密码长度不能超过128位'),
});

export async function POST(request) {
  try {
    // 解析并验证请求体
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
    }

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: '输入数据格式错误', details: errors },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = validation.data;

    // 查找验证码记录
    const verification = await db.emailVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        type: 'RESET_PASSWORD',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: '验证码不存在或已过期' },
        { status: 400 }
      );
    }

    // 检查验证码是否过期
    if (verification.expiresAt < new Date()) {
      await db.emailVerification.delete({
        where: { id: verification.id },
      });
      return NextResponse.json(
        { error: '验证码已过期' },
        { status: 400 }
      );
    }

    // 检查验证码是否正确
    if (verification.code !== code) {
      // 增加错误尝试次数
      await db.emailVerification.update({
        where: { id: verification.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      // 如果错误次数超过5次，删除验证码
      if (verification.attempts + 1 >= 5) {
        await db.emailVerification.delete({
          where: { id: verification.id },
        });
        return NextResponse.json(
          { error: '验证码错误次数过多，请重新获取' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: '验证码不正确' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 更新密码
    const passwordHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 删除验证码记录
    await db.emailVerification.delete({
      where: { id: verification.id },
    });

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error) {
    console.error('重置密码 API 错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
