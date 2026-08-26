// 头像相关的工具函数

export const AVATAR_STYLES = [
  'fun-emoji',
  'bottts',
  'pixel-art',
  'shapes',
  'identicon',
  'initials',
  'micah',
  'notionists',
];

export const AVATAR_STYLE_LABELS = {
  'fun-emoji': '趣味表情 (Fun Emoji)',
  bottts: '机器人 (Bottts)',
  'pixel-art': '像素艺术 (Pixel Art)',
  shapes: '几何抽象 (Shapes)',
  identicon: '经典像素 (Identicon)',
  initials: '字母渐变 (Initials)',
  micah: '3D 拟态脸 (Micah)',
  notionists: '极简手绘 (Notionists)',
};

/**
 * 简单的字符串哈希函数（可用在前端浏览器和 Node 环境）
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * 获取用户的头像 URL
 * 如果用户有自定义的 style 和 seed，使用自定义的；否则根据 user.id 算出一个固定的
 */
export function getUserAvatarUrl(user) {
  if (!user || !user.id) return '/api/avatar/bottts/default.svg';

  const style = user.avatarStyle || AVATAR_STYLES[simpleHash(user.id) % AVATAR_STYLES.length];
  const seed = user.avatarSeed || user.id;

  return `/api/avatar/${style}/${seed}.svg`;
}
