import dynamic from 'next/dynamic';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const NovelFormatter = dynamic(() => import('@/tools/novel-formatter/NovelFormatter'), {
  loading: () => <SkeletonLoader />,
});

export const metadata = {
  title: '小说排版器 - 极粹工具',
  description: '一键规范化小说文本的标点符号、中英文间距、段落缩进和对话格式，支持 29 条排版规则。',
};

export default function Page() {
  return <NovelFormatter />;
}
