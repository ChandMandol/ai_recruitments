import React, { useState } from 'react';
import {
  Bell,
  Lock,
  Save,
  Settings,
} from 'lucide-react';
import { Alert } from '../../components/Alert';

export const CandidateSettings: React.FC = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setAlert({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setAlert({ type: 'success', text: 'Password and preferences updated successfully!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>Candidate Account Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your notification alerts, security credentials, and login settings.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.text}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
          <Bell className="w-4 h-4 text-indigo-600" />
          <span>Email & Interview Notifications</span>
        </h3>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                AI Screening Updates
              </span>
              <span className="text-xs text-slate-400">
                Receive email alerts as soon as Google Gemini computes your CV match score.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Interview Reminder Alerts
              </span>
              <span className="text-xs text-slate-400">
                Get notified 30 minutes before your Gemini Live voice & video session starts.
              </span>
            </div>
            <input
              type="checkbox"
              checked={interviewReminders}
              onChange={(e) => setInterviewReminders(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* Change Password Form */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <Lock className="w-4 h-4 text-indigo-600" />
          <span>Change Password</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Update Credentials</span>
          </button>
        </div>
      </form>
    </div>
  );
};
