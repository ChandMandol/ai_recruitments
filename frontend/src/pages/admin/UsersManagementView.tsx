import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Unlock,
  User,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import type { User as UserType } from '../../types/auth';

export const UsersManagementView: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CANDIDATE' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setAlertMessage(null);
    try {
      const data = await authApi.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setAlertMessage({
        text: err.response?.data?.detail || 'Failed to fetch users list. Please refresh.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Block / Unblock User
  const handleToggleStatus = async (targetUser: UserType) => {
    if (targetUser.id === currentAdmin?.id) {
      alert('You cannot block your own admin account.');
      return;
    }

    const newStatus = !targetUser.is_active;
    const confirmMsg = newStatus
      ? `Are you sure you want to unblock "${targetUser.full_name}"? They will regain login access.`
      : `Are you sure you want to block "${targetUser.full_name}"? Their access will be immediately revoked and they will be shown a blocked account message.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser.id);
    setAlertMessage(null);

    try {
      const updated = await authApi.updateUserStatus(targetUser.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAlertMessage({
        text: newStatus
          ? `Account "${targetUser.email}" has been unblocked and restored.`
          : `Account "${targetUser.email}" has been blocked. They cannot log in until unblocked.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      setAlertMessage({
        text: err.response?.data?.detail || 'Failed to change user status. Please try again.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Permanent Delete User
  const handleDeleteUser = async (targetUser: UserType) => {
    if (targetUser.id === currentAdmin?.id) {
      alert('You cannot delete your own admin account.');
      return;
    }

    const confirmMsg = `⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE user "${targetUser.full_name}" (${targetUser.email})?\n\nThis will permanently delete:\n- Their candidate profile & uploaded resumes\n- All job applications and screening scores\n- All adaptive AI assessment records and test questions\n- All scheduled interviews and evaluation reports\n\nThis action CANNOT be undone!`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser.id);
    setAlertMessage(null);

    try {
      const res = await authApi.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setAlertMessage({
        text: res.message || `User "${targetUser.email}" and all associated data have been deleted.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setAlertMessage({
        text: err.response?.data?.detail || 'Failed to delete user. Please try again.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Role Change (Super Admin / Admin capability)
  const handleRoleChange = async (targetUser: UserType, newRole: 'CANDIDATE' | 'ADMIN' | 'SUPER_ADMIN') => {
    if (targetUser.id === currentAdmin?.id) {
      alert('You cannot change your own admin role.');
      return;
    }

    if (targetUser.role === newRole) return;

    const confirmMsg = `Are you sure you want to change the role of "${targetUser.full_name}" (${targetUser.email}) from ${targetUser.role} to ${newRole}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser.id);
    setAlertMessage(null);

    try {
      const updated = await authApi.updateUserRole(targetUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAlertMessage({
        text: `Role for "${targetUser.email}" has been successfully changed to "${newRole}".`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to change user role:', err);
      setAlertMessage({
        text: err.response?.data?.detail || 'Failed to update user role. Please try again.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'ADMIN'
        ? u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
        : u.role === 'CANDIDATE';

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? u.is_active
        : !u.is_active;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalCandidates = users.filter((u) => u.role === 'CANDIDATE').length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const totalBlocked = users.filter((u) => !u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                User Management & Access Control
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage all registered candidate and admin accounts. Block unauthorized users or permanently remove data.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 border border-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{users.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Registered</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{totalCandidates}</div>
            <div className="text-xs text-slate-500 font-medium">Candidates</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{totalAdmins}</div>
            <div className="text-xs text-slate-500 font-medium">Administrators</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-rose-600">{totalBlocked}</div>
            <div className="text-xs text-slate-500 font-medium">Blocked Accounts</div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by full name or email address..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <span className="text-[11px] text-slate-400 font-bold px-1.5">Role:</span>
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('CANDIDATE')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'CANDIDATE' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'ADMIN' ? 'bg-white text-purple-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <span className="text-[11px] text-slate-400 font-bold px-1.5">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('BLOCKED')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'BLOCKED' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Blocked
            </button>
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Loading user registry...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No users found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try clearing your search query or filters.' : 'No users currently match the selected criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((targetUser) => {
                  const isCurrentAdmin = targetUser.id === currentAdmin?.id;
                  const isBusy = actionLoadingId === targetUser.id;

                  return (
                    <tr
                      key={targetUser.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !targetUser.is_active ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* User Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-xs ${
                              targetUser.role === 'CANDIDATE'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {targetUser.full_name.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{targetUser.full_name}</span>
                              {isCurrentAdmin && (
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{targetUser.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role with Super Admin Role Switcher */}
                      <td className="py-4 px-4">
                        {isCurrentAdmin ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              targetUser.role === 'SUPER_ADMIN'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{targetUser.role}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={targetUser.role}
                              disabled={isBusy}
                              onChange={(e) =>
                                handleRoleChange(
                                  targetUser,
                                  e.target.value as 'CANDIDATE' | 'ADMIN' | 'SUPER_ADMIN'
                                )
                              }
                              className={`text-[11px] font-bold py-1 px-2.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 transition-all ${
                                targetUser.role === 'CANDIDATE'
                                  ? 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200 focus:ring-indigo-400'
                                  : targetUser.role === 'SUPER_ADMIN'
                                  ? 'bg-rose-50/80 hover:bg-rose-100 text-rose-700 border-rose-200 focus:ring-rose-400'
                                  : 'bg-purple-50/80 hover:bg-purple-100 text-purple-700 border-purple-200 focus:ring-purple-400'
                              } disabled:opacity-50`}
                              title="Super Admin: Click to change role between Candidate, Admin, or Super Admin"
                            >
                              <option value="CANDIDATE">Candidate</option>
                              <option value="ADMIN">Admin / Recruiter</option>
                              <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {targetUser.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <Lock className="w-3 h-3 text-rose-600" />
                            <span>Blocked</span>
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(targetUser.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        {isCurrentAdmin ? (
                          <span className="text-[11px] text-slate-400 italic">Current Session</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Block / Unblock Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(targetUser)}
                              disabled={isBusy}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                targetUser.is_active
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              } disabled:opacity-50`}
                              title={targetUser.is_active ? 'Block account from logging in' : 'Unblock account'}
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : targetUser.is_active ? (
                                <>
                                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Block</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Unblock</span>
                                </>
                              )}
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(targetUser)}
                              disabled={isBusy}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                              title="Permanently delete user and all related records"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
