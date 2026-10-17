import nodemailer from 'nodemailer';
import { getSystemSettings } from './settings';

export async function isSmtpConfigured() {
  const settings = await getSystemSettings();
  let config = {};
  try {
    config = JSON.parse(settings.smtp_config || '{}');
  } catch {
    config = {};
  }
  return Boolean(config.host && config.user && config.pass);
}

export async function createTransporter(customConfig = null) {
  let config = customConfig;
  if (!config) {
    const settings = await getSystemSettings();
    try {
      config = JSON.parse(settings.smtp_config || '{}');
    } catch {
      config = {};
    }
  }

  if (!config.host || !config.user || !config.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port) || 465,
    secure: Boolean(config.secure),
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function sendMail({ to, subject, html, text, customConfig = null }) {
  const transporter = await createTransporter(customConfig);
  if (!transporter) {
    throw new Error('SMTP 未配置或配置不完整');
  }

  const settings = customConfig ? {} : await getSystemSettings();
  let smtpObj = customConfig;
  if (!smtpObj) {
    try {
      smtpObj = JSON.parse(settings.smtp_config || '{}');
    } catch {
      smtpObj = {};
    }
  }

  const fromName = smtpObj.fromName || '极粹工具';
  const fromEmail = smtpObj.fromEmail || smtpObj.user;

  return await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function testSmtpConnection(customConfig, targetEmail) {
  const transporter = await createTransporter(customConfig);
  if (!transporter) {
    return { ok: false, message: '请填写完整的 SMTP 服务器、用户名和密码' };
  }

  try {
    await transporter.verify();
    await sendMail({
      to: targetEmail,
      subject: '【极粹工具】SMTP 发信功能测试成功',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10b981;">🎉 SMTP 发信成功！</h2>
          <p>恭喜，极粹工具的 SMTP 邮件服务已成功配置并联通。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">此邮件由系统控制面板自动发出，无需回复。</p>
        </div>
      `,
      customConfig,
    });
    return { ok: true, message: `测试邮件已成功发送至 ${targetEmail}` };
  } catch (error) {
    return { ok: false, message: error.message || 'SMTP 校验失败' };
  }
}

/**
 * 发送验证码邮件
 * @param {string} email - 收件人邮箱
 * @param {string} code - 验证码
 * @param {string} type - 验证码类型：'REGISTER' | 'RESET_PASSWORD'
 */
export async function sendVerificationEmail(email, code, type = 'REGISTER') {
  const subject =
    type === 'RESET_PASSWORD' ? '【极粹工具】密码重置验证码' : '【极粹工具】注册验证码';

  const title = type === 'RESET_PASSWORD' ? '密码重置验证码' : '注册验证码';

  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #10b981; margin-bottom: 8px;">极粹工具 ${title}</h2>
      <p style="color: #666; font-size: 14px;">您正在${type === 'RESET_PASSWORD' ? '重置' : '注册'} 极粹工具 账户，验证码为：</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">${code}</div>
      <p style="color: #888; font-size: 13px;">验证码 15 分钟内有效，请勿泄露给他人。若非本人操作，请忽略此邮件。</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #aaa;">此邮件由系统自动发出，无需回复。</p>
    </div>
  `;

  await sendMail({
    to: email,
    subject,
    html,
  });
}
