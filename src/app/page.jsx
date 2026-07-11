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
      <div className="flex gap-1.5 mb-6">
        {categories.map((cat) => (
          <span
            key={cat}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all duration-150 bg-accent-subtle text-accent border border-accent/15 font-semibold"
          >
            {cat}
          </span>
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
