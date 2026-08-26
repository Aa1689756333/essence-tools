import { headers } from 'next/headers';
import db from './db';

/**
 * 从 Middleware 注入的请求头获取用户信息
 * @param {object} options
 * @param {boolean} options.withDB - 是否需要从数据库查询最新用户信息
 * @returns {Promise<object|null>}
 */
export async function getRequestUser({ withDB = false } = {}) {
  const headerStore = await headers();
  const id = headerStore.get('x-user-id');
  const role = headerStore.get('x-user-role');
  const email = headerStore.get('x-user-email');

  if (!id) return null;

  if (withDB) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
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
  }

  return { id, role, email };
}
