import db from './db';

export const DEFAULT_SETTINGS = {
  site_title: 'ToolBox · 在线工具箱',
  site_description: '免费在线工具集合，所有工具在浏览器本地运行，不上传任何数据。',
  site_keywords: '在线工具, 小说排版, HTML编辑器, Markdown编辑器, 开发工具',
  allow_registration: 'true',
  email_verification: 'false', // 'true' 时注册需邮箱验证码；初始关闭以确保首个用户可注册
  email_mode: 'none', // 'none' | 'whitelist' | 'blacklist'
  email_whitelist: JSON.stringify(['@gmail.com', '@qq.com', '@163.com', '@outlook.com']),
  email_blacklist: JSON.stringify(['*@tempmail.com', '*@dispostable.com', '*@mailinator.com']),
  smtp_config: JSON.stringify({
    host: '',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromName: 'ToolBox',
    fromEmail: '',
  }),
  checkin_config: JSON.stringify({
    mode: 'A',
    capped: {
      basePoints: 3,
      bonusRules: [
        { minDays: 3, maxDays: 6, extraPoints: 2 },
        { minDays: 7, maxDays: 99, extraPoints: 4 },
      ],
      dailyCap: 7,
      milestones: [
        { day: 7, bonus: 3 },
        { day: 14, bonus: 6 },
        { day: 21, bonus: 10 },
        { day: 30, bonus: 20 },
      ],
    },
    tiered: {
      dailyTiers: [
        { minDays: 1, maxDays: 6, dailyPoints: 1 },
        { minDays: 7, maxDays: 13, dailyPoints: 2 },
        { minDays: 14, maxDays: 20, dailyPoints: 3 },
        { minDays: 21, maxDays: 30, dailyPoints: 4 },
      ],
      milestones: [
        { day: 7, bonus: 3 },
        { day: 14, bonus: 6 },
        { day: 21, bonus: 10 },
        { day: 30, bonus: 20 },
      ],
    },
    daily: {
      days: [
        1, 1, 1, 1, 1, 1, 5, 2, 2, 2, 2, 2, 2, 9, 3, 3, 3, 3, 3, 3, 14, 4, 4, 4, 4, 4, 4, 4, 4, 24,
      ],
    },
    cycleLength: 30,
    cycleReset: true,
    absoluteDailyCap: 50,
  }),
};

export function normalizeCheckinConfig(raw) {
  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }

  const defaults = JSON.parse(DEFAULT_SETTINGS.checkin_config);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return defaults;
  }

  if (!parsed.mode) {
    return {
      ...defaults,
      capped: {
        ...defaults.capped,
        basePoints: parsed.basePoints ?? defaults.capped.basePoints,
        bonusRules: parsed.bonusRules ?? defaults.capped.bonusRules,
        dailyCap: parsed.dailyCap ?? defaults.capped.dailyCap,
        ...(parsed.monthFullBonus !== undefined ? { monthFullBonus: parsed.monthFullBonus } : {}),
      },
    };
  }

  if (!['A', 'B', 'C'].includes(parsed.mode)) {
    return defaults;
  }

  return {
    ...defaults,
    ...parsed,
    capped: { ...defaults.capped, ...(parsed.capped || {}) },
    tiered: { ...defaults.tiered, ...(parsed.tiered || {}) },
    daily: { ...defaults.daily, ...(parsed.daily || {}) },
  };
}

let settingsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 60 秒内存缓存

export async function getSystemSettings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && settingsCache && now - cacheTime < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const rows = await db.systemSetting.findMany();
    const settingsMap = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }

    settingsCache = settingsMap;
    cacheTime = now;
    return settingsMap;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSettings(newSettings) {
  const entries = Object.entries(newSettings);

  for (const [key, value] of entries) {
    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await db.systemSetting.upsert({
      where: { key },
      update: { value: valStr },
      create: { key, value: valStr },
    });
  }

  // 清除缓存
  settingsCache = null;
  cacheTime = 0;
  return await getSystemSettings(true);
}

function matchRule(email, rule) {
  if (!rule || !email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanRule = rule.trim().toLowerCase();

  if (cleanRule.startsWith('@')) {
    return cleanEmail.endsWith(cleanRule);
  }

  if (cleanRule.includes('*')) {
    const regExpStr = '^' + cleanRule.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
    return new RegExp(regExpStr).test(cleanEmail);
  }

  return cleanEmail === cleanRule;
}

export async function validateEmailRule(email) {
  const settings = await getSystemSettings();
  const mode = settings.email_mode;

  if (mode === 'none') {
    return { allowed: true };
  }

  let whitelist = [];
  let blacklist = [];
  try {
    whitelist = JSON.parse(settings.email_whitelist || '[]');
  } catch {}
  try {
    blacklist = JSON.parse(settings.email_blacklist || '[]');
  } catch {}

  if (mode === 'whitelist') {
    const isMatched = whitelist.some((rule) => matchRule(email, rule));
    if (!isMatched) {
      return { allowed: false, reason: '该邮箱域名不在允许注册的白名单中' };
    }
    return { allowed: true };
  }

  if (mode === 'blacklist') {
    const isMatched = blacklist.some((rule) => matchRule(email, rule));
    if (isMatched) {
      return { allowed: false, reason: '该邮箱域名已被系统列入禁用黑名单' };
    }
    return { allowed: true };
  }

  return { allowed: true };
}
