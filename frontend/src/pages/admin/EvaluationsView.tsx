import React, { useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import { evaluationsApi, type CVAnalysisReport } from '../../api/evaluations';

export const EvaluationsView: React.FC = () => {
  const [reports, setReports] = useState<CVAnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CVAnalysisReport | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await evaluationsApi.listAllReports();
      setReports(data);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to fetch AI evaluation reports.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReanalyze = async (appId: string) => {
    setReanalyzingId(appId);
    try {
      const fresh = await evaluationsApi.triggerCVAnalysis(appId);
      setSelectedReport(fresh);
      setAlert({
        type: 'success',
        message: 'Google Gemini re-analyzed CV and updated the report!',
      });
      fetchReports();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Re-analysis failed.',
      });
    } finally {
      setReanalyzingId(null);
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'RECOMMENDED_FOR_INTERVIEW':
        return {
          label: 'Recommended for Interview',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'CONSIDER_WITH_RESERVATIONS':
        return {
          label: 'Consider with Reservations',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      default:
        return {
          label: 'Requires Recruiter Review',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI CV Screening & Evaluations</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-dimensional Google Gemini CV evaluations comparing candidate qualifications against target job requirements.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh reports"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Reports Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">Loading AI evaluations from database...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Evaluation Reports Available</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Once candidates submit applications, Google Gemini automatically generates structured match reports here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => {
            const badge = getRecommendationBadge(report.recommendation);

            return (
              <div
                key={report.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.className}`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(report.analyzed_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {report.candidate_name || 'Candidate'}
                  </h3>
                  <div className="text-xs text-indigo-600 font-bold mt-0.5">
                    {report.job_title || 'Position'}
                  </div>

                  {/* Overall Match Circle / Progress */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        Overall Match Score
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        {report.overall_score}%
                      </span>
                    </div>
                    <div className="w-20 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          report.overall_score >= 85
                            ? 'bg-emerald-500'
                            : report.overall_score >= 70
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${report.overall_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary preview */}
                  <p className="text-[11px] text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                    {report.recommendation_reason}
                  </p>

                  {/* Matched skills chips */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                    {report.skill_matching?.matched_skills?.slice(0, 3).map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100"
                      >
                        ✓ {s}
                      </span>
                    ))}
                    {report.skill_matching?.missing_skills?.slice(0, 2).map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-100"
                      >
                        - {s}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReport(report)}
                  className="mt-5 w-full py-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <span>View Detailed AI Report</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Full AI Analysis Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Gemini AI Candidate Evaluation Report
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedReport.candidate_name} • {selectedReport.job_title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReanalyze(selectedReport.application_id)}
                  disabled={reanalyzingId === selectedReport.application_id}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      reanalyzingId === selectedReport.application_id ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Re-run Analysis</span>
                </button>

                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Overall Score & Recommendation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/60 via-indigo-50/60 to-slate-50 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-purple-600">
                    AI Final Hiring Recommendation
                  </span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {selectedReport.recommendation.replace(/_/g, ' ')}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
                    {selectedReport.recommendation_reason}
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-purple-200 sm:pl-6 shrink-0">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Match Confidence
                  </span>
                  <span className="text-3xl font-black text-indigo-600">
                    {selectedReport.overall_score}%
                  </span>
                </div>
              </div>

              {/* 1. Skill Matching Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Skill Alignment & Matching</span>
                </h4>

                <div>
                  <span className="block text-[11px] font-bold text-emerald-700 mb-1.5">
                    Matched Skills:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReport.skill_matching?.matched_skills?.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedReport.skill_matching?.missing_skills?.length > 0 && (
                  <div>
                    <span className="block text-[11px] font-bold text-amber-700 mb-1.5">
                      Identified Missing Skills / Gaps:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedReport.skill_matching.missing_skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200"
                        >
                          - {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Experience & Education Matching */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>Experience Matching</span>
                  </h4>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">Required: </span>
                    {selectedReport.experience_matching?.required_experience || '3+ years'}
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {selectedReport.experience_matching?.evaluation}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Education Matching</span>
                  </h4>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">Required: </span>
                    {selectedReport.education_matching?.required_education || 'B.Sc degree'}
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {selectedReport.education_matching?.evaluation}
                  </p>
                </div>
              </div>

              {/* 3. Strengths and Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2">
                  <span className="font-extrabold text-emerald-800 text-xs uppercase tracking-wider block">
                    Key Strengths
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside">
                    {selectedReport.strengths?.map((str, idx) => (
                      <li key={idx} className="leading-relaxed">{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-2">
                  <span className="font-extrabold text-rose-800 text-xs uppercase tracking-wider block">
                    Areas of Improvement
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside">
                    {selectedReport.weaknesses?.map((w, idx) => (
                      <li key={idx} className="leading-relaxed">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4. Suggested AI Interview Questions */}
              {selectedReport.suggested_questions?.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                  <h4 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <span>Gemini Suggested Interview Probing Questions</span>
                  </h4>
                  <div className="space-y-2 pt-1">
                    {selectedReport.suggested_questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-indigo-100 text-[11px] text-slate-800 font-medium"
                      >
                        Q{idx + 1}: {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
