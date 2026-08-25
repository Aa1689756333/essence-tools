/**
 * 速率限制器 (P2-1 & P2-2a 优化)
 * 使用 @upstash/ratelimit 实现分布式限流
 * 如果未配置 UPSTASH_REDIS_REST_URL，自动降级为内存限流
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 内存限流回退方案
const store = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (now > data.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimitMemory(key, { maxRequests, windowMs }) {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, retryAfter: 0 };
}

// 初始化 Redis 实例
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * 检查速率限制
 * @param {string} key - 限制键（通常是 IP 或 IP:路径组合）
 * @param {object} options - 限制配置
 */
export async function checkRateLimit(key, { maxRequests, windowMs }) {
  if (!redis) {
    return checkRateLimitMemory(key, { maxRequests, windowMs });
  }

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
  });
  
  const result = await ratelimit.limit(key);
  return {
    allowed: result.success,
    remaining: result.remaining,
    retryAfter: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/**
 * 从请求中获取客户端 IP，增加信任机制验证
 */
export function getClientIP(req) {
  // Vercel 等平台提供经过验证的头
  const vercelIP = req.headers.get('x-vercel-forwarded-for');
  if (vercelIP) return vercelIP.split(',')[0].trim();

  // 仅在明确配置了可信代理时才信任 x-forwarded-for
  if (process.env.TRUSTED_PROXY === 'true') {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;

  return '127.0.0.1';
}

export const RateLimitRules = {
  LOGIN: { maxRequests: 5, windowMs: 60 * 1000 },
  REGISTER: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  SEND_CODE: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  FORGOT_PASSWORD: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
};
