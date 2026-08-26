'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Flame,
  Coins,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { getUserAvatarUrl } from '@/lib/avatar';
export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || '获取统计数据失败');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
        <span className="text-sm">正在加载仪表盘数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
        ⚠️ {error}
      </div>
    );
  }

  const { stats, recentUsers } = data;

  const statCards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      desc: '系统注册用户总计',
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      title: '今日新增注册',
      value: stats.todayNewUsers,
      desc: '今日新建账号数',
      icon: UserPlus,
      color: 'bg-sky-500/10 text-sky-500',
    },
    {
      title: '今日签到人数',
      value: stats.todayCheckIns,
      desc: '今日完成打卡用户',
      icon: Flame,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      title: '累计发放积分',
      value: stats.totalPointsIssued,
      desc: '签到与奖励积分发放',
      icon: Coins,
      color: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 bg-card border border-border rounded-2xl shadow-xs relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-secondary">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-text mb-1 tracking-tight">{card.value}</div>
              <div className="text-[11px] text-text-tertiary">{card.desc}</div>
            </div>
          );
        })}
      </div>

      {/* 系统运行状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text">发信服务 (SMTP)</span>
            <Mail className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            {stats.isSmtpConfigured ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                <CheckCircle2 className="w-4 h-4" /> 已配置联通
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                <XCircle className="w-4 h-4" /> 未完整配置
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-tertiary leading-relaxed mb-4">
            用于向用户发送激活验证码、通知及测试邮件。
          </p>
          <Link
            href="/admin/settings"
            className="text-xs font-semibold text-primary dark:text-primary-light hover:underline"
          >
            去配置 SMTP →
          </Link>
        </div>

        <div className="p-5 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text">开放注册通道</span>
            <UserPlus className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            {stats.allowRegistration ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                <CheckCircle2 className="w-4 h-4" /> 开启注册中
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                <XCircle className="w-4 h-4" /> 注册已关闭
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-tertiary leading-relaxed mb-4">
            可在系统设置中随时关闭或开启新账号注册。
          </p>
          <Link
            href="/admin/settings"
            className="text-xs font-semibold text-primary dark:text-primary-light hover:underline"
          >
            修改注册策略 →
          </Link>
        </div>

        <div className="p-5 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text">邮箱校验黑白名单</span>
            <ShieldCheck className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-primary uppercase">
              {stats.emailMode === 'none' ? '未限制' : `${stats.emailMode} 模式`}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary leading-relaxed mb-4">
            有效拦截临时垃圾邮箱域名，确保用户质量。
          </p>
          <Link
            href="/admin/settings"
            className="text-xs font-semibold text-primary dark:text-primary-light hover:underline"
          >
            配置黑白名单 →
          </Link>
        </div>
      </div>

      {/* 最新注册用户 */}
      <div className="p-5 bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <h3 className="text-sm font-bold text-text">最新注册用户</h3>
          <Link href="/admin/users" className="text-xs font-semibold text-primary hover:underline">
            查看全部用户 →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-tertiary">
                <th className="pb-2 font-medium">用户</th>
                <th className="pb-2 font-medium">邮箱</th>
                <th className="pb-2 font-medium">角色</th>
                <th className="pb-2 font-medium">积分</th>
                <th className="pb-2 font-medium">注册时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-bg-primary/50 transition-colors">
                  <td className="py-2.5 font-semibold text-text flex items-center gap-2">
                    <img
                      src={getUserAvatarUrl(u)}
                      alt="Avatar"
                      className="w-6 h-6 rounded-md object-cover bg-bg-primary ring-1 ring-border/50"
                    />
                    <span>{u.nickname}</span>
                  </td>
                  <td className="py-2.5 text-text-secondary">{u.email}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-primary/10 text-primary dark:text-primary-light border border-primary/20'
                          : 'bg-bg-primary text-text-secondary border border-border'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 font-bold text-amber-500">{u.points}</td>
                  <td className="py-2.5 text-text-tertiary">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
