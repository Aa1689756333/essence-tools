'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const fetchMe = useCallback(async (retryCount = 0) => {
    try {
      if (retryCount === 0) setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
      setLoading(false);
    } catch (err) {
      if (retryCount < 2) {
        const backoff = 1000 * Math.pow(2, retryCount);
        setTimeout(() => fetchMe(retryCount + 1), backoff);
      } else {
        setUser(null);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMe();
    
    const handleOnline = () => fetchMe();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    setUser(data.user);
    setShowAuthModal(false);
    return data.user;
  };

  const register = async (email, password, nickname, code) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    setUser(data.user);
    setShowAuthModal(false);
    return data.user;
  };

  // 发送注册验证码；返回是否需要验证（false 表示已降级，可直接注册）
  const sendCode = async (email) => {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '验证码发送失败');
    return data.verificationRequired;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    setShowCheckInModal(false);
  };

  const openAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const closeAuth = () => setShowAuthModal(false);

  const openCheckIn = () => {
    if (!user) {
      openAuth('login');
      return;
    }
    setShowCheckInModal(true);
  };

  const closeCheckIn = () => setShowCheckInModal(false);

  const updateUser = (updatedUser) => {
    setUser(prev => (prev ? { ...prev, ...updatedUser } : updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        showAuthModal,
        authModalMode,
        showCheckInModal,
        login,
        register,
        sendCode,
        logout,
        openAuth,
        closeAuth,
        openCheckIn,
        closeCheckIn,
        updateUser,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
