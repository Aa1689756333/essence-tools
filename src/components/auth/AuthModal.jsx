'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, User, Sparkles, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export default function AuthModal() {
  const { showAuthModal, authModalMode, closeAuth, openAuth, login, register, sendCode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needVerification, setNeedVerification] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  
  // 密码重置相关状态
  const [resetStep, setResetStep] = useState(1); // 1: 输入邮箱, 2: 输入验证码和新密码
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const isLogin = authModalMode === 'login';
  const isRegister = authModalMode === 'register';
  const isForgotPassword = authModalMode === 'forgot-password';

  // 注册模式：探测是否需要邮箱验证码
  useEffect(() => {
    if (showAuthModal && !isLogin) {
      fetch('/api/auth/config')
        .then((res) => res.json())
        .then((data) => setNeedVerification(Boolean(data.emailVerification)))
        .catch(() => setNeedVerification(false));
    }
  }, [showAuthModal, isLogin]);

  // 发送验证码倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!showAuthModal) return null;

  const handleSendCode = async () => {
    setError('');
    if (!email) {
      setError('请先填写电子邮箱');
      return;
    }
    setSendingCode(true);
    try {
      if (isForgotPassword) {
        // 密码重置模式：调用 forgot-password API
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '验证码发送失败');
        setResetStep(2);
        setCodeSent(true);
        setCountdown(60);
      } else {
        // 注册模式：调用 send-code API
        const required = await sendCode(email);
        if (required) {
          setCodeSent(true);
          setCountdown(60);
        } else {
          // 已降级，无需验证码
          setNeedVerification(false);
          setError('当前无需验证码，请直接创建账户');
        }
      }
    } catch (err) {
      setError(err.message || '验证码发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '密码重置失败');
      
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        setResetStep(1);
        setResetCode('');
        setNewPassword('');
        openAuth('login');
      }, 2000);
    } catch (err) {
      setError(err.message || '密码重置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, nickname, code);
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={showAuthModal} onClose={closeAuth} maxWidth="max-w-md">
        {/* 标题 */}
        <div className="mb-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-subtle, #ecfdf5)' }}
          >
            <Sparkles className="w-6 h-6" style={{ color: 'var(--theme-accent, #10b981)' }} />
          </div>
          <h2 className="text-xl font-bold text-text tracking-tight">
            {isForgotPassword ? '重置密码' : isLogin ? '欢迎回到 ToolBox' : '创建新账户'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isForgotPassword 
              ? '输入您的注册邮箱，我们将发送验证码' 
              : isLogin 
                ? '登录后即可体验完整的签到打卡与积分功能' 
                : '免费注册，极速体验全套在线工具箱'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {resetSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <span>✓</span>
            <span>密码重置成功！正在跳转到登录页面...</span>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="space-y-4">
          {/* 密码重置模式 */}
          {isForgotPassword && resetStep === 1 && (
            <>
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

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || !email}
                className="w-full py-2.5 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-md hover:shadow-lg"
                style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
              >
                {sendingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>发送中...</span>
                  </>
                ) : (
                  <>
                    <span>发送验证码</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {isForgotPassword && resetStep === 2 && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">邮箱验证码</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6 位验证码"
                    className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !resetCode || !newPassword}
                className="w-full py-2.5 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-md hover:shadow-lg"
                style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>重置中...</span>
                  </>
                ) : (
                  <>
                    <span>重置密码</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {/* 登录/注册模式 */}
          {!isForgotPassword && (
            <>
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

              {/* 邮箱验证码（仅注册且开启验证时显示） */}
              {!isLogin && needVerification && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">邮箱验证码</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6 位验证码"
                        className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all tracking-widest"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0}
                      className="px-3 py-2.5 rounded-xl border border-border text-xs font-medium text-text whitespace-nowrap transition-all cursor-pointer disabled:opacity-60 hover:border-border-light"
                    >
                      {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s 后重发` : codeSent ? '重新发送' : '发送验证码'}
                    </button>
                  </div>
                </div>
              )}

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
            </>
          )}
        </form>

        {/* 切换登录 / 注册 / 忘记密码 */}
        <div className="mt-6 text-center text-xs text-text-secondary border-t border-border pt-4">
          {isLogin && (
            <>
              <p className="mb-2">
                <button
                  onClick={() => { setError(''); openAuth('forgot-password'); setResetStep(1); }}
                  className="font-semibold cursor-pointer underline hover:opacity-80"
                  style={{ color: 'var(--theme-accent, #10b981)' }}
                >
                  忘记密码？
                </button>
              </p>
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
            </>
          )}
          {isRegister && (
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
          {isForgotPassword && (
            <p>
              想起密码了？{' '}
              <button
                onClick={() => { setError(''); openAuth('login'); setResetStep(1); setResetCode(''); setNewPassword(''); }}
                className="font-semibold cursor-pointer underline hover:opacity-80"
                style={{ color: 'var(--theme-accent, #10b981)' }}
              >
                返回登录
              </button>
            </p>
          )}
        </div>
    </Modal>
  );
}
