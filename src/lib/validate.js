import { z } from 'zod';

/**
 * 取出 ZodError 的校验问题列表。
 * zod v4 只提供 `issues`，v3 的 `errors` 别名已移除，直接访问会得到 undefined。
 */
export function getIssues(error) {
  return error?.issues ?? error?.errors ?? [];
}

/**
 * 校验请求体
 * @param {Request} req - Next.js 请求对象
 * @param {z.ZodSchema} schema - Zod schema
 * @returns {Promise<{success: true, data: any} | {success: false, error: string, status: number}>}
 */
export async function validateBody(req, schema) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = getIssues(result.error).map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return {
        success: false,
        error: '输入数据格式错误',
        details: errors,
        status: 400,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: '请求体 JSON 格式错误',
        status: 400,
      };
    }

    return {
      success: false,
      error: '无法解析请求数据',
      status: 400,
    };
  }
}

// ============ Auth Schemas ============

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255, '邮箱长度不能超过 255 个字符'),
  password: z.string().min(6, '密码长度至少 6 位').max(128, '密码长度不能超过 128 个字符'),
  nickname: z.string().max(50, '昵称长度不能超过 50 个字符').optional(),
  // 未开启邮箱验证时前端会提交空字符串，视作未填写，避免误判为格式错误
  code: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().length(6, '验证码必须是 6 位数字').regex(/^\d+$/, '验证码只能包含数字').optional()
  ),
});

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255, '邮箱长度不能超过 255 个字符'),
  password: z.string().max(128, '密码长度不能超过 128 个字符'),
});

// ============ Admin Schemas ============

export const adminUserPatchSchema = z.object({
  userId: z.string().uuid('用户 ID 格式不正确'),
  action: z.enum(['update_role', 'update_status', 'adjust_points'], {
    error: '操作类型必须是 update_role、update_status 或 adjust_points',
  }),
  role: z
    .enum(['USER', 'ADMIN'], {
      error: '角色必须是 USER 或 ADMIN',
    })
    .optional(),
  status: z
    .enum(['ACTIVE', 'BANNED'], {
      error: '状态必须是 ACTIVE 或 BANNED',
    })
    .optional(),
  pointsDelta: z.number().int('积分变动必须是整数').optional(),
  reason: z.string().max(200, '原因长度不能超过 200 个字符').optional(),
});

export const checkinConfigSchema = z
  .object({
    mode: z.enum(['A', 'B', 'C'], { error: 'mode 必须是 A、B 或 C' }),
    capped: z.object({
      basePoints: z.number().int('basePoints 必须是整数').nonnegative('basePoints 不能为负数'),
      bonusRules: z.array(
        z.object({
          minDays: z.number().int().nonnegative(),
          maxDays: z.number().int().nonnegative().optional(),
          extraPoints: z.number().int().nonnegative(),
        })
      ),
      dailyCap: z.number().int().nonnegative(),
      milestones: z.array(
        z.object({
          day: z.number().int().positive(),
          bonus: z.number().int().nonnegative(),
        })
      ),
    }),
    tiered: z.object({
      dailyTiers: z.array(
        z.object({
          minDays: z.number().int().positive(),
          maxDays: z.number().int().positive(),
          dailyPoints: z.number().int().nonnegative(),
        })
      ),
      milestones: z.array(
        z.object({
          day: z.number().int().positive(),
          bonus: z.number().int().nonnegative(),
        })
      ),
    }),
    daily: z.object({
      days: z.array(z.number().int().nonnegative()),
    }),
    cycleLength: z.number().int().positive().max(365, 'cycleLength 不能超过 365'),
    cycleReset: z.boolean(),
    absoluteDailyCap: z.number().int().nonnegative().max(10000, 'absoluteDailyCap 不能超过 10000'),
  })
  .superRefine((config, ctx) => {
    if (config.daily.days.length !== config.cycleLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['daily', 'days'],
        message: 'daily.days 长度必须等于 cycleLength',
      });
    }
  });

/**
 * 邮箱白/黑名单以 JSON 文本形式存进 systemSetting。
 * 若不校验就入库，settings.js 读取时 JSON.parse 失败会被 catch 静默吞掉、退化成空表，
 * 白名单模式下的后果是"任何人都注册不了"且界面上没有任何异常提示。这里把坏配置挡在保存时。
 * @param {string} label - 提示里用的字段中文名
 */
const domainListJson = (label) =>
  z
    .string()
    .optional()
    .refine(
      (value) => {
        if (value === undefined) return true;
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string');
        } catch {
          return false;
        }
      },
      { error: `${label}必须是指定模式的字符串数组 JSON 文本，例如 ["@qq.com"]` }
    );

export const adminSettingsSchema = z.object({
  site_title: z.string().max(100, '站点标题长度不能超过 100 个字符').optional(),
  site_description: z.string().max(500, '站点描述长度不能超过 500 个字符').optional(),
  site_keywords: z.string().max(500, '站点关键词长度不能超过 500 个字符').optional(),
  allow_registration: z
    .enum(['true', 'false'], {
      error: 'allow_registration 必须是 "true" 或 "false"',
    })
    .optional(),
  email_verification: z
    .enum(['true', 'false'], {
      error: 'email_verification 必须是 "true" 或 "false"',
    })
    .optional(),
  email_mode: z
    .enum(['none', 'whitelist', 'blacklist'], {
      error: 'email_mode 必须是 none、whitelist 或 blacklist',
    })
    .optional(),
  email_whitelist: domainListJson('邮箱白名单'),
  email_blacklist: domainListJson('邮箱黑名单'),
  smtp_config: z.string().optional(),
  checkin_config: z.string().optional(),
});

// ============ Other Schemas ============

export const sendCodeSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255, '邮箱长度不能超过 255 个字符'),
});
