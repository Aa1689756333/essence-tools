import { createAvatar } from '@dicebear/core';
import {
  bottts,
  funEmoji,
  identicon,
  shapes,
  initials,
  pixelArt,
  micah,
  notionists,
} from '@dicebear/collection';

// 风格池映射
const styleMap = {
  'fun-emoji': { style: funEmoji, options: {} },
  bottts: { style: bottts, options: {} },
  'pixel-art': { style: pixelArt, options: {} },
  shapes: { style: shapes, options: {} },
  identicon: { style: identicon, options: {} },
  initials: { style: initials, options: { backgroundType: ['gradientLinear'] } },
  micah: {
    style: micah,
    options: { backgroundColor: ['ffdfbf', 'ffd5dc', 'd1d4f9', 'c0aede', 'b6e3f4'] },
  },
  notionists: {
    style: notionists,
    options: { backgroundColor: ['ffdfbf', 'ffd5dc', 'd1d4f9', 'c0aede', 'b6e3f4'] },
  },
};

export async function GET(request, { params }) {
  let { style, seed } = await params;

  if (!style || !seed) {
    return new Response('Missing style or seed', { status: 400 });
  }

  // 默认回退
  const selectedStyle = styleMap[style] || styleMap['bottts'];

  // 如果传进来的是带后缀的，比如 seed.svg，去掉后缀
  if (seed.endsWith('.svg')) {
    seed = seed.replace('.svg', '');
  }

  // 生成头像
  const avatar = createAvatar(selectedStyle.style, {
    seed: seed,
    size: 128, // 输出尺寸
    ...selectedStyle.options, // 附加当前风格的特定参数
  });

  const svg = avatar.toString();

  // 强缓存，完全无状态
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
