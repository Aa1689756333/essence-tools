/**
 * 基于内存的速率限制器
 * 用于防止 API 滥用和暴力破解
 */

// 存储速率限制数据：Map<string, { count: number, resetTime: number }>
const store = new Map();

// 定期清理过期条目（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (now > data.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * 检查速率限制
 * @param {string} key - 限制键（通常是 IP 或 IP:路径组合）
 * @param {object} options - 限制配置
 * @param {number} options.maxRequests - 时间窗口内最大请求数
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function checkRateLimit(key, { maxRequests, windowMs }) {
  const now = Date.now();
  const record = store.get(key);

  // 如果没有记录或已过期，创建新记录
  if (!record || now > record.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfter: 0,
    };
  }

  // 检查是否超过限制
  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  // 增加计数
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    retryAfter: 0,
  };
}

/**
 * 从请求中获取客户端 IP
 * @param {Request} req - Next.js 请求对象
 * @returns {string} 客户端 IP 地址
 */
export function getClientIP(req) {
  // 优先从代理头获取
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // 开发环境或无代理时使用默认值
  return '127.0.0.1';
}

/**
 * 预定义的限流规则
 */
export const RateLimitRules = {
  // 登录：每 IP 每分钟 5 次
  LOGIN: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  // 注册：每 IP 每小时 10 次
  REGISTER: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  // 发送验证码：每 IP 每小时 5 次
  SEND_CODE: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  // 忘记密码：每 IP 每小时 3 次
  FORGOT_PASSWORD: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  },
};
