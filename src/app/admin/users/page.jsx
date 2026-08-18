'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Shield, Ban, CheckCircle, Coins, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // 积分拨付/扣减 Modal 状态
  const [pointsModalUser, setPointsModalUser] = useState(null);
  const [pointsDelta, setPointsDelta] = useState('5');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingPoints, setSubmittingPoints] = useState(false);

  const fetchUsers = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: '10',
        q: query,
        role: roleFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('获取用户列表失败');
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleAction = async (userId, action, payload = {}) => {
    try {
      setMsg({ type: '', text: '' });
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失败');

      setMsg({ type: 'success', text: data.message });
      fetchUsers(pagination.page);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleAdjustPointsSubmit = async (e) => {
    e.preventDefault();
    if (!pointsModalUser) return;
    setSubmittingPoints(true);
    await handleAction(pointsModalUser.id, 'adjust_points', {
      pointsDelta: parseInt(pointsDelta || '0'),
      reason: adjustReason,
    });
    setSubmittingPoints(false);
    setPointsModalUser(null);
  };

  return (
    <div className="space-y-4">
      {/* 提示条 */}
      {msg.text && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            msg.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ type: '', text: '' })} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 搜索与筛选工具栏 */}
      <div className="p-4 bg-card border border-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索邮箱或昵称..."
            className="w-full pl-9 pr-3 py-1.5 bg-bg border border-border rounded-xl text-xs text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-light"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg border border-border rounded-xl text-xs text-text cursor-pointer focus:outline-none"
          >
            <option value="ALL">所有角色</option>
            <option value="USER">普通用户 (USER)</option>
            <option value="ADMIN">管理员 (ADMIN)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-bg border border-border rounded-xl text-xs text-text cursor-pointer focus:outline-none"
          >
            <option value="ALL">所有状态</option>
            <option value="ACTIVE">正常 (ACTIVE)</option>
            <option value="BANNED">已冻结 (BANNED)</option>
          </select>
        </div>
      </div>

      {/* 用户表格 */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-primary/40 text-text-tertiary">
                <th className="py-3 px-4 font-semibold">用户</th>
                <th className="py-3 px-4 font-semibold">角色</th>
                <th className="py-3 px-4 font-semibold">状态</th>
                <th className="py-3 px-4 font-semibold">积分</th>
                <th className="py-3 px-4 font-semibold">连签天数</th>
                <th className="py-3 px-4 font-semibold">注册日期</th>
                <th className="py-3 px-4 font-semibold text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-tertiary">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                    加载用户数据中...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-tertiary">
                    未找到匹配的用户记录
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg-primary/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                          style={{ background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))' }}
                        >
                          {u.nickname.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-text">{u.nickname}</div>
                          <div className="text-[11px] text-text-tertiary">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-bg-primary text-text-secondary border border-border'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? '正常' : '已冻结'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-amber-500">{u.points}</td>
                    <td className="py-3 px-4 text-text-secondary">{u.continuousCheckIn} 天</td>
                    <td className="py-3 px-4 text-text-tertiary">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 调整积分 */}
                        <button
                          onClick={() => { setPointsModalUser(u); setPointsDelta('5'); setAdjustReason(''); }}
                          className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-medium cursor-pointer transition-colors flex items-center gap-1"
                          title="手动调整积分"
                        >
                          <Coins className="w-3 h-3" /> 积分
                        </button>

                        {/* 角色设为/降级 */}
                        <button
                          onClick={() => handleAction(u.id, 'update_role', { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                          className="px-2 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-medium cursor-pointer transition-colors flex items-center gap-1"
                          title={u.role === 'ADMIN' ? '降级为 USER' : '提升为 ADMIN'}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role === 'ADMIN' ? '设为USER' : '设为ADMIN'}
                        </button>

                        {/* 冻结 / 解封 */}
                        <button
                          onClick={() => handleAction(u.id, 'update_status', { status: u.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE' })}
                          className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {u.status === 'ACTIVE' ? '冻结' : '解封'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页导航 */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <div>
            共 <span className="font-bold text-text">{pagination.total}</span> 条记录，页码 {pagination.page} / {pagination.totalPages}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchUsers(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-border bg-card text-text disabled:opacity-40 cursor-pointer hover:bg-bg-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchUsers(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-border bg-card text-text disabled:opacity-40 cursor-pointer hover:bg-bg-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 手动调整积分 Modal */}
      {pointsModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-up">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setPointsModalUser(null)}
              className="absolute top-4 right-4 text-text-tertiary hover:text-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-text mb-1">手动调整用户积分</h3>
            <p className="text-xs text-text-secondary mb-4">
              目标用户：<span className="font-semibold text-text">{pointsModalUser.nickname}</span> ({pointsModalUser.email})
            </p>

            <form onSubmit={handleAdjustPointsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  积分变动数值 (正数为增加，负数为扣减)
                </label>
                <input
                  type="number"
                  required
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                  placeholder="例如: 10 或 -5"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none focus:border-border-light"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">变动原因 / 备注</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="管理员手动补发积分"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs text-text focus:outline-none focus:border-border-light"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPointsModalUser(null)}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs text-text-secondary hover:bg-bg-primary cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submittingPoints}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-medium cursor-pointer hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {submittingPoints ? '处理中...' : '确认调账'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
