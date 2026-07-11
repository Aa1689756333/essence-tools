export const tools = [
  {
    id: 'novel-formatter',
    name: '小说排版器',
    desc: '一键规范化标点、间距、段落，29 条排版规则',
    icon: 'BookOpen',
    emoji: '📖',
    color: 'amber',
    path: '/novel-formatter',
    category: '文本',
    tags: ['写作', '排版'],
    clientOnly: true,
  },
];

export const categories = ['全部', ...new Set(tools.map(t => t.category))];

export function getToolsByCategory() {
  const map = {};
  for (const tool of tools) {
    if (!map[tool.category]) map[tool.category] = [];
    map[tool.category].push(tool);
  }
  return map;
}
