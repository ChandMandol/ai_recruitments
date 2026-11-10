import React from 'react';
import {
  Award,
  Download,
  PartyPopper,
  Sparkles,
} from 'lucide-react';

export const MyResults: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          <span>My Interview Results & AI Feedback</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review official evaluation reports and final decisions published by the hiring team.
        </p>
      </div>

      {/* Offer / Decision Celebration Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300 mb-2">
          <PartyPopper className="w-4 h-4 text-amber-300" />
          <span>Final Decision Published</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-black">
          Offer Extended — Senior Full Stack Engineer
        </h3>
        <p className="text-xs text-emerald-200 mt-1 max-w-xl leading-relaxed">
          Congratulations! Based on your Google Gemini Live interview evaluation and CV matching score, TechVentures has extended an official employment offer.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-6 pt-5 border-t border-white/10 text-xs">
          <div>
            <span className="block text-emerald-400 font-bold uppercase text-[10px]">Overall AI Score</span>
            <span className="text-xl font-black text-white">91 / 100</span>
          </div>
          <div className="h-8 w-px bg-white/20 hidden sm:block" />
          <div>
            <span className="block text-emerald-400 font-bold uppercase text-[10px]">Recommendation</span>
            <span className="text-base font-extrabold text-emerald-300">Strong Hire</span>
          </div>
          <div className="h-8 w-px bg-white/20 hidden sm:block" />
          <div>
            <span className="block text-emerald-400 font-bold uppercase text-[10px]">Published Date</span>
            <span className="text-sm font-semibold text-white">Nov 09, 2026</span>
          </div>
        </div>
      </div>

      {/* Score Breakdown Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Competency & Communication Assessment</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Technical Depth</span>
            <span className="text-2xl font-black text-slate-800">92%</span>
            <span className="block text-[11px] text-emerald-600 font-semibold mt-1">Excellent</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Communication & Clarity</span>
            <span className="text-2xl font-black text-slate-800">89%</span>
            <span className="block text-[11px] text-emerald-600 font-semibold mt-1">High</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Problem Solving</span>
            <span className="text-2xl font-black text-slate-800">93%</span>
            <span className="block text-[11px] text-emerald-600 font-semibold mt-1">Exceptional</span>
          </div>
        </div>

        {/* Recruiter Note */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
            Recruiter Summary:
          </span>
          <p className="text-slate-600 leading-relaxed">
            The candidate demonstrated outstanding hands-on ability in real-time WebRTC audio handling, Python FastAPI architecture, and async PostgreSQL pooling. Communication was lucid, structured, and confident throughout the live AI session.
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
          <button className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Download Certified AI Report (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
