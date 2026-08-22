import db from './db';

const CODE_TTL_MS = 10 * 60 * 1000; // 验证码有效期 10 分钟
const RESEND_INTERVAL_MS = 60 * 1000; // 同一邮箱 60 秒内不可重复发送
const MAX_ATTEMPTS = 5; // 单个验证码最多校验次数

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 生成并存储验证码（带发送频率限制）。
 * @returns {{ ok: true, code: string } | { ok: false, error: string }}
 */
export async function issueCode(email) {
  const cleanEmail = email.toLowerCase().trim();

  const latest = await db.emailVerification.findFirst({
    where: { email: cleanEmail },
    orderBy: { createdAt: 'desc' },
  });

  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_INTERVAL_MS) {
    const wait = Math.ceil((RESEND_INTERVAL_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
    return { ok: false, error: `发送过于频繁，请 ${wait} 秒后再试` };
  }

  // 清除该邮箱旧验证码，保证同一时刻只有一个有效码
  await db.emailVerification.deleteMany({ where: { email: cleanEmail } });

  // 10% 概率触发全局过期清理，避免数据库无限膨胀
  if (Math.random() < 0.1) {
    try {
      await db.emailVerification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      // 清理失败不影响主流程
      console.error('Failed to cleanup expired verification codes:', error);
    }
  }

  const code = generateCode();
  await db.emailVerification.create({
    data: {
      email: cleanEmail,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return { ok: true, code };
}

/**
 * 校验验证码。成功后删除该邮箱全部验证码。
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export async function verifyEmailCode(email, code) {
  const cleanEmail = email.toLowerCase().trim();
  const inputCode = String(code || '').trim();

  if (!inputCode) {
    return { ok: false, error: '请填写邮箱验证码' };
  }

  const record = await db.emailVerification.findFirst({
    where: { email: cleanEmail },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { ok: false, error: '请先获取邮箱验证码' };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await db.emailVerification.deleteMany({ where: { email: cleanEmail } });
    return { ok: false, error: '验证码已过期，请重新获取' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await db.emailVerification.deleteMany({ where: { email: cleanEmail } });
    return { ok: false, error: '验证码错误次数过多，请重新获取' };
  }

  if (record.code !== inputCode) {
    await db.emailVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: '验证码错误' };
  }

  await db.emailVerification.deleteMany({ where: { email: cleanEmail } });
  return { ok: true };
}
