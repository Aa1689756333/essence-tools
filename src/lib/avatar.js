// 头像相关的工具函数

export const AVATAR_STYLES = [
  'clay',
  'critters',
  'fun-emoji',
  'voxel-art',
  'voxel-bot',
  'glyphs',
  'identicon',
  'initial-face',
];

export const AVATAR_STYLE_LABELS = {
  clay: '橡皮泥 (Clay)',
  critters: '小怪兽 (Critters)',
  'fun-emoji': '趣味表情 (Fun Emoji)',
  'voxel-art': '3D 像素人 (Voxel Art)',
  'voxel-bot': '3D 像素机器人 (Voxel Bot)',
  glyphs: '极简符号 (Glyphs)',
  identicon: '经典像素 (Identicon)',
  'initial-face': '表情字母 (Initial Face)',
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
  if (!user || !user.id) return '/api/avatar/fun-emoji/default.svg';

  const style = user.avatarStyle || AVATAR_STYLES[simpleHash(user.id) % AVATAR_STYLES.length];
  const seed = user.avatarSeed || user.id;

  return `/api/avatar/${style}/${seed}.svg`;
}
