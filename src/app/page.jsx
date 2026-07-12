import Link from 'next/link';
import { tools, categories } from '@/tools/registry';
import ToolCard from '@/components/ToolCard';

export default function HomePage() {
  return (
    <div>
      {/* 头部 */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-text mb-1.5">工具箱</h1>
        <p className="text-sm text-text-secondary">
          选择一个工具开始使用，所有工具在浏览器本地运行，不上传任何数据。
        </p>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-1 mb-6">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 ${
              i === 0
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
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
