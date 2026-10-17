import { describe, expect, it } from 'vitest';
import {
  getIssues,
  registerSchema,
  adminUserPatchSchema,
  adminSettingsSchema,
  checkinConfigSchema,
  sendCodeSchema,
} from '../validate';

const firstMessage = (result, field) =>
  getIssues(result.error).find((issue) => issue.path.join('.') === field)?.message;

describe('registerSchema', () => {
  it('邮箱与合法密码通过', () => {
    expect(registerSchema.safeParse({ email: 'a@b.com', password: '123456' }).success).toBe(true);
  });

  it('密码少于 6 位被拒', () => {
    const r = registerSchema.safeParse({ email: 'a@b.com', password: '12345' });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'password')).toBe('密码长度至少 6 位');
  });

  it('邮箱格式错误被拒', () => {
    const r = registerSchema.safeParse({ email: 'not-an-email', password: '123456' });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'email')).toBe('邮箱格式不正确');
  });

  // 回归点：未开启邮箱验证时前端会提交空字符串。ff89dad 之前空串被当作待校验的
  // 验证码，导致正常注册被拒；空串必须被视为"未填写"。
  it('验证码为空字符串时视为未填写，仍然通过', () => {
    expect(
      registerSchema.safeParse({ email: 'a@b.com', password: '123456', code: '' }).success
    ).toBe(true);
  });

  it('验证码位数不足被拒', () => {
    const r = registerSchema.safeParse({ email: 'a@b.com', password: '123456', code: '12345' });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'code')).toBe('验证码必须是 6 位数字');
  });

  it('验证码含非数字被拒', () => {
    const r = registerSchema.safeParse({ email: 'a@b.com', password: '123456', code: '12ab34' });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'code')).toBe('验证码只能包含数字');
  });
});

describe('sendCodeSchema', () => {
  it('只接受合法邮箱', () => {
    expect(sendCodeSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(sendCodeSchema.safeParse({ email: 'a@b' }).success).toBe(false);
  });
});

describe('adminUserPatchSchema', () => {
  it('action 不在枚举内时给出指定提示', () => {
    const r = adminUserPatchSchema.safeParse({ userId: 'x', action: 'delete_user' });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'action')).toContain('操作类型必须是');
  });

  it('合法的角色变更通过', () => {
    expect(
      adminUserPatchSchema.safeParse({
        userId: '2f1e6b6a-8f2c-4d3e-9a1b-5c7d9e1f2a3b',
        action: 'update_role',
        role: 'ADMIN',
      }).success
    ).toBe(true);
  });
});

describe('adminSettingsSchema', () => {
  // 回归点：这些枚举原先用 zod v3 的 errorMap 定制提示，在 v4 下会被静默忽略、
  // 回落到英文原文；改用 error 后自定义提示必须真的出现在 issues 里。
  it('枚举值非法时返回中文提示而非英文原文', () => {
    const r = adminSettingsSchema.safeParse({ email_mode: 'greylist' });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'email_mode')).toBe('email_mode 必须是 none、whitelist 或 blacklist');
  });

  it('合法的设置项通过', () => {
    expect(
      adminSettingsSchema.safeParse({
        site_title: '极粹工具',
        email_mode: 'whitelist',
        allow_registration: 'true',
      }).success
    ).toBe(true);
  });

  // 隐患封堵：坏 JSON 的白名单一旦入库，读取侧 settings.js 会把解析异常 catch 掉、
  // 退化成空白名单，白名单模式下等于"谁都注册不了"且没有任何提示。
  // 所以必须在保存这一关就挡住。
  it('白名单必须解析为字符串数组', () => {
    expect(
      adminSettingsSchema.safeParse({ email_whitelist: '["@qq.com", "@163.com"]' }).success
    ).toBe(true);
    expect(adminSettingsSchema.safeParse({ email_whitelist: '[]' }).success).toBe(true);
  });

  it('白名单是坏 JSON、对象、非字符串元素或裸文本时一律拒绝', () => {
    for (const bad of ['[ 坏掉的 json', '{"a":1}', '[1,2]', '@qq.com', 'null']) {
      const r = adminSettingsSchema.safeParse({ email_whitelist: bad });
      expect(r.success, bad).toBe(false);
    }
  });

  it('未提交白名单字段时视为可选、不报错', () => {
    expect(adminSettingsSchema.safeParse({ site_title: '极粹工具' }).success).toBe(true);
  });
});

describe('checkinConfigSchema', () => {
  const base = {
    mode: 'A',
    capped: { basePoints: 1, bonusRules: [], dailyCap: 10, milestones: [] },
    tiered: { dailyTiers: [], milestones: [] },
    daily: { days: [1, 2, 3] },
    cycleLength: 3,
    cycleReset: true,
    absoluteDailyCap: 100,
  };

  it('days 长度与周期一致时通过', () => {
    expect(checkinConfigSchema.safeParse(base).success).toBe(true);
  });

  // 回归点：superRefine 的跨字段约束，缺了它两种模式配置会静默不一致。
  it('days 长度与 cycleLength 不符时拒绝', () => {
    const r = checkinConfigSchema.safeParse({ ...base, daily: { days: [1, 2] } });
    expect(r.success).toBe(false);
    expect(firstMessage(r, 'daily.days')).toBe('daily.days 长度必须等于 cycleLength');
  });

  it('负积分被拒', () => {
    const r = checkinConfigSchema.safeParse({
      ...base,
      capped: { ...base.capped, basePoints: -1 },
    });
    expect(r.success).toBe(false);
  });
});
