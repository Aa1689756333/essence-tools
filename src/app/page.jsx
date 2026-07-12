'use client';

import { useState } from 'react';
import { tools, categories } from '@/tools/registry';
import ToolCard from '@/components/ToolCard';

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('全部');

  const filteredTools = activeCategory === '全部'
    ? tools
    : tools.filter(t => t.category === activeCategory);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">工具箱</h1>
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          选择一个工具开始使用，所有工具在浏览器本地运行，不上传任何数据。
        </p>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-0.5 mb-7 bg-gray-100 rounded-[10px] p-[3px] w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`relative px-[18px] py-[7px] rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-white text-gray-900 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat}
            {activeCategory === cat && (
              <span 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full transition-all duration-300"
                style={{ backgroundColor: 'var(--theme-accent, #059669)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 工具卡片网格 */}
      <div key={activeCategory} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] animate-fade-up">
        {filteredTools.length > 0 ? (
          filteredTools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">暂无工具</p>
            <p className="text-gray-400 text-xs">该分类下还没有工具</p>
          </div>
        )}
      </div>
    </div>
  );
}
