// @vitest-environment node
// auth.js 是服务端模块：jsdom 环境会让 jose 解析到 browser 构建，SignJWT 行为与运行时不一致。
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../db', () => ({ default: dbMock, db: dbMock }));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

const ORIGINAL_SECRET = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'unit-test-secret-key-not-for-production-0123456789';

const { COOKIE_NAME, createToken, getSessionUser, hashPassword, verifyPassword, verifyToken } =
  await import('../auth');

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = ORIGINAL_SECRET;
});

beforeEach(() => {
  dbMock.user.findUnique.mockReset();
  cookieStore.get.mockReset();
});

describe('密码哈希', () => {
  it('正确密码校验通过，错误密码被拒', async () => {
    const hash = await hashPassword('123456');
    expect(await verifyPassword('123456', hash)).toBe(true);
    expect(await verifyPassword('1234567', hash)).toBe(false);
  });

  it('同一密码两次哈希结果不同（带盐）', async () => {
    expect(await hashPassword('123456')).not.toBe(await hashPassword('123456'));
  });

  it('哈希里不含明文密码', async () => {
    const hash = await hashPassword('my-secret-pw');
    expect(hash).not.toContain('my-secret-pw');
  });
});

describe('JWT 令牌', () => {
  it('签发后能验回原始载荷', async () => {
    const token = await createToken({ id: 'u1', role: 'ADMIN' });
    const payload = await verifyToken(token);
    expect(payload.id).toBe('u1');
    expect(payload.role).toBe('ADMIN');
    expect(payload.iat).toBeTypeOf('number');
    expect(payload.exp).toBeTypeOf('number');
  });

  it('被篡改或非法的 token 一律返回 null 而不抛错', async () => {
    const token = await createToken({ id: 'u1' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(await verifyToken(tampered)).toBeNull();
    expect(await verifyToken('not.a.jwt')).toBeNull();
    expect(await verifyToken('')).toBeNull();
  });

  // 回归点：签名必须真的用到 JWT_SECRET，否则换个密钥也该能验通。
  it('换了密钥就验不过原来的 token', async () => {
    const token = await createToken({ id: 'u1' });
    const savedSecret = process.env.JWT_SECRET;
    vi.resetModules();
    process.env.JWT_SECRET = 'another-secret-key-completely-different-value';
    const reloaded = await import('../auth');
    expect(await reloaded.verifyToken(token)).toBeNull();
    process.env.JWT_SECRET = savedSecret;
  });
});

// cookie 名与浏览器里已存的会话绑定，改名会踢掉所有在线用户，
// 因此把它钉在这里：真要改，必须是有意识地让这个测试失败。
it('会话 cookie 名保持稳定', () => {
  expect(COOKIE_NAME).toBe('toolbox_session');
});

describe('getSessionUser', () => {
  const activeUser = {
    id: 'u1',
    email: 'a@b.com',
    nickname: '小明',
    role: 'USER',
    status: 'ACTIVE',
    points: 10,
  };

  it('没有 cookie 时返回 null，且不查库', async () => {
    cookieStore.get.mockReturnValue(undefined);
    expect(await getSessionUser()).toBeNull();
    expect(dbMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('cookie 里是非法 token 时返回 null', async () => {
    cookieStore.get.mockReturnValue({ value: 'garbage' });
    expect(await getSessionUser()).toBeNull();
    expect(dbMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('载荷里没有用户 id 时返回 null', async () => {
    cookieStore.get.mockReturnValue({ value: await createToken({ role: 'USER' }) });
    expect(await getSessionUser()).toBeNull();
  });

  it('正常会话返回用户，且默认不取密码哈希', async () => {
    cookieStore.get.mockReturnValue({ value: await createToken({ id: 'u1' }) });
    dbMock.user.findUnique.mockResolvedValue(activeUser);

    expect(await getSessionUser()).toEqual(activeUser);
    expect(dbMock.user.findUnique.mock.calls[0][0].select.passwordHash).toBe(false);
  });

  it('显式请求时才把 passwordHash 放进查询', async () => {
    cookieStore.get.mockReturnValue({ value: await createToken({ id: 'u1' }) });
    dbMock.user.findUnique.mockResolvedValue(activeUser);

    await getSessionUser(true);
    expect(dbMock.user.findUnique.mock.calls[0][0].select.passwordHash).toBe(true);
  });

  it('被封号的用户一律当作未登录', async () => {
    cookieStore.get.mockReturnValue({ value: await createToken({ id: 'u1' }) });
    dbMock.user.findUnique.mockResolvedValue({ ...activeUser, status: 'BANNED' });
    expect(await getSessionUser()).toBeNull();
  });

  it('用户已不存在时返回 null', async () => {
    cookieStore.get.mockReturnValue({ value: await createToken({ id: 'gone' }) });
    dbMock.user.findUnique.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  // 兜底：数据库异常也必须只表现为"未登录"，不能把错误抛到接口层泄露细节。
  it('数据库异常被吞掉并返回 null', async () => {
    cookieStore.get.mockReturnValue({ value: await createToken({ id: 'u1' }) });
    dbMock.user.findUnique.mockRejectedValue(new Error('db down'));
    expect(await getSessionUser()).toBeNull();
  });
});
