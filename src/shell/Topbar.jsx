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
    <header className="h-[54px] px-8 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-gray-400 font-medium">ToolBox</span>
        <span className="text-gray-300 text-base">/</span>
        <span className="text-gray-900 font-semibold">{currentPageName}</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-[34px] h-[34px] rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 cursor-pointer">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-[34px] h-[34px] rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 cursor-pointer">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
