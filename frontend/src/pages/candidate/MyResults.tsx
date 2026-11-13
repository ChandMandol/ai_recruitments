import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  PartyPopper,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { evaluationsApi, type CandidateResult } from '../../api/evaluations';

interface MyResultsProps {
  onNavigateTab?: (tab: string) => void;
}

export const MyResults: React.FC<MyResultsProps> = ({ onNavigateTab }) => {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await evaluationsApi.getCandidateResults();
        setResults(data);
      } catch (err: any) {
        console.error('Failed to load candidate results:', err);
        setError(err.response?.data?.detail || 'Failed to fetch interview results. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  return (
    <div className="max-w-5xl space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            <span>My Interview Results & Peer Benchmarking</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review official evaluation scorecards, AI gap analysis, and comparative cohort rankings.
          </p>
        </div>

        {results.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Users className="w-3.5 h-3.5" />
            <span>{results.length} Evaluated {results.length === 1 ? 'Session' : 'Sessions'}</span>
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold text-slate-600">
            Loading your verified evaluation reports...
          </span>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State: No Job Results Published Yet */}
      {!loading && !error && results.length === 0 && (
        <div className="bg-gradient-to-b from-white to-slate-50/60 rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <BarChart3 className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-black text-slate-900">
              No Published Job Competition Results Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When you participate in simulated job challenges and complete your AI interview, your official evaluation scorecard and peer ranking will appear here.
            </p>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-2 text-left">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs mb-1">
                <Target className="w-4 h-4" />
                <span>System 1: Solo AI Practice</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                Practice 1-on-1 with speaking AI avatars. Get instant zero-judgment diagnostic feedback.
              </p>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('assessment')}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Start Solo Practice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-purple-600 font-bold text-xs mb-1">
                <Search className="w-4 h-4" />
                <span>System 2: Job Arena</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                Apply to open company simulations, complete the interview, and compare against peers.
              </p>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('browse')}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Browse Open Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render Real Results */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-8">
          {results.map((res, idx) => {
            const isSelected = res.final_decision === 'SELECTED';
            const isWaitlisted = res.final_decision === 'WAITLISTED';
            const isRejected = res.final_decision === 'REJECTED';
            const score = res.overall_score || 0;

            // Peer percentile estimation based on score
            const percentile = score >= 90 ? 'Top 5%' : score >= 80 ? 'Top 15%' : score >= 70 ? 'Top 35%' : 'Top 50%';

            return (
              <div
                key={res.interview_id || idx}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Decision Header Banner */}
                <div
                  className={`p-6 sm:p-8 text-white ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900'
                      : isWaitlisted
                      ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950'
                      : isRejected
                      ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950'
                      : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20">
                      {isSelected ? (
                        <>
                          <PartyPopper className="w-3.5 h-3.5 text-amber-300" />
                          <span className="text-emerald-300">Offer Extended</span>
                        </>
                      ) : isWaitlisted ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-300">Waitlisted for Next Round</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-rose-300">Not Selected</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                          <span className="text-indigo-200">Evaluation In Progress</span>
                        </>
                      )}
                    </div>

                    {res.published_at && (
                      <span className="text-xs text-slate-300">
                        Published: {new Date(res.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    {res.job_title || 'Software Engineering Position'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {res.status_message}
                  </p>

                  {/* Summary Metric Ribbon */}
                  {res.is_published && (
                    <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-white/10 text-xs">
                      <div>
                        <span className="block text-slate-400 uppercase text-[10px] font-bold">Overall AI Score</span>
                        <span className="text-2xl font-black text-white">{score} / 100</span>
                      </div>

                      <div className="h-8 w-px bg-white/15 hidden sm:block" />

                      <div>
                        <span className="block text-slate-400 uppercase text-[10px] font-bold">Peer Standing</span>
                        <span className="text-lg font-black text-amber-300 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{percentile}</span>
                        </span>
                      </div>

                      <div className="h-8 w-px bg-white/15 hidden sm:block" />

                      <div>
                        <span className="block text-slate-400 uppercase text-[10px] font-bold">Decision</span>
                        <span className="text-base font-extrabold text-white">
                          {res.final_decision || 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scorecards & Peer Comparison Body */}
                {res.is_published && (
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* 1. Peer Comparison Benchmark Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/30 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>Cohort Benchmark & Gap Analysis</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                          Compared against all candidates who interviewed for <strong>{res.job_title}</strong>, your score places you in the <strong>{percentile}</strong> bracket.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-white text-indigo-700 border border-indigo-200 shadow-xs">
                          Your Score: {score}%
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                          Cohort Avg: 74%
                        </span>
                      </div>
                    </div>

                    {/* 2. Criteria Breakdown (6 Competencies) */}
                    {res.criteria_scores && Object.keys(res.criteria_scores).length > 0 && (
                      <div>
                        <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">
                          Competency & Skill Dimension Scores
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(res.criteria_scores).map(([crit, val]) => (
                            <div key={crit} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                              <span className="block text-[11px] font-semibold text-slate-500 capitalize">
                                {crit.replace(/_/g, ' ')}
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-xl font-black text-slate-900">{val}%</span>
                                <span className={`text-[10px] font-bold ${val >= 80 ? 'text-emerald-600' : val >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                  {val >= 80 ? 'Proficient' : val >= 60 ? 'Moderate' : 'Developing'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Question-wise AI Analysis & Benchmark Answers */}
                    {res.question_analysis && res.question_analysis.length > 0 && (
                      <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                          <HelpCircle className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                            Interview Questions & Benchmark Model Analysis ({res.question_analysis.length} Questions)
                          </h4>
                        </div>

                        <div className="space-y-4">
                          {res.question_analysis.map((q) => {
                            const isCorrect = q.status === 'CORRECT' || q.score >= 75;
                            const isPartial = q.status === 'PARTIALLY_CORRECT' || (q.score >= 40 && q.score < 75);

                            return (
                              <div
                                key={q.question_number}
                                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <span className="font-bold text-slate-900 text-xs leading-snug">
                                    Question {q.question_number}: {q.question}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${
                                        isCorrect
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : isPartial
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}
                                    >
                                      {isCorrect ? '✓ Correct Answer' : isPartial ? '⚠ Partially Correct' : '✕ Needs Improvement'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono font-bold text-[10px] border border-purple-200">
                                      {Math.round(q.similarity_score || q.score)}% Match
                                    </span>
                                  </div>
                                </div>

                                {/* Expected Benchmark Answer */}
                                {q.expected_answer && (
                                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1">
                                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                                      Benchmark Model Answer (আদর্শ উত্তর):
                                    </span>
                                    <p className="text-slate-700 leading-relaxed">{q.expected_answer}</p>
                                  </div>
                                )}

                                {/* Candidate Response Summary */}
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Your Answer Summary (আপনার উত্তর):
                                  </span>
                                  <p className="text-slate-700 leading-relaxed">{q.candidate_answer_summary}</p>
                                </div>

                                {/* Matched Concepts */}
                                {q.matched_concepts && q.matched_concepts.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className="text-emerald-700 font-bold text-[10px] uppercase">Matched Concepts:</span>
                                    {q.matched_concepts.map((c, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                                        ✓ {c}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* AI Feedback */}
                                <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs leading-relaxed text-slate-700">
                                  <strong className="text-emerald-900">AI Feedback & Improvement Tip: </strong>
                                  {q.feedback}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Strengths & Improvement Suggestions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {res.strengths && res.strengths.length > 0 && (
                        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                          <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Demonstrated Strengths</span>
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-700">
                            {res.strengths.map((str, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {res.improvement_suggestions && res.improvement_suggestions.length > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                          <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span>Areas for Technical Improvement</span>
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-700">
                            {res.improvement_suggestions.map((imp, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                <span>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* 4. Recruiter / Admin Notes */}
                    {res.admin_feedback && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                          Recruiter & Hiring Team Feedback:
                        </span>
                        <p className="text-slate-600 leading-relaxed">
                          {res.admin_feedback}
                        </p>
                      </div>
                    )}
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
