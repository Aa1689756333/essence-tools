'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, Settings, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
        <p className="text-sm font-medium">正在验证管理员身份...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-card border border-border rounded-2xl text-center shadow-lg animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text mb-2">访问权限不足</h2>
        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
          管理后台仅限 ADMIN 权限账户访问。如果您是管理员，请使用正确的管理员账户登录。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-sm"
          style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回工具箱首页</span>
        </Link>
      </div>
    );
  }

  const tabs = [
    { path: '/admin', name: '数据看板', icon: LayoutDashboard },
    { path: '/admin/users', name: '用户管理', icon: Users },
    { path: '/admin/settings', name: '系统设置', icon: Settings },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-up">
      {/* 头部 Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary dark:text-primary-light">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-text tracking-tight">管理后台控制中心</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            监控用户指标、分配系统权限、管理 SEO 及 SMTP 基础设施配置
          </p>
        </div>

        {/* 页签导航 */}
        <div className="flex items-center gap-1 bg-bg-primary border border-border p-1 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-card text-text font-semibold shadow-xs'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : ''}`} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 核心内容区 */}
      <div>{children}</div>
    </div>
  );
}
