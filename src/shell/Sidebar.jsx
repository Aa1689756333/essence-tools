'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSidebar } from './useSidebar';
import { useTheme } from './ThemeProvider';
import { LayoutGrid, ChevronLeft, Wrench, X } from 'lucide-react';

export default function Sidebar({ tools, toolsByCategory }) {
  const pathname = usePathname();
  const { collapsed, toggle, mobileOpen, closeMobile, isMobile } = useSidebar();
  const { theme } = useTheme();

  const isActive = (path) => pathname === path;

  // ESC 键关闭移动端侧边栏
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen && isMobile) {
        closeMobile();
      }
    };
    
    if (isMobile) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileOpen, isMobile, closeMobile]);

  const navContent = (
    <>
      {/* 品牌区 */}
      <div className={`h-[52px] flex items-center border-b border-gray-200 shrink-0 ${
        isMobile ? 'px-4 justify-between' : collapsed ? 'justify-center' : 'px-4 gap-2.5'
      }`}>
        <div className={`flex items-center ${isMobile ? '' : collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.light})`,
              boxShadow: `0 2px 6px rgba(${theme.shadow}, 0.2)`,
            }}
          >
            <Wrench className="w-3.5 h-3.5 text-white" />
          </div>
          <span className={`text-[16.5px] font-bold text-gray-900 tracking-tight whitespace-nowrap transition-all duration-200 ${
            (!isMobile && collapsed) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}>
            ToolBox
          </span>
        </div>
        {isMobile && (
          <button
            onClick={closeMobile}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 导航区 */}
      <nav className={`flex-1 overflow-y-auto py-3 ${isMobile ? 'px-2.5' : collapsed ? 'px-1.5' : 'px-2.5'}`}>
        {/* 工具总览 */}
        <div className={`text-[11px] font-semibold tracking-[0.04em] text-gray-400 px-2.5 pb-2 whitespace-nowrap overflow-hidden transition-all duration-200 ${
          (!isMobile && collapsed) ? 'opacity-0 h-0 pb-0' : 'opacity-100'
        }`}>
          导航
        </div>

        <Link
          href="/"
          onClick={isMobile ? closeMobile : undefined}
          className={`flex items-center rounded-lg mb-0.5 transition-all duration-[180ms] relative group ${
            (!isMobile && collapsed) ? 'justify-center py-2' : 'gap-2 py-1.5 px-2'
          } ${
            isActive('/') ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          {isActive('/') && (
            <span
              className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-r-[3px] ${
                (!isMobile && collapsed) ? 'left-0' : '-left-2.5'
              }`}
              style={{ backgroundColor: theme.accent }}
            />
          )}
          <span
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
              isActive('/') ? '' : 'bg-gray-50 border border-gray-100'
            }`}
            style={isActive('/') ? { backgroundColor: theme.subtle, border: `1px solid ${theme.accent}1a` } : {}}
          >
            <LayoutGrid className={`w-3.5 h-3.5 ${isActive('/') ? '' : 'text-gray-400'}`}
              style={isActive('/') ? { color: theme.accent } : {}} />
          </span>
          <span className={`text-[13.5px] whitespace-nowrap overflow-hidden transition-all duration-200 tracking-tight ${
            (!isMobile && collapsed) ? 'opacity-0 w-0' : 'opacity-100'
          } ${isActive('/') ? 'text-gray-900 font-semibold' : 'text-gray-500 group-hover:text-gray-700'}`}>
            工具总览
          </span>
        </Link>

        {/* 分类工具 */}
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
          <div key={category} className={`${(!isMobile && collapsed) ? 'mt-3' : 'mt-2'}`}>
            <div className={`text-[11px] font-semibold tracking-[0.04em] text-gray-400 px-2.5 pb-2 whitespace-nowrap overflow-hidden transition-all duration-200 ${
              (!isMobile && collapsed) ? 'opacity-0 h-0 pb-0' : 'opacity-100'
            }`}>
              {category}工具
            </div>
            {categoryTools.map(tool => {
              const active = isActive(tool.path);
              return (
                <Link
                  key={tool.id}
                  href={tool.path}
                  onClick={isMobile ? closeMobile : undefined}
                  className={`flex items-center rounded-lg mb-0.5 transition-all duration-[180ms] relative group ${
                    (!isMobile && collapsed) ? 'justify-center py-2' : 'gap-2 py-1.5 px-2'
                  } ${
                    active ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  {active && (
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-r-[3px] ${
                        (!isMobile && collapsed) ? 'left-0' : '-left-2.5'
                      }`}
                      style={{ backgroundColor: theme.accent }}
                    />
                  )}
                  <span
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-sm transition-all duration-200 ${
                      active ? '' : 'bg-gray-50 border border-gray-100'
                    }`}
                    style={active ? { backgroundColor: theme.subtle, border: `1px solid ${theme.accent}1a` } : {}}
                  >
                    {tool.emoji || ''}
                  </span>
                  <span className={`text-[13.5px] whitespace-nowrap overflow-hidden transition-all duration-200 tracking-tight ${
                    (!isMobile && collapsed) ? 'opacity-0 w-0' : 'opacity-100'
                  } ${active ? 'text-gray-900 font-semibold' : 'text-gray-500 font-medium group-hover:text-gray-700'}`}>
                    {tool.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 底部 */}
      <div className={`border-t border-gray-100 flex items-center shrink-0 ${
        isMobile ? 'py-3.5 px-4 gap-2' : collapsed ? 'justify-center py-3' : 'py-3.5 px-4 gap-2'
      }`}>
        <span className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-50 border border-gray-100 shrink-0">
          <Wrench className="w-3.5 h-3.5 text-gray-400" />
        </span>
        <span className={`text-[11.5px] text-gray-400 whitespace-nowrap overflow-hidden transition-all duration-200 tracking-tight ${
          (!isMobile && collapsed) ? 'opacity-0 w-0' : 'opacity-100'
        }`}>
          v0.1.0 · 共 {tools.length} 个工具
        </span>
      </div>
    </>
  );

  // 移动端：抽屉式侧边栏
  if (isMobile) {
    return (
      <>
        {/* 遮罩层 */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-[2px]"
            onClick={closeMobile}
          />
        )}
        {/* 抽屉 */}
        <aside
          className={`fixed top-0 left-0 h-full w-[min(260px,72vw)] bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {navContent}
        </aside>
      </>
    );
  }

  // 桌面端：固定侧边栏
  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col shrink-0 relative overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hidden md:flex ${
        collapsed ? 'w-[56px]' : 'w-[200px]'
      }`}
    >
      {navContent}

      {/* 折叠按钮 */}
      <button
        onClick={toggle}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-10 rounded-md bg-white border border-gray-200 flex flex-col items-center justify-center gap-0.5 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.1)] hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden group"
      >
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-[2.5px] transition-colors duration-200"
          style={{ backgroundColor: theme.accent }}
        />
        <ChevronLeft
          className={`w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 transition-all duration-300 relative z-10 ${collapsed ? 'rotate-180' : ''}`}
        />
        <ChevronLeft
          className={`w-2.5 h-2.5 text-gray-400 group-hover:text-gray-700 transition-all duration-300 relative z-10 ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>
    </aside>
  );
}
