'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Mail, Lock, User, Sparkles, Loader2, ArrowRight } from 'lucide-react';

export default function AuthModal() {
  const { showAuthModal, authModalMode, closeAuth, openAuth, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showAuthModal) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, nickname);
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-up">
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* 顶部背景饰条 */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'var(--theme-gradient, linear-gradient(90deg, #10b981, #34d399))' }}
        />

        {/* 关闭按钮 */}
        <button
          onClick={closeAuth}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text hover:bg-bg-primary transition-colors cursor-pointer"
          aria-label="关闭弹窗"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 标题 */}
        <div className="mb-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-subtle, #ecfdf5)' }}
          >
            <Sparkles className="w-6 h-6" style={{ color: 'var(--theme-accent, #10b981)' }} />
          </div>
          <h2 className="text-xl font-bold text-text tracking-tight">
            {isLogin ? '欢迎回到 ToolBox' : '创建新账户'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isLogin ? '登录后即可体验完整的签到打卡与积分功能' : '免费注册，极速体验全套在线工具箱'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">昵称 (可选)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="极客开发者"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">电子邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-md hover:shadow-lg"
            style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>提交中...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? '立即登录' : '创建账户'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 切换登录 / 注册 */}
        <div className="mt-6 text-center text-xs text-text-secondary border-t border-border pt-4">
          {isLogin ? (
            <p>
              还没有账户？{' '}
              <button
                onClick={() => { setError(''); openAuth('register'); }}
                className="font-semibold cursor-pointer underline hover:opacity-80"
                style={{ color: 'var(--theme-accent, #10b981)' }}
              >
                立即注册
              </button>
            </p>
          ) : (
            <p>
              已有账户？{' '}
              <button
                onClick={() => { setError(''); openAuth('login'); }}
                className="font-semibold cursor-pointer underline hover:opacity-80"
                style={{ color: 'var(--theme-accent, #10b981)' }}
              >
                直接登录
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
