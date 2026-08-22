'use client';

import { useState, useEffect } from 'react';
import { Globe, ShieldCheck, Mail, Flame, Save, Send, Loader2, CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('seo'); // 'seo' | 'auth' | 'smtp' | 'checkin'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // 表单状态
  const [form, setForm] = useState({
    site_title: '',
    site_description: '',
    site_keywords: '',
    allow_registration: 'true',
    email_verification: 'false',
    email_mode: 'none',
    email_whitelist: [],
    email_blacklist: [],
    smtp_config: {
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      fromName: 'ToolBox',
      fromEmail: '',
    },
    checkin_config: {
      basePoints: 3,
      dailyCap: 7,
      monthFullBonus: 20,
      bonusRules: [
        { minDays: 3, maxDays: 6, extraPoints: 2 },
        { minDays: 7, maxDays: 99, extraPoints: 4 },
      ],
    },
  });

  // 测试邮件状态
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);

  // 白名单/黑名单输入暂存
  const [newWhiteRule, setNewWhiteRule] = useState('');
  const [newBlackRule, setNewBlackRule] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error('读取系统设置失败');
        const data = await res.json();
        const s = data.settings || {};

        let smtpObj = {};
        try { smtpObj = JSON.parse(s.smtp_config || '{}'); } catch {}

        let checkinObj = {};
        try { checkinObj = JSON.parse(s.checkin_config || '{}'); } catch {}

        let whiteArr = [];
        try { whiteArr = JSON.parse(s.email_whitelist || '[]'); } catch {}

        let blackArr = [];
        try { blackArr = JSON.parse(s.email_blacklist || '[]'); } catch {}

        setForm({
          site_title: s.site_title || '',
          site_description: s.site_description || '',
          site_keywords: s.site_keywords || '',
          allow_registration: s.allow_registration ?? 'true',
          email_verification: s.email_verification ?? 'false',
          email_mode: s.email_mode || 'none',
          email_whitelist: whiteArr,
          email_blacklist: blackArr,
          smtp_config: {
            host: smtpObj.host || '',
            port: smtpObj.port || 465,
            secure: smtpObj.secure ?? true,
            user: smtpObj.user || '',
            pass: smtpObj.pass || '',
            fromName: smtpObj.fromName || 'ToolBox',
            fromEmail: smtpObj.fromEmail || '',
          },
          checkin_config: {
            basePoints: checkinObj.basePoints ?? 3,
            dailyCap: checkinObj.dailyCap ?? 7,
            monthFullBonus: checkinObj.monthFullBonus ?? 20,
            bonusRules: checkinObj.bonusRules || [
              { minDays: 3, maxDays: 6, extraPoints: 2 },
              { minDays: 7, maxDays: 99, extraPoints: 4 },
            ],
          },
        });
      } catch (err) {
        setMsg({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setMsg({ type: '', text: '' });

      const payload = {
        site_title: form.site_title,
        site_description: form.site_description,
        site_keywords: form.site_keywords,
        allow_registration: form.allow_registration,
        email_verification: form.email_verification,
        email_mode: form.email_mode,
        email_whitelist: JSON.stringify(form.email_whitelist),
        email_blacklist: JSON.stringify(form.email_blacklist),
        smtp_config: JSON.stringify(form.smtp_config),
        checkin_config: JSON.stringify(form.checkin_config),
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存设置失败');

      setMsg({ type: 'success', text: '🎉 系统设置保存成功！' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      setMsg({ type: 'error', text: '请提供接收测试邮件的邮箱地址' });
      return;
    }

    try {
      setTestingSmtp(true);
      setMsg({ type: '', text: '' });

      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: form.smtp_config,
          targetEmail: testEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '测试发送失败');

      setMsg({ type: 'success', text: `✅ ${data.message}` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-purple-500" />
        <span className="text-sm">加载配置数据中...</span>
      </div>
    );
  }

  const subTabs = [
    { id: 'seo', name: 'SEO 元数据设置', icon: Globe },
    { id: 'auth', name: '注册与邮箱策略', icon: ShieldCheck },
    { id: 'smtp', name: 'SMTP 发信配置', icon: Mail },
    { id: 'checkin', name: '签到与稀缺积分规则', icon: Flame },
  ];

  return (
    <div className="space-y-6">
      {/* 提示栏 */}
      {msg.text && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
          }`}
        >
          {msg.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 设置分类页签 */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                active
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  : 'text-text-secondary hover:text-text hover:bg-bg-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* 页签内容 */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
        {/* 1. SEO 设置 */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">站点 Title 标题</label>
              <input
                type="text"
                value={form.site_title}
                onChange={(e) => setForm({ ...form, site_title: e.target.value })}
                placeholder="ToolBox · 在线工具箱"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none focus:border-border-light"
              />
              <p className="text-[11px] text-text-tertiary mt-1">显示在浏览器标签页与搜索引擎搜索结果首行。</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Meta Description (描述)</label>
              <textarea
                rows={3}
                value={form.site_description}
                onChange={(e) => setForm({ ...form, site_description: e.target.value })}
                placeholder="免费在线工具集合，所有工具在浏览器本地运行，不上传任何数据。"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none focus:border-border-light"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Meta Keywords (关键词)</label>
              <input
                type="text"
                value={form.site_keywords}
                onChange={(e) => setForm({ ...form, site_keywords: e.target.value })}
                placeholder="在线工具, 小说排版, HTML编辑器, Markdown编辑器"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none focus:border-border-light"
              />
              <p className="text-[11px] text-text-tertiary mt-1">多个关键词用英文逗号分隔。</p>
            </div>
          </div>
        )}

        {/* 2. 注册与邮箱策略 */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-bg-primary border border-border rounded-xl">
              <div>
                <div className="font-bold text-xs text-text">开放新用户注册</div>
                <div className="text-[11px] text-text-tertiary">关闭后，前台将不允许新用户注册账号。</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allow_registration === 'true'}
                  onChange={(e) => setForm({ ...form, allow_registration: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-bg-primary border border-border rounded-xl">
              <div>
                <div className="font-bold text-xs text-text">注册需邮箱验证码</div>
                <div className="text-[11px] text-text-tertiary">开启后，新用户注册时需通过邮箱验证码验证身份。若 SMTP 未配置则自动降级跳过。</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.email_verification === 'true'}
                  onChange={(e) => setForm({ ...form, email_verification: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-2">邮箱域名校验模式</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'none', title: '不限制', desc: '允许所有合法的邮箱注册' },
                  { id: 'whitelist', title: '白名单模式', desc: '仅允许列表中白名单域名注册' },
                  { id: 'blacklist', title: '黑名单模式', desc: '拦截列表中黑名单域名注册' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setForm({ ...form, email_mode: mode.id })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      form.email_mode === mode.id
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                        : 'border-border bg-bg text-text-secondary hover:border-border-light'
                    }`}
                  >
                    <div className="text-xs">{mode.title}</div>
                    <div className="text-[10px] text-text-tertiary font-normal mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 白名单规则 */}
            {form.email_mode === 'whitelist' && (
              <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-text">白名单规则列表</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWhiteRule}
                    onChange={(e) => setNewWhiteRule(e.target.value)}
                    placeholder="例如: @gmail.com 或 *@qq.com"
                    className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newWhiteRule.trim()) {
                        setForm({ ...form, email_whitelist: [...form.email_whitelist, newWhiteRule.trim()] });
                        setNewWhiteRule('');
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加规则
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {form.email_whitelist.map((rule, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-card border border-border rounded-lg text-xs font-medium text-text flex items-center gap-1.5"
                    >
                      {rule}
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            email_whitelist: form.email_whitelist.filter((_, i) => i !== idx),
                          });
                        }}
                        className="text-text-tertiary hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 黑名单规则 */}
            {form.email_mode === 'blacklist' && (
              <div className="p-4 bg-bg-primary border border-border rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-text">黑名单禁用规则列表</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlackRule}
                    onChange={(e) => setNewBlackRule(e.target.value)}
                    placeholder="例如: *@tempmail.com 或 *@dispostable.com"
                    className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newBlackRule.trim()) {
                        setForm({ ...form, email_blacklist: [...form.email_blacklist, newBlackRule.trim()] });
                        setNewBlackRule('');
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加黑名单
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {form.email_blacklist.map((rule, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      {rule}
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            email_blacklist: form.email_blacklist.filter((_, i) => i !== idx),
                          });
                        }}
                        className="text-rose-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. SMTP 配置 */}
        {activeTab === 'smtp' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">SMTP 服务器 Host</label>
                <input
                  type="text"
                  value={form.smtp_config.host}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smtp_config: { ...form.smtp_config, host: e.target.value },
                    })
                  }
                  placeholder="smtp.qq.com 或 smtp.163.com"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">端口 Port</label>
                <input
                  type="number"
                  value={form.smtp_config.port}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smtp_config: { ...form.smtp_config, port: parseInt(e.target.value || '465') },
                    })
                  }
                  placeholder="465 或 587"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">账号 User / 邮箱</label>
                <input
                  type="text"
                  value={form.smtp_config.user}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smtp_config: { ...form.smtp_config, user: e.target.value },
                    })
                  }
                  placeholder="your-email@qq.com"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">授权码 / Pass</label>
                <input
                  type="password"
                  value={form.smtp_config.pass}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smtp_config: { ...form.smtp_config, pass: e.target.value },
                    })
                  }
                  placeholder="应用独立授权码"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">发件人名称</label>
                <input
                  type="text"
                  value={form.smtp_config.fromName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smtp_config: { ...form.smtp_config, fromName: e.target.value },
                    })
                  }
                  placeholder="ToolBox 官方团队"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">发件人邮箱 Address</label>
                <input
                  type="email"
                  value={form.smtp_config.fromEmail}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smtp_config: { ...form.smtp_config, fromEmail: e.target.value },
                    })
                  }
                  placeholder="noreply@domain.com (留空同账号)"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>
            </div>

            {/* 测试发送区域 */}
            <div className="p-4 bg-bg-primary border border-border rounded-xl mt-4">
              <h4 className="text-xs font-bold text-text mb-2">测试发信服务</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="输入接收测试邮件的邮箱"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{testingSmtp ? '发送中...' : '发送测试邮件'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. 签到积分规则 */}
        {activeTab === 'checkin' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl">
              💡 提醒：系统积分定位为稀缺资源。系统将强制防重签和限制上限。
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">每日基础签到积分</label>
                <input
                  type="number"
                  value={form.checkin_config.basePoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      checkin_config: { ...form.checkin_config, basePoints: parseInt(e.target.value || '3') },
                    })
                  }
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">单日获得积分上限 (Daily Cap)</label>
                <input
                  type="number"
                  value={form.checkin_config.dailyCap}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      checkin_config: { ...form.checkin_config, dailyCap: parseInt(e.target.value || '7') },
                    })
                  }
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">整月全勤奖励 (月末发放，0 为关闭)</label>
                <input
                  type="number"
                  value={form.checkin_config.monthFullBonus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      checkin_config: { ...form.checkin_config, monthFullBonus: parseInt(e.target.value || '0') },
                    })
                  }
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 保存按钮 */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? '正在保存...' : '保存系统设置'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
