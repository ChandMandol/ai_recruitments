import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { applicationsApi, type JobApplication } from '../../api/applications';

export const MyApplications: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const steps = [
    'Submitted',
    'AI CV Screening',
    'Shortlisted',
    'Live AI Interview',
    'Final Result',
  ];

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await applicationsApi.getMyApplications();
      setApplications(data.items);
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const getStepIndex = (status: string): number => {
    switch (status) {
      case 'APPLIED':
        return 1;
      case 'SCREENING':
      case 'WAITING_LIST':
        return 2;
      case 'SHORTLISTED':
        return 3;
      case 'INTERVIEW_SCHEDULED':
      case 'EVALUATED':
        return 4;
      case 'ACCEPTED':
      case 'REJECTED':
        return 5;
      default:
        return 1;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WAITING_LIST':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SHORTLISTED':
      case 'INTERVIEW_SCHEDULED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>My Applications & Status Tracking</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your job applications step-by-step through AI CV screening, live interviews, and final results.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          title="Refresh applications"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">Loading your applications...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Applications Submitted Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You haven't applied for any jobs yet. Browse published job openings and submit your application with 1-click.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const currentStep = getStepIndex(app.status);

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {app.job?.title || 'Open Position'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{app.job?.department || 'Engineering'}</span>
                      <span>•</span>
                      <span>Applied on {new Date(app.applied_at).toLocaleDateString()}</span>
                      {app.resume_filename && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <FileText className="w-3 h-3 text-indigo-600" />
                            {app.resume_filename}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {app.ai_match_score !== null && app.ai_match_score !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{app.ai_match_score}% AI Match</span>
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>

                {/* 5-Step Visual Stepper */}
                <div className="py-2">
                  <div className="relative flex items-center justify-between">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />
                    <div
                      className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((label, idx) => {
                      const stepNum = idx + 1;
                      const isCompleted = stepNum < currentStep;
                      const isCurrent = stepNum === currentStep;

                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCompleted
                                ? 'bg-indigo-600 text-white'
                                : isCurrent
                                ? 'bg-white border-2 border-indigo-600 text-indigo-600 ring-4 ring-indigo-50'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 font-bold hidden sm:block ${
                              isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Screening Notes */}
                {app.ai_match_summary && (
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gemini Screening Summary: </span>
                      <span>{app.ai_match_summary}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
