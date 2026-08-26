import { Avatar, Style } from '@dicebear/core';
import clayJson from '@dicebear/styles/clay.json' with { type: 'json' };
import crittersJson from '@dicebear/styles/critters.json' with { type: 'json' };
import funEmojiJson from '@dicebear/styles/fun-emoji.json' with { type: 'json' };
import voxelArtJson from '@dicebear/styles/voxel-art.json' with { type: 'json' };
import voxelBotJson from '@dicebear/styles/voxel-bot.json' with { type: 'json' };
import glyphsJson from '@dicebear/styles/glyphs.json' with { type: 'json' };
import identiconJson from '@dicebear/styles/identicon.json' with { type: 'json' };
import initialFaceJson from '@dicebear/styles/initial-face.json' with { type: 'json' };

const styleMap = {
  clay: { style: clayJson, options: {} },
  critters: { style: crittersJson, options: {} },
  'fun-emoji': { style: funEmojiJson, options: {} },
  'voxel-art': { style: voxelArtJson, options: {} },
  'voxel-bot': { style: voxelBotJson, options: {} },
  glyphs: { style: glyphsJson, options: {} },
  identicon: { style: identiconJson, options: {} },
  'initial-face': { style: initialFaceJson, options: {} },
};

export async function GET(request, { params }) {
  let { style, seed } = await params;

  if (!style || !seed) {
    return new Response('Missing style or seed', { status: 400 });
  }

  // 默认回退
  const selectedStyle = styleMap[style] || styleMap['fun-emoji'];

  // 如果传进来的是带后缀的，比如 seed.svg，去掉后缀
  if (seed.endsWith('.svg')) {
    seed = seed.replace('.svg', '');
  }

  // 生成头像
  const dicebearStyle = new Style(selectedStyle.style);
  const avatar = new Avatar(dicebearStyle, {
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
