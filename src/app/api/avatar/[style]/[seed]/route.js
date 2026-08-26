import { Avatar, Style } from '@dicebear/core';
import { ALL_AVATAR_STYLES } from '@/lib/all-avatar-styles';

export async function GET(request, { params }) {
  let { style, seed } = await params;

  if (!style || !seed) {
    return new Response('Missing style or seed', { status: 400 });
  }

  // 默认回退
  const selectedStyleJson = ALL_AVATAR_STYLES[style] || ALL_AVATAR_STYLES['fun-emoji'];

  // 如果传进来的是带后缀的，比如 seed.svg，去掉后缀
  if (seed.endsWith('.svg')) {
    seed = seed.replace('.svg', '');
  }

  const url = new URL(request.url);
  const bg = url.searchParams.get('bg');

  const options = {
    seed: seed,
    size: 256, // 提高输出尺寸，保证生成器清晰度
  };

  // 如果有特定的样式选项，可以在这里扩展，但默认 v10 靠参数
  if (bg && bg !== 'transparent') {
    options.backgroundColor = [bg.replace('#', '')];
  } else {
    // 强制透明背景，覆盖某些样式默认会随机生成背景色的行为
    options.backgroundColor = [];
  }

  // 生成头像
  const dicebearStyle = new Style(selectedStyleJson);
  const avatar = new Avatar(dicebearStyle, options);

  const svg = avatar.toString();

  // 强缓存，完全无状态
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
