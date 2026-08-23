import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSystemSettings, updateSystemSettings } from '@/lib/settings';
import { validateBody, adminSettingsSchema, checkinConfigSchema } from '@/lib/validate';

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  const settings = await getSystemSettings(true);

  // 对 SMTP 密码进行脱敏处理
  const maskedSettings = { ...settings };
  if (maskedSettings.smtp_config) {
    try {
      const smtpConfig = JSON.parse(maskedSettings.smtp_config);
      if (smtpConfig.pass) {
        // 显示前4位 + ****
        const maskedPass = smtpConfig.pass.length > 4
          ? smtpConfig.pass.substring(0, 4) + '****'
          : '****';
        smtpConfig.pass = maskedPass;
        maskedSettings.smtp_config = JSON.stringify(smtpConfig);
      }
    } catch (e) {
      // 解析失败则保持原样
    }
  }

  return NextResponse.json({ settings: maskedSettings });
}

export async function POST(req) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  try {
    const validation = await validateBody(req, adminSettingsSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: validation.status }
      );
    }
    const body = { ...validation.data };

    if (body.checkin_config) {
      let checkinConfig;
      try {
        checkinConfig = JSON.parse(body.checkin_config);
      } catch {
        return NextResponse.json({
          error: '签到配置格式错误',
          details: [{ field: 'checkin_config', message: '必须是合法 JSON' }],
        }, { status: 400 });
      }

      const checkinValidation = checkinConfigSchema.safeParse(checkinConfig);
      if (!checkinValidation.success) {
        return NextResponse.json({
          error: '签到配置校验失败',
          details: checkinValidation.error.issues.map((issue) => ({
            field: ['checkin_config', ...issue.path].join('.'),
            message: issue.message,
          })),
        }, { status: 400 });
      }

      body.checkin_config = JSON.stringify(checkinValidation.data);
    }

    // 处理 SMTP 密码：如果提交的是脱敏值，则保留原密码
    if (body.smtp_config) {
      let newSmtpConfig;
      try {
        newSmtpConfig = typeof body.smtp_config === 'string'
          ? JSON.parse(body.smtp_config)
          : body.smtp_config;
      } catch (e) {
        return NextResponse.json({ error: 'SMTP 配置格式错误' }, { status: 400 });
      }

      // 如果密码包含 ****，说明是脱敏值，保留原密码
      if (newSmtpConfig.pass && newSmtpConfig.pass.includes('****')) {
        const currentSettings = await getSystemSettings(true);
        if (currentSettings.smtp_config) {
          try {
            const currentSmtpConfig = JSON.parse(currentSettings.smtp_config);
            newSmtpConfig.pass = currentSmtpConfig.pass;
          } catch (e) {
            // 保留用户提交的值
          }
        }
      }

      body.smtp_config = JSON.stringify(newSmtpConfig);
    }

    const updatedSettings = await updateSystemSettings(body);
    return NextResponse.json({ message: '系统设置保存成功', settings: updatedSettings });
  } catch (error) {
    return NextResponse.json({ error: error.message || '保存设置失败' }, { status: 500 });
  }
}
