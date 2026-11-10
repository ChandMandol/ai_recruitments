import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Video,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { CandidateDashboardData } from '../../types/auth';

interface CandidateOverviewProps {
  data: CandidateDashboardData | null;
  onNavigateTab: (tabId: string) => void;
}

export const CandidateOverview: React.FC<CandidateOverviewProps> = ({ data, onNavigateTab }) => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Powered Candidate Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.full_name}! 👋
          </h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl leading-relaxed">
            Your candidate hub is active. Upload your resume for automated Gemini CV screening, browse openings, and take your real-time AI live voice & video interview.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigateTab('resume')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-900 hover:bg-slate-100 shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Upload / Analyze CV</span>
            </button>
            <button
              onClick={() => onNavigateTab('interviews')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-purple-300" />
              <span>AI Interview Room</span>
            </button>
          </div>
        </div>

        {/* Ambient background blur */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Submitted Applications
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {data?.applied_jobs_count ?? 2}
          </div>
          <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">
            Across 2 Tech Companies
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Scheduled AI Interviews
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {data?.pending_interviews_count ?? 1}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Today at 04:30 PM</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Profile Readiness
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">100%</div>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            Verified Candidate Account
          </span>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Action: Scheduled AI Interview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-600" />
              <span>Next Action: AI Voice & Video Interview</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              Upcoming
            </span>
          </div>

          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
            <h4 className="text-xs font-extrabold text-purple-950">
              Live Session with AI Interviewer
            </h4>
            <p className="text-xs text-purple-800 mt-0.5">
              Role: Senior Full Stack Engineer • Duration: 25 mins
            </p>
            <p className="text-[11px] text-purple-700 mt-2">
              The AI interviewer will ask questions based on your CV and live responses over WebRTC voice streaming.
            </p>
            <div className="mt-4 pt-3 border-t border-purple-200 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">Today, 04:30 PM</span>
              <button
                onClick={() => onNavigateTab('interviews')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Enter Interview Room</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Recommended Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Recommended Openings For You</span>
            </h3>
            <button
              onClick={() => onNavigateTab('browse')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Browse All
            </button>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'AI / Machine Learning Engineer',
                company: 'Google AI Partner Network',
                type: 'Full-time / Remote',
                match: '92% Match',
              },
              {
                title: 'Backend Python Developer',
                company: 'Fintech Hub Inc.',
                type: 'Full-time / Hybrid',
                match: '88% Match',
              },
            ].map((j, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{j.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {j.company} • {j.type}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {j.match}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
