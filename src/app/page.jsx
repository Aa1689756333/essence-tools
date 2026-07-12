import Link from 'next/link';
import { tools, categories } from '@/tools/registry';
import ToolCard from '@/components/ToolCard';

export default function HomePage() {
  return (
    <div className="w-full">
      {/* 头部 */}
      <div className="mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">工具箱</h1>
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          选择一个工具开始使用，所有工具在浏览器本地运行，不上传任何数据。
        </p>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-0.5 mb-7 bg-gray-100 rounded-[10px] p-[3px] w-fit">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`px-[18px] py-[7px] rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-200 ${
              i === 0
                ? 'bg-white text-gray-900 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 工具卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
        {tools.map((tool, index) => (
          <ToolCard key={tool.id} tool={tool} index={index} />
        ))}
      </div>
    </div>
  );
}
