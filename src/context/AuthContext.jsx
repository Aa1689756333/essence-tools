'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
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

  const register = async (email, password, nickname) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    setUser(data.user);
    setShowAuthModal(false);
    return data.user;
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
