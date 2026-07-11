'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { tools } from '@/tools/registry';

export default function Topbar() {
  const pathname = usePathname();

  // 根据当前路径找到工具名
  const currentTool = tools.find(t => t.path === pathname);
  const currentPageName = currentTool ? currentTool.name : '工具总览';

  return (
    <header className="h-[52px] px-7 flex items-center justify-between border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-text-secondary">ToolBox</span>
        <span className="text-border-light text-base">/</span>
        <span className="text-text font-semibold">{currentPageName}</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg hover:border-[#d1d5db] hover:text-text transition-all duration-150 cursor-pointer">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-[34px] h-[34px] rounded-lg border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-bg hover:border-[#d1d5db] hover:text-text transition-all duration-150 cursor-pointer">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
