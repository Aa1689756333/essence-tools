import { createAvatar } from '@dicebear/core';
import {
  bottts,
  funEmoji,
  identicon,
  shapes,
  initials,
  pixelArt,
  micah,
  notionists
} from '@dicebear/collection';
import crypto from 'crypto';

// 风格池，根据用户 ID 哈希值随机分配一种风格，且对特定用户永远固定
const styles = [
  { style: funEmoji, options: {} }, // 趣味 Emoji
  { style: bottts, options: {} }, // 机器人 (Voxel Bot 平替)
  { style: pixelArt, options: {} }, // 像素风 (Voxel Art 平替)
  { style: shapes, options: {} }, // 几何图形 (Glyphs 平替)
  { style: identicon, options: {} }, // 经典像素图案
  { style: initials, options: { backgroundType: ['gradientLinear'] } }, // 字母头像
  { style: micah, options: { backgroundColor: ['ffdfbf', 'ffd5dc', 'd1d4f9', 'c0aede', 'b6e3f4'] } }, // 类似 Clay 的 3D 人脸
  { style: notionists, options: { backgroundColor: ['ffdfbf', 'ffd5dc', 'd1d4f9', 'c0aede', 'b6e3f4'] } }, // 简约线条人脸
];

export async function GET(request, { params }) {
  const { id } = await params;
  
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // 通过 MD5 计算出一个确定的索引
  const hash = crypto.createHash('md5').update(id).digest('hex');
  const index = parseInt(hash.substring(0, 8), 16) % styles.length;
  const selectedStyle = styles[index];

  // 生成头像
  const avatar = createAvatar(selectedStyle.style, {
    seed: id,
    size: 128, // 输出尺寸
    ...selectedStyle.options // 附加当前风格的特定参数
  });

  const svg = avatar.toString();

  // 强缓存，因为头像是根据 seed 确定性生成的
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
