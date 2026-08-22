import Link from 'next/link';
import { Home, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 图标 */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <FileQuestion className="w-10 h-10 text-amber-500" />
        </div>

        {/* 标题 */}
        <h1 className="text-4xl font-bold text-text mb-3">
          404
        </h1>
        <h2 className="text-xl font-semibold text-text mb-4">
          页面未找到
        </h2>

        {/* 描述 */}
        <p className="text-text-secondary mb-8 leading-relaxed">
          抱歉，您访问的页面不存在或已被移除。<br />
          请检查网址是否正确，或返回首页浏览。
        </p>

        {/* 按钮 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{
            background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))',
          }}
        >
          <Home className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
