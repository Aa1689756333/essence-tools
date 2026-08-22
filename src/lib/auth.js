import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

// JWT 密钥初始化：生产环境必须配置环境变量，开发环境使用兜底值并警告
let jwtSecretKey;
if (process.env.JWT_SECRET) {
  jwtSecretKey = new TextEncoder().encode(process.env.JWT_SECRET);
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
} else {
  console.warn('⚠️ JWT_SECRET not configured, using development fallback. DO NOT use in production!');
  jwtSecretKey = new TextEncoder().encode('toolbox-dev-secret-key');
}
const JWT_SECRET = jwtSecretKey;

export const COOKIE_NAME = 'toolbox_session';

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
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
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
        nickname: true,
        avatar: true,
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
