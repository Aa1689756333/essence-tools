import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, normalizeCheckinConfig } from '../settings';

const dbMock = vi.hoisted(() => ({
  systemSetting: { findMany: vi.fn(), upsert: vi.fn() },
}));

vi.mock('../db', () => ({ default: dbMock, db: dbMock }));

const defaultCheckin = JSON.parse(DEFAULT_SETTINGS.checkin_config);

/**
 * settings.js 用模块级变量缓存配置 60 秒，同一进程内连续读取会命中旧值。
 * 这里喂好 db 的返回值并重置模块，让每个用例都拿到自己那份配置。
 */
async function loadValidateEmailRule(rows) {
  dbMock.systemSetting.findMany.mockReset();
  dbMock.systemSetting.findMany.mockResolvedValue(
    Object.entries(rows).map(([key, value]) => ({ key, value }))
  );
  vi.resetModules();
  const settingsModule = await import('../settings');
  return settingsModule.validateEmailRule;
}

describe('normalizeCheckinConfig', () => {
  it('坏 JSON 字符串回落默认配置', () => {
    expect(normalizeCheckinConfig('{ 这不是 json')).toEqual(defaultCheckin);
  });

  it('空值与数组输入回落默认配置', () => {
    expect(normalizeCheckinConfig(null)).toEqual(defaultCheckin);
    expect(normalizeCheckinConfig([1, 2])).toEqual(defaultCheckin);
  });

  // 兼容旧格式：早期积分配置是平铺的、没有 mode 字段。
  it('无 mode 的旧格式把平铺字段迁移进 capped', () => {
    const r = normalizeCheckinConfig({ basePoints: 8, dailyCap: 12, monthFullBonus: 30 });
    expect(r.mode).toBe('A');
    expect(r.capped.basePoints).toBe(8);
    expect(r.capped.dailyCap).toBe(12);
    expect(r.capped.monthFullBonus).toBe(30);
  });

  it('mode 不在 A/B/C 之内时整体回落默认', () => {
    expect(normalizeCheckinConfig({ mode: 'D', capped: { basePoints: 99 } })).toEqual(
      defaultCheckin
    );
  });

  it('新格式只覆盖给出的段，其余保持默认', () => {
    const r = normalizeCheckinConfig({ mode: 'C', daily: { days: [1, 2] } });
    expect(r.mode).toBe('C');
    expect(r.daily.days).toEqual([1, 2]);
    expect(r.capped).toEqual(defaultCheckin.capped);
    expect(r.cycleLength).toBe(defaultCheckin.cycleLength);
  });
});

describe('validateEmailRule', () => {
  it('mode 为 none 时全部放行', async () => {
    const validateEmailRule = await loadValidateEmailRule({ email_mode: 'none' });
    expect(await validateEmailRule('anyone@whatever.test')).toEqual({ allowed: true });
  });

  it('白名单模式按域名后缀匹配', async () => {
    const validateEmailRule = await loadValidateEmailRule({
      email_mode: 'whitelist',
      email_whitelist: JSON.stringify(['@qq.com', '@163.com']),
    });
    expect(await validateEmailRule('someone@qq.com')).toEqual({ allowed: true });
    expect(await validateEmailRule('someone@gmail.com')).toEqual({
      allowed: false,
      reason: '该邮箱域名不在允许注册的白名单中',
    });
  });

  it('匹配忽略大小写与首尾空格', async () => {
    const validateEmailRule = await loadValidateEmailRule({
      email_mode: 'whitelist',
      email_whitelist: JSON.stringify(['@qq.com']),
    });
    expect(await validateEmailRule('  Someone@QQ.COM  ')).toEqual({ allowed: true });
  });

  it('黑名单模式用通配规则拦截临时邮箱', async () => {
    const validateEmailRule = await loadValidateEmailRule({
      email_mode: 'blacklist',
      email_blacklist: JSON.stringify(['*@mailinator.com']),
    });
    expect(await validateEmailRule('trash@mailinator.com')).toEqual({
      allowed: false,
      reason: '该邮箱域名已被系统列入禁用黑名单',
    });
    expect(await validateEmailRule('real@qq.com')).toEqual({ allowed: true });
  });

  it('不含 * 与 @ 前缀的规则按完整地址精确匹配', async () => {
    const validateEmailRule = await loadValidateEmailRule({
      email_mode: 'whitelist',
      email_whitelist: JSON.stringify(['admin@example.com']),
    });
    expect(await validateEmailRule('admin@example.com')).toEqual({ allowed: true });
    expect(await validateEmailRule('boss@example.com')).toEqual({
      allowed: false,
      reason: '该邮箱域名不在允许注册的白名单中',
    });
  });

  // 第二道防线：adminSettingsSchema 现在已在保存时挡住坏 JSON，但库里可能仍留有历史坏值；
  // 那种情况下读取侧的 catch 会吞掉异常、退化成空表，
  // 后果是"谁都注册不了"且没有任何报错提示。此测试锁住这个兜底行为。
  it('白名单 JSON 损坏时静默拒绝所有注册', async () => {
    const validateEmailRule = await loadValidateEmailRule({
      email_mode: 'whitelist',
      email_whitelist: '[ 坏掉的 json',
    });
    expect(await validateEmailRule('someone@qq.com')).toEqual({
      allowed: false,
      reason: '该邮箱域名不在允许注册的白名单中',
    });
  });

  it('未知 mode 走兜底放行', async () => {
    const validateEmailRule = await loadValidateEmailRule({ email_mode: 'both' });
    expect(await validateEmailRule('someone@qq.com')).toEqual({ allowed: true });
  });
});
