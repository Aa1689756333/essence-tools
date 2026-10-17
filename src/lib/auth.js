import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

// JWT 密钥惰性初始化：避免模块顶层 throw 阻塞 next build
// 密钥在首次调用时按环境解析，生产环境必须配置 JWT_SECRET 环境变量
let _jwtSecretKey = null;

function getJwtSecret() {
  if (_jwtSecretKey) return _jwtSecretKey;

  if (process.env.JWT_SECRET) {
    _jwtSecretKey = new TextEncoder().encode(process.env.JWT_SECRET);
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  } else {
    console.warn(
      '⚠️ JWT_SECRET not configured, using development fallback. DO NOT use in production!'
    );
    _jwtSecretKey = new TextEncoder().encode('essence-tools-dev-secret-key');
  }
  return _jwtSecretKey;
}

export const COOKIE_NAME = 'essence_session';

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser(includePasswordHash = false) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || !payload.id) return null;

    const user = await db.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        passwordHash: includePasswordHash,
        nickname: true,
        avatar: true,
        avatarStyle: true,
        avatarSeed: true,
        role: true,
        status: true,
        points: true,
        continuousCheckIn: true,
        lastCheckInDate: true,
        createdAt: true,
      },
    });

    if (!user || user.status === 'BANNED') return null;
    return user;
  } catch {
    return null;
  }
}
