import React, { useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  User as UserIcon,
  Video,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import type { NavItem } from '../components/layout/DashboardLayout';
import type { CandidateDashboardData } from '../types/auth';

// Import Candidate Sub-views
import { CandidateOverview } from './candidate/CandidateOverview';
import { MyProfile } from './candidate/MyProfile';
import { MyResume } from './candidate/MyResume';
import { BrowseJobs } from './candidate/BrowseJobs';
import { MyApplications } from './candidate/MyApplications';
import { CandidateInterviews } from './candidate/CandidateInterviews';
import { MyResults } from './candidate/MyResults';
import { CandidateSettings } from './candidate/CandidateSettings';

const CANDIDATE_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserIcon },
  { id: 'resume', label: 'My Resume', icon: FileText, badge: 'AI Parsed', badgeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'browse', label: 'Browse Jobs', icon: Search, badge: '3 Open', badgeColor: 'bg-indigo-100 text-indigo-700' },
  { id: 'applications', label: 'My Applications', icon: Briefcase, badge: '2 Active', badgeColor: 'bg-purple-100 text-purple-700' },
  { id: 'interviews', label: 'Interviews', icon: Video, badge: 'Today', badgeColor: 'bg-amber-100 text-amber-700' },
  { id: 'results', label: 'My Results', icon: Award, badge: 'Offer', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const CandidateDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<CandidateDashboardData | null>(null);

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        const res = await authApi.getCandidateDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load candidate dashboard:', err);
      }
    };
    fetchCandidateData();
  }, []);

  return (
    <DashboardLayout
      navItems={CANDIDATE_NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      portalTitle="Recruitment Hub"
      portalSubtitle="Candidate AI Career Hub"
      badgeLabel="Candidate Portal"
      badgeColor="indigo"
    >
      {activeTab === 'overview' && (
        <CandidateOverview data={data} onNavigateTab={setActiveTab} />
      )}
      {activeTab === 'profile' && <MyProfile />}
      {activeTab === 'resume' && <MyResume />}
      {activeTab === 'browse' && <BrowseJobs />}
      {activeTab === 'applications' && <MyApplications />}
      {activeTab === 'interviews' && <CandidateInterviews />}
      {activeTab === 'results' && <MyResults />}
      {activeTab === 'settings' && <CandidateSettings />}
    </DashboardLayout>
  );
};
