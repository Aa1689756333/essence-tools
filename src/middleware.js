import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT 密钥惰性初始化（与 auth.js 保持一致策略）
// 生产环境未配置时使用随机密钥，所有旧 session 自动失效，不暴露可预测密钥
let _jwtSecretKey = null;

function getJwtSecret() {
  if (_jwtSecretKey) return _jwtSecretKey;

  if (process.env.JWT_SECRET) {
    _jwtSecretKey = new TextEncoder().encode(process.env.JWT_SECRET);
  } else if (process.env.NODE_ENV === 'production') {
    // Middleware 中不能 throw（会导致所有请求 500），
    // 使用随机密钥确保旧 token 不可用，但服务仍可运行
    _jwtSecretKey = crypto.getRandomValues(new Uint8Array(32));
    console.error(
      'CRITICAL: JWT_SECRET not configured in production! All sessions will be invalid.'
    );
  } else {
    _jwtSecretKey = new TextEncoder().encode('toolbox-dev-secret-key');
  }
  return _jwtSecretKey;
}

const COOKIE_NAME = 'toolbox_session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 管理接口鉴权：/api/admin/*
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录，请先登录' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecret());

      if (!payload || !payload.id) {
        return NextResponse.json({ error: '无效的会话' }, { status: 401 });
      }

      // 检查是否为管理员
      if (payload.role !== 'ADMIN') {
        return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
      }

      // 验证通过，继续处理请求并注入用户信息
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.id);
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-user-email', payload.email || '');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: '会话无效或已过期' }, { status: 401 });
    }
  }

  // 用户接口鉴权：/api/user/*
  if (pathname.startsWith('/api/user')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录，请先登录' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecret());

      if (!payload || !payload.id) {
        return NextResponse.json({ error: '无效的会话' }, { status: 401 });
      }

      // 验证通过，继续处理请求并注入用户信息
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.id);
      requestHeaders.set('x-user-role', payload.role || 'USER');
      requestHeaders.set('x-user-email', payload.email || '');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.json({ error: '会话无效或已过期' }, { status: 401 });
    }
  }

  // 用户中心页面鉴权：/user/*
  if (pathname === '/user' || pathname.startsWith('/user/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecret());

      if (!payload || !payload.id) {
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    } catch (error) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 其他路径不拦截
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/user/:path*', '/user', '/user/:path*'],
};
