import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT 密钥初始化（与 auth.js 保持一致）
let jwtSecretKey;
if (process.env.JWT_SECRET) {
  jwtSecretKey = new TextEncoder().encode(process.env.JWT_SECRET);
} else if (process.env.NODE_ENV === 'production') {
  // 在生产环境中，如果未配置 JWT_SECRET，middleware 无法正常工作
  // 但这里不能抛出错误，只能记录警告
  console.error('CRITICAL: JWT_SECRET not configured in production!');
  jwtSecretKey = new TextEncoder().encode('toolbox-dev-secret-key');
} else {
  jwtSecretKey = new TextEncoder().encode('toolbox-dev-secret-key');
}

const COOKIE_NAME = 'toolbox_session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 管理接口鉴权：/api/admin/*
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: '未登录，请先登录' },
        { status: 401 }
      );
    }

    try {
      const { payload } = await jwtVerify(token, jwtSecretKey);
      
      if (!payload || !payload.id) {
        return NextResponse.json(
          { error: '无效的会话' },
          { status: 401 }
        );
      }

      // 检查是否为管理员
      if (payload.role !== 'ADMIN') {
        return NextResponse.json(
          { error: '权限不足，仅管理员可访问' },
          { status: 403 }
        );
      }

      // 验证通过，继续处理请求
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json(
        { error: '会话无效或已过期' },
        { status: 401 }
      );
    }
  }

  // 用户接口鉴权：/api/user/*
  if (pathname.startsWith('/api/user')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: '未登录，请先登录' },
        { status: 401 }
      );
    }

    try {
      const { payload } = await jwtVerify(token, jwtSecretKey);
      
      if (!payload || !payload.id) {
        return NextResponse.json(
          { error: '无效的会话' },
          { status: 401 }
        );
      }

      // 验证通过，继续处理请求
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json(
        { error: '会话无效或已过期' },
        { status: 401 }
      );
    }
  }

  // 其他路径不拦截
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/user/:path*',
  ],
};
