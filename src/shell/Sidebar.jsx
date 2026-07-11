'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './useSidebar';
import { LayoutGrid, ChevronLeft, Wrench } from 'lucide-react';

export default function Sidebar({ tools, toolsByCategory }) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  const isActive = (path) => pathname === path;

  return (
    <aside
      className={`bg-bg-sidebar flex flex-col shrink-0 relative overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* 品牌区 */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-white/[0.06] min-h-16">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-accent to-amber-400 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(217,119,6,0.3)]">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[17px] font-bold text-white tracking-wide whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          ToolBox
        </span>
      </div>

      {/* 折叠按钮 */}
      <button
        onClick={toggle}
        className="absolute top-[22px] -right-3.5 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center z-30 shadow-sm hover:shadow-md hover:scale-110 transition-all duration-200 cursor-pointer"
      >
        <ChevronLeft
          className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 导航区 */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {/* 工具总览 */}
        <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 px-2 pb-2 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          导航
        </div>

        <Link
          href="/"
          className={`flex items-center gap-3 py-2.5 px-3 rounded-[10px] mb-0.5 transition-all duration-200 relative group ${
            isActive('/')
              ? 'bg-accent/[0.12]'
              : 'hover:bg-white/[0.06]'
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          {isActive('/') && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px] bg-accent" />
          )}
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
            isActive('/')
              ? 'bg-accent/[0.15] shadow-[0_0_0_1px_rgba(217,119,6,0.15)]'
              : 'bg-white/[0.04]'
          }`}>
            <LayoutGrid className={`w-4 h-4 ${isActive('/') ? 'text-white' : 'text-white/45'}`} />
          </span>
          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
            collapsed ? 'opacity-0 w-0' : 'opacity-100'
          } ${isActive('/') ? 'text-white font-semibold' : 'text-white/45 group-hover:text-white/80'}`}>
            工具总览
          </span>
        </Link>

        {/* 分类工具 */}
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
          <div key={category} className="mt-3.5">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 px-2 pb-2 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
              {category}工具
            </div>
            {categoryTools.map(tool => {
              const active = isActive(tool.path);
              return (
                <Link
                  key={tool.id}
                  href={tool.path}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-[10px] mb-0.5 transition-all duration-200 relative group ${
                    active
                      ? 'bg-accent/[0.12]'
                      : 'hover:bg-white/[0.06]'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px] bg-accent" />
                  )}
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base transition-all duration-200 ${
                    active
                      ? 'bg-accent/[0.15] shadow-[0_0_0_1px_rgba(217,119,6,0.15)]'
                      : 'bg-white/[0.04]'
                  }`}>
                    {tool.emoji || '🔧'}
                  </span>
                  <span className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-200 ${
                    collapsed ? 'opacity-0 w-0' : 'opacity-100'
                  } ${active ? 'text-white font-semibold' : 'text-white/45 font-medium group-hover:text-white/80'}`}>
                    {tool.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 底部 */}
      <div className="px-3.5 py-3 border-t border-white/[0.06] flex items-center gap-2.5 min-h-14">
        <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-white/[0.04]">
          <Wrench className="w-3.5 h-3.5 text-white/35" />
        </span>
        <span className={`text-[11px] text-white/30 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          v0.1.0 · 共 {tools.length} 个工具
        </span>
      </div>
    </aside>
  );
}
