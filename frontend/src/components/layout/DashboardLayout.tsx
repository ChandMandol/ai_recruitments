import React, { useState, useRef, useEffect } from 'react';
import {
  Award,
  Bell,
  Bot,
  CheckCheck,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User as UserIcon,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/notifications';
import type { NotificationItem } from '../../api/notifications';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  portalTitle: string;
  portalSubtitle: string;
  badgeLabel: string;
  badgeColor: 'purple' | 'indigo';
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  navItems,
  activeTab,
  onTabChange,
  portalTitle,
  portalSubtitle,
  badgeLabel,
  badgeColor,
  children,
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch in-app notifications
  const loadNotifications = async () => {
    try {
      setIsLoadingNotifs(true);
      const res = await notificationsApi.getMyNotifications(false, 20);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking read:', err);
      }
    }
    setNotificationsOpen(false);

    if (notif.link_url) {
      if (notif.link_url.startsWith('/interview/live')) {
        window.location.href = notif.link_url;
        return;
      }
      const url = notif.link_url.toLowerCase();
      if (url.includes('interview')) {
        onTabChange('interviews');
      } else if (url.includes('application') || url.includes('applicant')) {
        onTabChange(user?.role === 'CANDIDATE' ? 'applications' : 'applicants');
      } else if (url.includes('result') || url.includes('evaluation')) {
        onTabChange(user?.role === 'CANDIDATE' ? 'results' : 'evaluations');
      } else if (url.includes('job')) {
        onTabChange(user?.role === 'CANDIDATE' ? 'browse' : 'jobs');
      }
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay}d ago`;
      return d.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_REMINDER':
        return <Video className="w-4 h-4 text-emerald-600" />;
      case 'RESULT_PUBLISHED':
        return <Award className="w-4 h-4 text-indigo-600" />;
      case 'NEW_APPLICATION':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case 'APPLICATION_STATUS_UPDATED':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  const badgeStyles = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };

  const activeBgStyles = {
    purple: 'bg-purple-50 text-purple-700 border-purple-600 font-semibold',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-600 font-semibold',
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent block leading-tight">
                Recruitment Hub
              </span>
              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${badgeStyles[badgeColor]}`}>
                {badgeLabel}
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left border ${
                  isActive
                    ? `${activeBgStyles[badgeColor]} shadow-xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? badgeColor === 'purple'
                          ? 'text-purple-600'
                          : 'text-indigo-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-xs">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-slate-400 truncate block">
                  {user?.email}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                  {portalTitle}
                </span>
                <span className="text-xs text-slate-300 hidden sm:inline">/</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  {activeItem.label}
                </h2>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                {portalSubtitle}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Engine Ready</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  if (!notificationsOpen) loadNotifications();
                }}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-fadeIn overflow-hidden">
                  <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {isLoadingNotifs && notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        <span className="inline-block animate-spin mr-1.5">⏳</span> Loading updates...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No notifications yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          You will be alerted about scheduled interviews and hiring updates here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 ${
                            !notif.is_read ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs truncate ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {formatTimeAgo(notif.created_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {user?.full_name}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {user?.role}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {user?.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onTabChange('settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                    {user?.role === 'CANDIDATE' && (
                      <button
                        onClick={() => {
                          onTabChange('profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>My Profile</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
