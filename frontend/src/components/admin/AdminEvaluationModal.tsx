import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  evaluationsApi,
  type InterviewEvaluation,
} from '../../api/evaluations';

interface AdminEvaluationModalProps {
  interviewId: string;
  candidateName?: string;
  jobTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onDecisionUpdated?: () => void;
}

export const AdminEvaluationModal: React.FC<AdminEvaluationModalProps> = ({
  interviewId,
  candidateName = 'Candidate',
  jobTitle = 'Position',
  isOpen,
  onClose,
  onDecisionUpdated,
}) => {
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Form State
  const [decision, setDecision] = useState<'SELECTED' | 'REJECTED' | 'WAITLISTED'>('SELECTED');
  const [adminNotes, setAdminNotes] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [savingDecision, setSavingDecision] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !interviewId) return;

    let active = true;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    async function fetchEval() {
      try {
        const data = await evaluationsApi.getInterviewEvaluation(interviewId);
        if (active) {
          setEvaluation(data);
          if (data.final_decision !== 'PENDING') {
            setDecision(data.final_decision as 'SELECTED' | 'REJECTED' | 'WAITLISTED');
          }
          if (data.admin_notes) {
            setAdminNotes(data.admin_notes);
          }
          setIsPublished(data.is_published);
        }
      } catch (err: unknown) {
        if (active) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          setError(detail || 'Could not load interview evaluation report.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchEval();
    return () => {
      active = false;
    };
  }, [isOpen, interviewId]);

  const handleSaveDecision = async () => {
    if (!interviewId) return;
    setSavingDecision(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await evaluationsApi.updateAdminDecision(interviewId, {
        final_decision: decision,
        admin_notes: adminNotes,
        is_published: isPublished,
      });
      setEvaluation(updated);
      setSuccessMessage(
        `Hiring decision saved as "${decision}". ${
          isPublished ? 'Published to candidate dashboard!' : 'Saved internally (not published).'
        }`
      );
      if (onDecisionUpdated) {
        onDecisionUpdated();
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Failed to save final decision. Please try again.');
    } finally {
      setSavingDecision(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden my-auto">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  AI Interview Evaluation & Result
                </h2>
                {evaluation && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      evaluation.overall_score >= 85
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : evaluation.overall_score >= 70
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    Score: {evaluation.overall_score}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Candidate: <span className="font-semibold text-slate-200">{candidateName}</span> • Job:{' '}
                <span className="text-purple-300">{jobTitle}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-xs">

          {/* Loading State */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="font-semibold text-sm">Synthesizing Gemini interview evaluation...</p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800/60 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {evaluation && !loading && (
            <>
              {/* 1. TOP SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Overall Score */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-black text-xl text-purple-300 font-mono">
                    {Math.round(evaluation.overall_score)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Overall Assessment
                    </span>
                    <span className="font-extrabold text-sm text-white">
                      {evaluation.overall_score >= 85 ? 'Exceptional Match' : evaluation.overall_score >= 70 ? 'Strong Match' : 'Conditional'}
                    </span>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      AI Recommendation
                    </span>
                    <span className="font-extrabold text-sm text-emerald-300">
                      {evaluation.ai_recommendation}
                    </span>
                  </div>
                </div>

                {/* Current Admin Decision */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                      evaluation.final_decision === 'SELECTED'
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
                        : evaluation.final_decision === 'REJECTED'
                        ? 'bg-rose-600/20 border border-rose-500/30 text-rose-400'
                        : evaluation.final_decision === 'WAITLISTED'
                        ? 'bg-amber-600/20 border border-amber-500/30 text-amber-400'
                        : 'bg-slate-800 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {evaluation.final_decision === 'SELECTED' ? '✓' : evaluation.final_decision === 'REJECTED' ? '✗' : '⏳'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hiring Decision
                    </span>
                    <span className="font-extrabold text-sm text-white">
                      {evaluation.final_decision}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {evaluation.is_published ? '● Published to Candidate' : '○ Private / Unpublished'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. CORE EVALUATION CRITERIA (6 CRITERIA) */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <Target className="w-4 h-4 text-purple-400" />
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
                    Competency & Criteria Breakdown (6 Dimensions)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {[
                    { label: 'Technical Knowledge', score: evaluation.technical_knowledge, icon: Brain },
                    { label: 'Problem Solving', score: evaluation.problem_solving, icon: TrendingUp },
                    { label: 'Answer Relevance', score: evaluation.answer_relevance, icon: Target },
                    { label: 'Conceptual Understanding', score: evaluation.conceptual_understanding, icon: Star },
                    { label: 'Communication Clarity', score: evaluation.communication_clarity, icon: MessageSquare },
                    { label: 'Job Compatibility', score: evaluation.job_compatibility, icon: Award },
                  ].map((crit) => {
                    const Icon = crit.icon;
                    return (
                      <div key={crit.label} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                            <Icon className="w-3.5 h-3.5 text-purple-400" />
                            <span>{crit.label}</span>
                          </div>
                          <span className="font-mono font-bold text-white">{Math.round(crit.score)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, crit.score))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. QUESTION-BY-QUESTION ANALYSIS */}
              {evaluation.question_analysis && evaluation.question_analysis.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
                      Question-wise Performance Breakdown ({evaluation.question_analysis.length} Questions)
                    </h3>
                  </div>

                  <div className="space-y-4 pt-1">
                    {evaluation.question_analysis.map((q) => {
                      const isCorrect = q.status === 'CORRECT' || (q.score >= 75);
                      const isPartial = q.status === 'PARTIALLY_CORRECT' || (q.score >= 40 && q.score < 75);

                      return (
                        <div key={q.question_number} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="font-bold text-white text-xs leading-snug">
                              Q{q.question_number}: {q.question}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${
                                  isCorrect
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : isPartial
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                }`}
                              >
                                {isCorrect ? '✓ Correct' : isPartial ? '⚠ Partially Correct' : '✕ Incomplete'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-[11px] border border-purple-500/30">
                                {Math.round(q.similarity_score || q.score)}% Match
                              </span>
                            </div>
                          </div>

                          {/* Expected Benchmark Answer if configured */}
                          {q.expected_answer && (
                            <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-[11px] space-y-1">
                              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                                Benchmark Model Answer (প্রত্যাশিত আদর্শ উত্তর)
                              </span>
                              <p className="text-slate-200 leading-relaxed">{q.expected_answer}</p>
                            </div>
                          )}

                          {/* Candidate Answer Summary */}
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Candidate's Response (প্রার্থীর উত্তর)
                            </span>
                            <p className="text-slate-300 leading-relaxed">{q.candidate_answer_summary}</p>
                          </div>

                          {/* Matched & Missing Concepts Chips */}
                          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[10px]">
                            {q.matched_concepts && q.matched_concepts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-emerald-400 font-bold">Matched:</span>
                                {q.matched_concepts.map((c, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                                    ✓ {c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {q.missing_concepts && q.missing_concepts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-rose-400 font-bold">Missed:</span>
                                {q.missing_concepts.map((c, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/50">
                                    ✕ {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* AI Feedback */}
                          <p className="text-emerald-400/90 text-[11px] bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/40 leading-relaxed">
                            <strong className="text-emerald-300">AI Similarity Analysis:</strong> {q.feedback}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. STRENGTHS & WEAKNESSES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Key Strengths</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    {evaluation.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <ThumbsDown className="w-4 h-4" />
                    <span>Areas for Growth</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    {evaluation.weaknesses.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">⚠</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 5. IMPROVEMENT SUGGESTIONS */}
              {evaluation.improvement_suggestions && evaluation.improvement_suggestions.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>Actionable Recommendations for Candidate</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    {evaluation.improvement_suggestions.map((sug, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-sky-400 font-bold">→</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6. OVERALL EVALUATION NARRATIVE */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comprehensive Evaluator Summary
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {evaluation.overall_evaluation}
                </p>
              </div>

              {/* 7. HUMAN ADMIN FINAL DECISION & PUBLISHING PANEL */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border-2 border-indigo-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-500/30">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-extrabold text-sm text-white">
                      Admin Final Hiring Decision & Feedback
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Human Control Over AI
                  </span>
                </div>

                {/* Decision Selector */}
                <div>
                  <label className="block font-bold text-slate-300 text-xs mb-2">
                    Select Hiring Outcome:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecision('SELECTED')}
                      className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        decision === 'SELECTED'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>SELECT (OFFER)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('WAITLISTED')}
                      className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        decision === 'WAITLISTED'
                          ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>WAITLIST</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('REJECTED')}
                      className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        decision === 'REJECTED'
                          ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>

                {/* Recruiter / Admin Notes */}
                <div>
                  <label className="block font-bold text-slate-300 text-xs mb-1.5">
                    Recruiter Feedback / Notes (Visible to candidate upon publishing):
                  </label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Provide constructive feedback or reason for final hiring decision..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Publish Checkbox */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="publishCheck"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-slate-950 border-slate-700 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="publishCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Publish decision & scorecard to Candidate Dashboard immediately
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDecision}
                    disabled={savingDecision}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingDecision ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Decision...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Record Hiring Decision</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0 text-slate-400 text-xs">
          <span>Interview ID: <code className="text-slate-300 font-mono">{interviewId}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
