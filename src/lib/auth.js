import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'toolbox-secret-key-2026-secure-jwt-auth-token-super-secret'
);

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
