import { z } from 'zod';

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
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      
      return {
        success: false,
        error: '输入数据格式错误',
        details: errors,
        status: 400
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: '请求体 JSON 格式错误',
        status: 400
      };
    }
    
    return {
      success: false,
      error: '无法解析请求数据',
      status: 400
    };
  }
}

// ============ Auth Schemas ============

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255, '邮箱长度不能超过 255 个字符'),
  password: z.string().min(6, '密码长度至少 6 位').max(128, '密码长度不能超过 128 个字符'),
  nickname: z.string().max(50, '昵称长度不能超过 50 个字符').optional(),
  code: z.string().length(6, '验证码必须是 6 位数字').regex(/^\d+$/, '验证码只能包含数字').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255, '邮箱长度不能超过 255 个字符'),
  password: z.string().max(128, '密码长度不能超过 128 个字符'),
});

// ============ Admin Schemas ============

export const adminUserPatchSchema = z.object({
  userId: z.string().uuid('用户 ID 格式不正确'),
  action: z.enum(['update_role', 'update_status', 'adjust_points'], {
    errorMap: () => ({ message: '操作类型必须是 update_role、update_status 或 adjust_points' })
  }),
  role: z.enum(['USER', 'ADMIN'], {
    errorMap: () => ({ message: '角色必须是 USER 或 ADMIN' })
  }).optional(),
  status: z.enum(['ACTIVE', 'BANNED'], {
    errorMap: () => ({ message: '状态必须是 ACTIVE 或 BANNED' })
  }).optional(),
  pointsDelta: z.number().int('积分变动必须是整数').optional(),
  reason: z.string().max(200, '原因长度不能超过 200 个字符').optional(),
});

export const adminSettingsSchema = z.object({
  site_title: z.string().max(100, '站点标题长度不能超过 100 个字符').optional(),
  site_description: z.string().max(500, '站点描述长度不能超过 500 个字符').optional(),
  site_keywords: z.string().max(500, '站点关键词长度不能超过 500 个字符').optional(),
  allow_registration: z.enum(['true', 'false'], {
    errorMap: () => ({ message: 'allow_registration 必须是 "true" 或 "false"' })
  }).optional(),
  email_verification: z.enum(['true', 'false'], {
    errorMap: () => ({ message: 'email_verification 必须是 "true" 或 "false"' })
  }).optional(),
  email_mode: z.enum(['none', 'whitelist', 'blacklist'], {
    errorMap: () => ({ message: 'email_mode 必须是 none、whitelist 或 blacklist' })
  }).optional(),
  email_whitelist: z.string().optional(),
  email_blacklist: z.string().optional(),
  smtp_config: z.string().optional(),
  checkin_config: z.string().optional(),
});

// ============ Other Schemas ============

export const sendCodeSchema = z.object({
  email: z.string().email('邮箱格式不正确').max(255, '邮箱长度不能超过 255 个字符'),
});
