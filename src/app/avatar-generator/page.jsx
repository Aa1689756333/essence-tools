import AvatarGenerator from '@/tools/avatar-generator/AvatarGenerator';

export const metadata = {
  title: '头像生成器 - 工具',
  description: '免费的一键头像生成器，支持数十种 3D/像素风格，随时开盲盒生成你的专属头像',
};

export default function Page() {
  return <AvatarGenerator />;
}
