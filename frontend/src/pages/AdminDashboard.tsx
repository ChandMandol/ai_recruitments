import React, { Suspense, useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  FileCheck,
  LayoutDashboard,
  Settings,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import type { NavItem } from '../components/layout/DashboardLayout';
import type { AdminOverviewStats } from '../types/auth';

// Lazy-loaded Admin Sub-views for Code-Splitting
const AdminOverview = React.lazy(() =>
  import('./admin/AdminOverview').then((m) => ({ default: m.AdminOverview }))
);
const JobManagement = React.lazy(() =>
  import('./admin/JobManagement').then((m) => ({ default: m.JobManagement }))
);
const ApplicantsView = React.lazy(() =>
  import('./admin/ApplicantsView').then((m) => ({ default: m.ApplicantsView }))
);
const InterviewsView = React.lazy(() =>
  import('./admin/InterviewsView').then((m) => ({ default: m.InterviewsView }))
);
const EvaluationsView = React.lazy(() =>
  import('./admin/EvaluationsView').then((m) => ({ default: m.EvaluationsView }))
);
const ResultsView = React.lazy(() =>
  import('./admin/ResultsView').then((m) => ({ default: m.ResultsView }))
);
const UsersManagementView = React.lazy(() =>
  import('./admin/UsersManagementView').then((m) => ({ default: m.UsersManagementView }))
);
const AdminSettings = React.lazy(() =>
  import('./admin/AdminSettings').then((m) => ({ default: m.AdminSettings }))
);

const TabFallback: React.FC = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Loading admin view...</span>
    </div>
  </div>
);

const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'jobs', label: 'Job Management', icon: Briefcase, badge: '3 Active', badgeColor: 'bg-purple-100 text-purple-700' },
  { id: 'applicants', label: 'Applicants', icon: UserCheck, badge: '4 New', badgeColor: 'bg-indigo-100 text-indigo-700' },
  { id: 'interviews', label: 'Interviews', icon: Video, badge: 'Live AI', badgeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'evaluations', label: 'Evaluations', icon: Award },
  { id: 'results', label: 'Results', icon: FileCheck },
  { id: 'users', label: 'Users & Access', icon: Users, badge: 'Manage', badgeColor: 'bg-rose-100 text-rose-700' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await authApi.getAdminOverview();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout
      navItems={ADMIN_NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      portalTitle="Recruitment Hub"
      portalSubtitle="Admin & Recruiter Control Center"
      badgeLabel="Admin Portal"
      badgeColor="purple"
    >
      <Suspense fallback={<TabFallback />}>
        {activeTab === 'overview' && (
          <AdminOverview stats={stats} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'jobs' && <JobManagement />}
        {activeTab === 'applicants' && <ApplicantsView />}
        {activeTab === 'interviews' && <InterviewsView onNavigateTab={setActiveTab} />}
        {activeTab === 'evaluations' && <EvaluationsView />}
        {activeTab === 'results' && <ResultsView />}
        {activeTab === 'users' && <UsersManagementView />}
        {activeTab === 'settings' && <AdminSettings />}
      </Suspense>
    </DashboardLayout>
  );
};
