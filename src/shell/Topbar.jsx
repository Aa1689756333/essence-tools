'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Palette, Check, Menu, Sun, Moon } from 'lucide-react';
import { tools } from '@/tools/registry';
import { useTheme } from './ThemeProvider';
import { useSidebar } from './useSidebar';

export default function Topbar() {
  const pathname = usePathname();
  const { theme, themes, setTheme, isDark, setIsDark } = useTheme();
  const { toggle, isMobile } = useSidebar();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDirection, setPickerDirection] = useState('right');
  const pickerRef = useRef(null);
  const pickerButtonRef = useRef(null);

  const currentTool = tools.find(t => t.path === pathname);
  const currentPageName = currentTool ? currentTool.name : '工具总览';

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

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

  return (
    <header className="h-[52px] px-4 sm:px-5 md:px-6 lg:px-8 flex items-center justify-between border-b border-border bg-bg-sidebar shrink-0">
      <div className="flex items-center gap-2 text-[13px]" role="navigation" aria-label="面包屑导航">
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
        <button
          className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer hidden md:flex"
          aria-label="搜索工具"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer hidden md:flex"
          aria-label="系统通知"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* 暗黑模式切换 */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg-primary transition-all duration-150 cursor-pointer"
          aria-label={isDark ? "切换为亮色模式" : "切换为暗黑模式"}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* 主题切换 */}
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
            <div className={`absolute top-[42px] w-[180px] bg-card border border-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-3 z-50 ${pickerDirection === 'left' ? 'left-0' : 'right-0'}`} role="dialog" aria-label="主题色面板">
              <div className="text-[11px] font-semibold text-text-secondary tracking-wide mb-2.5 px-0.5">主题色</div>
              <div className="flex flex-wrap gap-2">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t); setShowPicker(false); }}
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
      </div>
    </header>
  );
}
