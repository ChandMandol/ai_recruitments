import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import type { AdminOverviewStats } from '../../types/auth';

interface AdminOverviewProps {
  stats: AdminOverviewStats | null;
  onNavigateTab: (tabId: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ stats, onNavigateTab }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-950/15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-purple-200 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Recruitment Engine Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Admin Command Center
          </h1>
          <p className="text-purple-200 text-sm mt-1 max-w-2xl leading-relaxed">
            Welcome to the AI Recruitment Hub. Automated CV screening, Gemini Live real-time voice & video interviews, and multi-tenant recruiter operations are all active.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigateTab('jobs')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-purple-600" />
              <span>Manage Job Posts</span>
            </button>
            <button
              onClick={() => onNavigateTab('interviews')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-purple-300" />
              <span>Live Interview Lobby</span>
            </button>
          </div>
        </div>

        {/* Ambient background glowing circles */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Candidates
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {stats?.total_candidates ?? 4}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12% this week</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Job Posts
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">3</div>
          <span className="text-xs text-purple-600 font-semibold mt-1 inline-block">
            Across 2 Departments
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Interviews Scheduled
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">2</div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Gemini Live Multimodal</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg CV Match Score
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">87.4%</div>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            High Quality Talent
          </span>
        </div>
      </div>

      {/* Two Column Layout: Recent Applicants & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applicants */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Recent Applicants & Match Scores</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Automated screening by Gemini 1.5</p>
            </div>
            <button
              onClick={() => onNavigateTab('applicants')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {[
              {
                name: 'Tanvir Ahmed',
                role: 'Senior Full Stack Engineer',
                score: 94,
                status: 'Shortlisted',
                color: 'emerald',
              },
              {
                name: 'Sarah Rahman',
                role: 'AI / Machine Learning Engineer',
                score: 89,
                status: 'Interview Scheduled',
                color: 'purple',
              },
              {
                name: 'Mahmudul Karim',
                role: 'Frontend React Developer',
                score: 78,
                status: 'Screening Complete',
                color: 'blue',
              },
            ].map((app, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{app.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{app.role}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {app.score}% Match
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{app.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live AI Interview Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                <span>Gemini Live AI Interviews</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time voice & video sessions</p>
            </div>
            <button
              onClick={() => onNavigateTab('interviews')}
              className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Interview Schedule</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-purple-900">
                  Sarah Rahman vs AI Interviewer
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                  Scheduled Today
                </span>
              </div>
              <p className="text-xs text-purple-800 mt-1">Role: AI / Machine Learning Engineer</p>
              <div className="flex items-center justify-between mt-3 text-xs text-purple-700 pt-2 border-t border-purple-200/60">
                <span>Duration: 25 mins</span>
                <button
                  onClick={() => onNavigateTab('interviews')}
                  className="font-bold underline hover:text-purple-900 cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Session Room</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">
                  Tanvir Ahmed vs AI Interviewer
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Tomorrow 11:00 AM
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Role: Senior Full Stack Engineer</p>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
                <span>Rubric: Python, FastAPI, React</span>
                <span className="font-semibold text-slate-700">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

