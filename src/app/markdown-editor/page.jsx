import dynamic from 'next/dynamic';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const MarkdownEditor = dynamic(() => import('@/tools/markdown-editor/MarkdownEditor'), {
  loading: () => <SkeletonLoader />,
});

export const metadata = {
  title: 'Markdown 编辑器 - ToolBox',
  description: '在线 Markdown 编辑器，实时预览渲染效果，支持导出为 Markdown 或 HTML 文件。',
};

export default function Page() {
  return <MarkdownEditor />;
}
