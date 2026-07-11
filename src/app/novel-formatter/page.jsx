import NovelFormatter from '@/tools/novel-formatter/NovelFormatter';

export const metadata = {
  title: '小说排版器 - ToolBox',
  description: '一键规范化小说文本的标点符号、中英文间距、段落缩进和对话格式，支持 29 条排版规则。',
};

export default function Page() {
  return <NovelFormatter />;
}
