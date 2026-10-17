import dynamic from 'next/dynamic';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const HtmlEditor = dynamic(() => import('@/tools/html-editor/HtmlEditor'), {
  loading: () => <SkeletonLoader />,
});

export const metadata = {
  title: 'HTML 编辑器 - 极粹工具',
  description: '在线富文本编辑器，像 Word 一样编辑内容，支持导出为 HTML 代码。',
};

export default function Page() {
  return <HtmlEditor />;
}
