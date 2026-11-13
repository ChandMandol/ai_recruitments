import React, { Suspense, useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  User as UserIcon,
  Video,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import type { NavItem } from '../components/layout/DashboardLayout';
import type { CandidateDashboardData } from '../types/auth';

// Lazy-loaded Candidate Sub-views for Code-Splitting
const CandidateOverview = React.lazy(() =>
  import('./candidate/CandidateOverview').then((m) => ({ default: m.CandidateOverview }))
);
const MyProfile = React.lazy(() =>
  import('./candidate/MyProfile').then((m) => ({ default: m.MyProfile }))
);
const MyResume = React.lazy(() =>
  import('./candidate/MyResume').then((m) => ({ default: m.MyResume }))
);
const BrowseJobs = React.lazy(() =>
  import('./candidate/BrowseJobs').then((m) => ({ default: m.BrowseJobs }))
);
const MyApplications = React.lazy(() =>
  import('./candidate/MyApplications').then((m) => ({ default: m.MyApplications }))
);
const CandidateInterviews = React.lazy(() =>
  import('./candidate/CandidateInterviews').then((m) => ({ default: m.CandidateInterviews }))
);
const MyResults = React.lazy(() =>
  import('./candidate/MyResults').then((m) => ({ default: m.MyResults }))
);
const AdaptiveInterview = React.lazy(() =>
  import('./candidate/AdaptiveInterview').then((m) => ({ default: m.AdaptiveInterview }))
);
const CandidateSettings = React.lazy(() =>
  import('./candidate/CandidateSettings').then((m) => ({ default: m.CandidateSettings }))
);

const TabFallback: React.FC = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Loading section...</span>
    </div>
  </div>
);

const CANDIDATE_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserIcon },
  { id: 'resume', label: 'My Resume', icon: FileText, badge: 'AI Parsed', badgeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'assessment', label: 'AI Assessment', icon: Sparkles, badge: 'Adaptive', badgeColor: 'bg-indigo-100 text-indigo-700' },
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
      <Suspense fallback={<TabFallback />}>
        {activeTab === 'overview' && (
          <CandidateOverview data={data} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'profile' && <MyProfile />}
        {activeTab === 'resume' && <MyResume />}
        {activeTab === 'assessment' && <AdaptiveInterview />}
        {activeTab === 'browse' && <BrowseJobs />}
        {activeTab === 'applications' && <MyApplications />}
        {activeTab === 'interviews' && <CandidateInterviews />}
        {activeTab === 'results' && <MyResults onNavigateTab={setActiveTab} />}
        {activeTab === 'settings' && <CandidateSettings />}
      </Suspense>
    </DashboardLayout>
  );
};
