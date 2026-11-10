import React, { useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  FileCheck,
  LayoutDashboard,
  Settings,
  UserCheck,
  Video,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import type { NavItem } from '../components/layout/DashboardLayout';
import type { AdminOverviewStats } from '../types/auth';

// Import Admin Sub-views
import { AdminOverview } from './admin/AdminOverview';
import { JobManagement } from './admin/JobManagement';
import { ApplicantsView } from './admin/ApplicantsView';
import { InterviewsView } from './admin/InterviewsView';
import { EvaluationsView } from './admin/EvaluationsView';
import { ResultsView } from './admin/ResultsView';
import { AdminSettings } from './admin/AdminSettings';

const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'jobs', label: 'Job Management', icon: Briefcase, badge: '3 Active', badgeColor: 'bg-purple-100 text-purple-700' },
  { id: 'applicants', label: 'Applicants', icon: UserCheck, badge: '4 New', badgeColor: 'bg-indigo-100 text-indigo-700' },
  { id: 'interviews', label: 'Interviews', icon: Video, badge: 'Live AI', badgeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'evaluations', label: 'Evaluations', icon: Award },
  { id: 'results', label: 'Results', icon: FileCheck },
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
      {activeTab === 'overview' && (
        <AdminOverview stats={stats} onNavigateTab={setActiveTab} />
      )}
      {activeTab === 'jobs' && <JobManagement />}
      {activeTab === 'applicants' && <ApplicantsView />}
      {activeTab === 'interviews' && <InterviewsView />}
      {activeTab === 'evaluations' && <EvaluationsView />}
      {activeTab === 'results' && <ResultsView />}
      {activeTab === 'settings' && <AdminSettings />}
    </DashboardLayout>
  );
};
