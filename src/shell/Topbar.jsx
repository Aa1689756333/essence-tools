'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Palette,
  Check,
  Menu,
  Sun,
  Moon,
  Flame,
  Coins,
  ChevronDown,
  Shield,
  LogOut,
  UserRound,
} from 'lucide-react';
import { tools } from '@/tools/registry';
import { useTheme } from './ThemeProvider';
import { useSidebar } from './useSidebar';
import { useAuth } from '@/context/AuthContext';
import SearchModal from '@/components/SearchModal';
import { useClickOutside } from '@/hooks/useClickOutside';
import { getUserAvatarUrl } from '@/lib/avatar';
export default function Topbar() {
  const pathname = usePathname();
  const { theme, themes, setTheme, isDark, setIsDark } = useTheme();
  const { toggle, isMobile } = useSidebar();
  const { user, logout, openAuth, openCheckIn } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pickerDirection, setPickerDirection] = useState('right');
  const pickerRef = useRef(null);
  const pickerButtonRef = useRef(null);
  const userMenuRef = useRef(null);

  const currentTool = tools.find((t) => t.path === pathname);
  const currentPageName = currentTool ? currentTool.name : '工具总览';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useClickOutside(
    userMenuRef,
    useCallback(() => setShowUserMenu(false), [])
  );

  useClickOutside(
    pickerRef,
    useCallback(() => setShowPicker(false), []),
    showPicker
  );

  useEffect(() => {
    if (showPicker && pickerButtonRef.current) {
      const rect = pickerButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const pickerWidth = 180;

      if (rect.right + pickerWidth > viewportWidth) {
        setPickerDirection('left');
      } else {
        setPickerDirection('right');
      }
    }
  }, [showPicker]);

  // 键盘快捷键：Ctrl+K / Cmd+K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-[52px] px-4 sm:px-5 md:px-6 lg:px-8 flex items-center justify-between border-b border-border bg-bg-sidebar shrink-0">
      <div
        className="flex items-center gap-2 text-[13px]"
        role="navigation"
        aria-label="面包屑导航"
      >
        {isMobile && (
          <button
            onClick={toggle}
            className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer md:hidden"
            aria-label="打开导航菜单"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <span className="text-text-secondary font-medium">ToolBox</span>
        <span className="text-text-tertiary text-base">/</span>
        <span className="text-text font-semibold">{currentPageName}</span>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        {/* 搜索按钮 */}
        <button
          onClick={() => setShowSearch(true)}
          className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer hidden md:flex"
          aria-label="搜索工具"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* 签到打卡按钮 (登录后显示) */}
        {user ? (
          <button
            onClick={openCheckIn}
            className="h-[34px] px-3 rounded-lg border border-border bg-card flex items-center gap-1.5 text-xs font-semibold text-text hover:bg-bg-primary transition-all duration-150 cursor-pointer shadow-xs"
            aria-label="每日签到打卡"
          >
            <Flame
              className={`w-3.5 h-3.5 ${user.lastCheckInDate === todayStr ? 'text-text-tertiary' : 'text-emerald-500 animate-pulse'}`}
            />
            <span className="hidden sm:inline">
              {user.lastCheckInDate === todayStr ? '已签到' : '每日签到'}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center gap-0.5">
              <Coins className="w-3 h-3" />
              {user.points || 0}
            </span>
          </button>
        ) : null}

        {/* 暗黑模式切换 */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer"
          aria-label={isDark ? '切换为亮色模式' : '切换为暗黑模式'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* 主题选择器 */}
        <div className="relative" ref={pickerRef}>
          <button
            ref={pickerButtonRef}
            onClick={() => setShowPicker(!showPicker)}
            className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer"
            aria-label="主题色选择器"
            aria-expanded={showPicker}
            aria-haspopup="true"
          >
            <Palette className="w-4 h-4" />
          </button>

          {showPicker && (
            <div
              className={`absolute top-[42px] w-[180px] bg-card border border-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-3 z-50 ${pickerDirection === 'left' ? 'left-0' : 'right-0'}`}
              role="dialog"
              aria-label="主题色面板"
            >
              <div className="text-[11px] font-semibold text-text-secondary tracking-wide mb-2.5 px-0.5">
                主题色
              </div>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t);
                      setShowPicker(false);
                    }}
                    className="relative w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: t.accent }}
                    title={t.name}
                    aria-label={t.name}
                  >
                    {theme.id === t.id && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 用户登录 / 注册 / 用户菜单 */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-[34px] pl-1.5 pr-2 rounded-lg border border-border bg-card flex items-center gap-2 text-xs font-semibold text-text hover:bg-bg-primary transition-all cursor-pointer"
              aria-label="用户菜单"
            >
              <img
                src={getUserAvatarUrl(user)}
                alt="Avatar"
                className="w-6 h-6 rounded-md object-cover bg-bg-primary ring-1 ring-border/50"
              />
              <span className="max-w-[80px] truncate hidden sm:inline">{user.nickname}</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-[42px] w-[200px] bg-card border border-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-2 z-50 animate-fade-up">
                <div className="px-2.5 py-2 border-b border-border mb-1">
                  <div className="font-semibold text-xs text-text truncate">{user.nickname}</div>
                  <div className="text-[11px] text-text-tertiary truncate">{user.email}</div>
                  {user.role === 'ADMIN' && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary dark:text-primary-light border border-primary/20">
                      管理员
                    </span>
                  )}
                </div>

                <Link
                  href="/user"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text hover:bg-bg-primary flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <UserRound className="w-3.5 h-3.5 text-blue-500" />
                  <span>个人中心</span>
                </Link>

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary dark:text-primary-light hover:bg-primary/10 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>管理后台</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors mt-1 border-t border-border/50 pt-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openAuth('login')}
              className="h-[34px] px-3 rounded-lg border border-border bg-card text-xs font-medium text-text hover:bg-bg-primary transition-all cursor-pointer"
            >
              登录
            </button>
            <button
              onClick={() => openAuth('register')}
              className="h-[34px] px-3 rounded-lg text-xs font-medium text-white transition-all cursor-pointer shadow-xs hover:shadow-md hidden sm:block"
              style={{
                background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))',
              }}
            >
              注册
            </button>
          </div>
        )}
      </div>

      {/* 搜索模态框 */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </header>
  );
}
