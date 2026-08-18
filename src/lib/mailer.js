import nodemailer from 'nodemailer';
import { getSystemSettings } from './settings';

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
    try { smtpObj = JSON.parse(settings.smtp_config || '{}'); } catch { smtpObj = {}; }
  }

  const fromName = smtpObj.fromName || 'ToolBox';
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
      subject: '【ToolBox】SMTP 发信功能测试成功',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10b981;">🎉 SMTP 发信成功！</h2>
          <p>恭喜，ToolBox 在线工具箱的 SMTP 邮件服务已成功配置并联通。</p>
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
