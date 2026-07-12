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
      className={`bg-white border-r border-gray-200 flex flex-col shrink-0 relative overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* 品牌区 */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100 min-h-16">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <span className={`text-[17px] font-bold text-gray-900 tracking-wide whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          ToolBox
        </span>
      </div>

      {/* 折叠按钮 */}
      <button
        onClick={toggle}
        className="absolute top-[22px] -right-3.5 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center z-30 shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110 transition-all duration-200 cursor-pointer"
      >
        <ChevronLeft
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 导航区 */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {/* 工具总览 */}
        <div className={`text-[11px] font-semibold tracking-[0.05em] text-gray-400 px-2 pb-2 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          导航
        </div>

        <Link
          href="/"
          className={`flex items-center gap-3 py-2.5 px-3 rounded-[10px] mb-0.5 transition-all duration-200 relative group ${
            isActive('/')
              ? 'bg-gray-100'
              : 'hover:bg-gray-50'
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          {isActive('/') && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px] bg-emerald-500" />
          )}
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
            isActive('/')
              ? 'bg-emerald-500/10'
              : 'bg-gray-50'
          }`}>
            <LayoutGrid className={`w-4 h-4 ${isActive('/') ? 'text-gray-600' : 'text-gray-400'}`} />
          </span>
          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
            collapsed ? 'opacity-0 w-0' : 'opacity-100'
          } ${isActive('/') ? 'text-gray-900 font-semibold' : 'text-gray-500 group-hover:text-gray-700'}`}>
            工具总览
          </span>
        </Link>

        {/* 分类工具 */}
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
          <div key={category} className="mt-3.5">
            <div className={`text-[11px] font-semibold tracking-[0.05em] text-gray-400 px-2 pb-2 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
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
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px] bg-emerald-500" />
                  )}
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base transition-all duration-200 ${
                    active
                      ? 'bg-emerald-500/10'
                      : 'bg-gray-50'
                  }`}>
                    {tool.emoji || '🔧'}
                  </span>
                  <span className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-200 ${
                    collapsed ? 'opacity-0 w-0' : 'opacity-100'
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
      <div className="px-3.5 py-3 border-t border-gray-100 flex items-center gap-2.5 min-h-14">
        <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-gray-50">
          <Wrench className="w-3.5 h-3.5 text-gray-400" />
        </span>
        <span className={`text-[11px] text-gray-400 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          v0.1.0 · 共 {tools.length} 个工具
        </span>
      </div>
    </aside>
  );
}
