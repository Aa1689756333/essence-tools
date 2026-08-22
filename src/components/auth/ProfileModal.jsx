'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProfileModal() {
  const router = useRouter();
  const { user, showProfileModal, closeProfileModal, refreshUser, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState('nickname');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 昵称表单
  const [nickname, setNickname] = useState(user?.nickname || '');
  
  // 密码表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 注销账号表单
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!showProfileModal) return null;

  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_nickname',
          nickname: nickname.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '更新失败');
      }

      setMessage({ type: 'success', text: '昵称更新成功' });
      await refreshUser();
      
      setTimeout(() => {
        closeProfileModal();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_password',
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '更新失败');
      }

      setMessage({ type: 'success', text: '密码更新成功' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        closeProfileModal();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_account',
          password: deletePassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '注销失败');
      }

      setMessage({ type: 'success', text: '账号已注销，即将返回首页...' });
      setDeletePassword('');
      
      setTimeout(() => {
        closeProfileModal();
        logout();
        router.push('/');
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-up">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* 顶部饰条 */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'var(--theme-gradient, linear-gradient(90deg, #10b981, #34d399))' }}
        />

        {/* 关闭按钮 */}
        <button
          onClick={closeProfileModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text hover:bg-bg-primary transition-colors cursor-pointer"
          aria-label="关闭弹窗"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 标题 */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-text tracking-tight">个人设置</h2>
          <p className="text-xs text-text-secondary mt-1">管理您的账户信息</p>
        </div>

        {/* 提示消息 */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
          }`}>
            {message.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* 标签页切换 */}
        <div className="flex gap-2 mb-6 p-1 bg-bg-primary border border-border rounded-xl">
          <button
            onClick={() => setActiveTab('nickname')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'nickname'
                ? 'bg-card text-text shadow-xs'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <User className="w-4 h-4" />
            修改昵称
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-card text-text shadow-xs'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Lock className="w-4 h-4" />
            修改密码
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'delete'
                ? 'bg-rose-500/10 text-rose-500 shadow-xs'
                : 'text-rose-500/70 hover:text-rose-500'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            注销账号
          </button>
        </div>

        {/* 修改昵称表单 */}
        {activeTab === 'nickname' && (
          <form onSubmit={handleUpdateNickname} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                新昵称
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入新昵称"
                maxLength={50}
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
              />
              <p className="text-[11px] text-text-tertiary mt-1">
                昵称长度 1-50 个字符，不能与其他用户重复
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="w-full py-2.5 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-md hover:shadow-lg"
              style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
            >
              {loading ? '更新中...' : '更新昵称'}
            </button>
          </form>
        )}

        {/* 修改密码表单 */}
        {activeTab === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                minLength={6}
                maxLength={128}
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-2.5 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-md hover:shadow-lg"
              style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
            >
              {loading ? '更新中...' : '更新密码'}
            </button>
          </form>
        )}

        {/* 注销账号表单 */}
        {activeTab === 'delete' && !showDeleteConfirm && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-rose-500 mb-2">危险操作</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    注销账号后，您的所有数据（包括积分、签到记录等）将被永久删除，且无法恢复。
                    如果您是管理员，且是系统唯一的管理员，将无法注销。
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:bg-rose-600 shadow-md hover:shadow-lg"
            >
              <AlertTriangle className="w-4 h-4" />
              我要注销账号
            </button>
          </div>
        )}

        {/* 注销账号二次确认弹窗 */}
        {activeTab === 'delete' && showDeleteConfirm && (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-rose-500 mb-2">二次确认</h3>
                  <p className="text-xs text-text-secondary leading-relaxed mb-3">
                    请输入您的密码以确认注销操作。此操作不可撤销！
                  </p>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="请输入密码确认"
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-card text-text font-medium text-sm transition-all cursor-pointer hover:bg-bg-primary"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !deletePassword}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 hover:bg-rose-600 shadow-md hover:shadow-lg"
              >
                {loading ? '注销中...' : '确认注销'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
