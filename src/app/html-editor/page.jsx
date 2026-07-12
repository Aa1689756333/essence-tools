import HtmlEditor from '@/tools/html-editor/HtmlEditor';

export const metadata = {
  title: 'HTML 编辑器 - ToolBox',
  description: '在线富文本编辑器，像 Word 一样编辑内容，支持导出为 HTML 代码。',
};

export default function Page() {
  return <HtmlEditor />;
}
