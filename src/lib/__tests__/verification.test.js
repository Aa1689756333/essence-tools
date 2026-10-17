import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  emailVerification: {
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../db', () => ({ default: dbMock, db: dbMock }));

const { issueCode, verifyEmailCode } = await import('../verification');

const TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;

beforeEach(() => {
  Object.values(dbMock.emailVerification).forEach((fn) => fn.mockReset());
  dbMock.emailVerification.create.mockResolvedValue({});
  dbMock.emailVerification.deleteMany.mockResolvedValue({ count: 0 });
  dbMock.emailVerification.update.mockResolvedValue({});
  // 默认不让 10% 概率的全局清理分支被触发，保证调用次数可断言
  vi.spyOn(Math, 'random').mockReturnValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('issueCode', () => {
  it('无历史记录时直接发码，且是 6 位数字', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue(null);

    const r = await issueCode('someone@qq.com');

    expect(r.ok).toBe(true);
    expect(r.code).toMatch(/^\d{6}$/);
    expect(dbMock.emailVerification.create).toHaveBeenCalledTimes(1);
  });

  it('60 秒内重复申请被拒，且不写库', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({ createdAt: new Date() });

    const r = await issueCode('someone@qq.com');

    expect(r.ok).toBe(false);
    expect(r.error).toContain('发送过于频繁');
    expect(dbMock.emailVerification.create).not.toHaveBeenCalled();
  });

  it('超过 60 秒限制即可重发', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - RESEND_MS - 1),
    });

    const r = await issueCode('someone@qq.com');

    expect(r.ok).toBe(true);
    expect(dbMock.emailVerification.create).toHaveBeenCalledTimes(1);
  });

  it('发码前先清掉该邮箱的旧验证码', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue(null);

    await issueCode('someone@qq.com');

    expect(dbMock.emailVerification.deleteMany).toHaveBeenCalledTimes(1);
    expect(dbMock.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { email: 'someone@qq.com' },
    });
  });

  it('邮箱统一转小写去空格后再入库', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue(null);

    await issueCode('  Someone@QQ.COM  ');

    expect(dbMock.emailVerification.findFirst).toHaveBeenCalledWith({
      where: { email: 'someone@qq.com' },
      orderBy: { createdAt: 'desc' },
    });
    const created = dbMock.emailVerification.create.mock.calls[0][0];
    expect(created.data.email).toBe('someone@qq.com');
    expect(created.data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(TTL_MS);
    expect(created.data.expiresAt.getTime() - Date.now()).toBeGreaterThan(TTL_MS - 5000);
  });

  it('命中概率时顺带清理全局过期码', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue(null);
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    await issueCode('someone@qq.com');

    expect(dbMock.emailVerification.deleteMany).toHaveBeenCalledTimes(2);
    const cleanupCall = dbMock.emailVerification.deleteMany.mock.calls[1][0];
    expect(cleanupCall.where.expiresAt.lt).toBeInstanceOf(Date);
  });

  it('清理失败不影响发码结果', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue(null);
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    dbMock.emailVerification.deleteMany.mockImplementation(async (arg) => {
      if (arg.where.expiresAt) throw new Error('db down');
      return { count: 0 };
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const r = await issueCode('someone@qq.com');

    expect(r.ok).toBe(true);
    expect(r.code).toMatch(/^\d{6}$/);
  });
});

describe('verifyEmailCode', () => {
  it('空验证码不调用数据库直接拒绝', async () => {
    const r = await verifyEmailCode('someone@qq.com', '');

    expect(r).toEqual({ ok: false, error: '请填写邮箱验证码' });
    expect(dbMock.emailVerification.findFirst).not.toHaveBeenCalled();
  });

  it('未发过码时提示先获取', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue(null);

    expect(await verifyEmailCode('someone@qq.com', '123456')).toEqual({
      ok: false,
      error: '请先获取邮箱验证码',
    });
  });

  it('过期即拒绝并清空该邮箱的码', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({
      id: 'r1',
      code: '123456',
      attempts: 0,
      expiresAt: new Date(Date.now() - 1000),
    });

    const r = await verifyEmailCode('someone@qq.com', '123456');

    expect(r).toEqual({ ok: false, error: '验证码已过期，请重新获取' });
    expect(dbMock.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { email: 'someone@qq.com' },
    });
  });

  it('错误次数达到 5 次即作废，即使这次填对了', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({
      id: 'r1',
      code: '123456',
      attempts: 5,
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    const r = await verifyEmailCode('someone@qq.com', '123456');

    expect(r).toEqual({ ok: false, error: '验证码错误次数过多，请重新获取' });
  });

  it('码填错时递增错误次数', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({
      id: 'r1',
      code: '123456',
      attempts: 1,
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    const r = await verifyEmailCode('someone@qq.com', '000000');

    expect(r).toEqual({ ok: false, error: '验证码错误' });
    expect(dbMock.emailVerification.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('校验通过后立即删除，验证码不可复用', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({
      id: 'r1',
      code: '123456',
      attempts: 0,
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    expect(await verifyEmailCode('someone@qq.com', '123456')).toEqual({ ok: true });
    expect(dbMock.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { email: 'someone@qq.com' },
    });
  });

  it('数字形式的验证码也能通过（前端可能传数值）', async () => {
    dbMock.emailVerification.findFirst.mockResolvedValue({
      id: 'r1',
      code: '123456',
      attempts: 0,
      expiresAt: new Date(Date.now() + TTL_MS),
    });

    expect(await verifyEmailCode('someone@qq.com', 123456)).toEqual({ ok: true });
  });
});
