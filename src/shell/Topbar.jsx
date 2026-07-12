'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Palette, Check, Menu } from 'lucide-react';
import { tools } from '@/tools/registry';
import { useTheme } from './ThemeProvider';
import { useSidebar } from './useSidebar';

export default function Topbar() {
  const pathname = usePathname();
  const { theme, themes, setTheme } = useTheme();
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
    <header className="h-[52px] px-4 sm:px-5 md:px-6 lg:px-8 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-2 text-[13px]">
        {isMobile && (
          <button
            onClick={toggle}
            className="w-[34px] h-[34px] rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 cursor-pointer md:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <span className="text-gray-400 font-medium">ToolBox</span>
        <span className="text-gray-300 text-base">/</span>
        <span className="text-gray-900 font-semibold">{currentPageName}</span>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <button className="w-[34px] h-[34px] rounded-lg border border-gray-200 bg-white items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 cursor-pointer hidden md:flex">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-[34px] h-[34px] rounded-lg border border-gray-200 bg-white items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 cursor-pointer hidden md:flex">
          <Bell className="w-4 h-4" />
        </button>

        {/* 主题切换 */}
        <div className="relative" ref={pickerRef}>
          <button
            ref={pickerButtonRef}
            onClick={() => setShowPicker(!showPicker)}
            className="w-[34px] h-[34px] rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 cursor-pointer"
          >
            <Palette className="w-4 h-4" />
          </button>

          {showPicker && (
            <div className={`absolute top-[42px] w-[180px] bg-white border border-gray-200 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-3 z-50 ${pickerDirection === 'left' ? 'left-0' : 'right-0'}`}>
              <div className="text-[11px] font-semibold text-gray-400 tracking-wide mb-2.5 px-0.5">主题色</div>
              <div className="flex flex-wrap gap-2">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t); setShowPicker(false); }}
                    className="relative w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: t.accent }}
                    title={t.name}
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
