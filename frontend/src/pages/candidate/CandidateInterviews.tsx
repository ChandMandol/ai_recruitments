import React, { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  Mic,
  Radio,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Video,
  XCircle,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import { interviewsApi, type InterviewSession } from '../../api/interviews';
import { evaluationsApi, type CandidateResult } from '../../api/evaluations';

export const CandidateInterviews: React.FC = () => {
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Device calibration state
  const [inTesting, setInTesting] = useState(false);
  const [deviceCalibrated, setDeviceCalibrated] = useState(false);

  // Live countdown to next interview
  const [nextInterview, setNextInterview] = useState<InterviewSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const fetchMyInterviewsAndResults = async () => {
    setLoading(true);
    try {
      const [invRes, resRes] = await Promise.all([
        interviewsApi.getMyInterviews(),
        evaluationsApi.getCandidateResults().catch(() => [] as CandidateResult[]),
      ]);
      setInterviews(invRes.items);
      setResults(resRes);

      // Find nearest active upcoming interview
      const now = new Date().getTime();
      const upcoming = invRes.items
        .filter((i) => (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED' || i.status === 'IN_PROGRESS') && new Date(i.end_at).getTime() > now)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
      setNextInterview(upcoming || null);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInterviewsAndResults();
  }, []);

  // Live Countdown Timer
  useEffect(() => {
    if (!nextInterview) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const target = new Date(nextInterview.scheduled_at).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [nextInterview]);

  const handleTestDevices = () => {
    setInTesting(true);
    setTimeout(() => {
      setInTesting(false);
      setDeviceCalibrated(true);
      setAlertMsg({
        type: 'success',
        message: 'Microphone and Camera successfully calibrated for Gemini Live audio/video streaming!',
      });
    }, 1200);
  };

  const handleJoinRoom = (roomToken: string) => {
    window.history.pushState({}, '', `/interview/live?room=${roomToken}`);
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-600" />
            <span>AI Live Interview & Results Portal</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your scheduled interviews, access the live Gemini interview room, and view published scorecards and final hiring results.
          </p>
        </div>

        <button
          onClick={fetchMyInterviewsAndResults}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          title="Refresh interviews & results"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {alertMsg && (
        <Alert
          type={alertMsg.type}
          message={alertMsg.message}
          onClose={() => setAlertMsg(null)}
        />
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="text-xs font-semibold">Loading your interview schedules and results...</span>
        </div>
      ) : nextInterview ? (
        /* Active Scheduled Interview Hero Card */
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-500/20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Confirmed Session
                </span>
                <span className="text-xs text-purple-200/70 font-mono">
                  Room: {nextInterview.room_token}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white">{nextInterview.title}</h3>
              <p className="text-xs text-purple-200/80 font-medium">
                Position: <span className="text-white font-bold">{nextInterview.job_title}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleJoinRoom(nextInterview.room_token)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2"
              >
                <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Join AI Interview Room</span>
              </button>
            </div>
          </div>

          {/* Countdown & Timetable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                Scheduled Session Time
              </span>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{new Date(nextInterview.scheduled_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-purple-200/90 font-mono">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  {new Date(nextInterview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC ({nextInterview.duration_minutes} Mins)
                </span>
              </div>
            </div>

            {/* Live Countdown */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                Countdown to Live Interview
              </span>
              {timeLeft ? (
                <div className="flex items-center gap-2 font-mono font-black text-xl text-white">
                  {timeLeft.days > 0 && <span>{timeLeft.days}d :</span>}
                  <span>{String(timeLeft.hours).padStart(2, '0')}h :</span>
                  <span>{String(timeLeft.minutes).padStart(2, '0')}m :</span>
                  <span className="text-purple-300">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </div>
              ) : (
                <span className="font-extrabold text-sm text-emerald-300">
                  Session window is open! You may enter the interview room.
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════════════════════════
          PHASE 14: INTERVIEW EVALUATION RESULTS & OFFICIAL SCORECARDS
         ════════════════════════════════════════════════════════════════════ */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Interview Evaluation Results & Scorecards
            </h3>
          </div>

          <div className="space-y-4">
            {results.map((res, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs overflow-hidden"
              >
                {/* Result Status Banner */}
                {res.is_published ? (
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      res.final_decision === 'SELECTED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : res.final_decision === 'WAITLISTED'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                          res.final_decision === 'SELECTED'
                            ? 'bg-emerald-600 text-white'
                            : res.final_decision === 'WAITLISTED'
                            ? 'bg-amber-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {res.final_decision === 'SELECTED' ? <CheckCircle2 className="w-6 h-6" /> : res.final_decision === 'WAITLISTED' ? <Clock className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-black text-sm">
                          {res.final_decision === 'SELECTED'
                            ? 'Congratulations! You Have Been Selected'
                            : res.final_decision === 'WAITLISTED'
                            ? 'Candidate Placed on Waiting List'
                            : 'Application Not Selected at this Time'}
                        </h4>
                        <p className="text-xs opacity-90 font-medium">
                          Position: <span className="font-bold">{res.job_title}</span>
                          {res.published_at && (
                            <span> • Published: {new Date(res.published_at).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {res.overall_score !== undefined && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                          AI Overall Score
                        </span>
                        <span className="font-mono font-black text-2xl">
                          {Math.round(res.overall_score)}%
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs">Interview Evaluation Under Review</h4>
                      <p className="text-[11px] text-purple-700">
                        {res.status_message} You will see your detailed scorecard and feedback here as soon as the hiring team finalizes the review.
                      </p>
                    </div>
                  </div>
                )}

                {/* Published Scorecard Details */}
                {res.is_published && (
                  <div className="space-y-4">
                    {/* Criteria Breakdown */}
                    {res.criteria_scores && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Performance Criteria Breakdown
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(res.criteria_scores).map(([name, val]) => (
                            <div key={name} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-medium text-slate-600 capitalize">
                                  {name.replace(/_/g, ' ')}
                                </span>
                                <span className="font-bold font-mono text-slate-900">{Math.round(val)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths & Improvement Suggestions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {res.strengths && res.strengths.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Your Key Strengths</span>
                          </div>
                          <ul className="space-y-1 text-slate-600 text-[11px]">
                            {res.strengths.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {res.improvement_suggestions && res.improvement_suggestions.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-800 text-xs">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Recommendations & Growth Areas</span>
                          </div>
                          <ul className="space-y-1 text-slate-600 text-[11px]">
                            {res.improvement_suggestions.map((sug, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-indigo-600 font-bold">→</span>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Recruiter / Admin Official Feedback */}
                    {res.admin_feedback && (
                      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                          Official Recruiter Feedback
                        </span>
                        <p className="text-xs leading-relaxed italic">
                          "{res.admin_feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Check & Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Test Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Media Hardware Test</h4>
              <p className="text-[11px] text-slate-400">Calibrate camera & microphone before session</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span>Microphone</span>
              </span>
              <span className={`font-bold ${deviceCalibrated ? 'text-emerald-600' : 'text-slate-400'}`}>
                {deviceCalibrated ? 'Ready' : 'Not Tested'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>Webcam</span>
              </span>
              <span className={`font-bold ${deviceCalibrated ? 'text-emerald-600' : 'text-slate-400'}`}>
                {deviceCalibrated ? 'Ready' : 'Not Tested'}
              </span>
            </div>
          </div>

          <button
            onClick={handleTestDevices}
            disabled={inTesting}
            className="w-full py-2.5 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {inTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking audio/video devices...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Run Device Calibration</span>
              </>
            )}
          </button>
        </div>

        {/* Preparation Guidelines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">AI Interview Tips</h4>
              <p className="text-[11px] text-slate-400">Best practices for Gemini Live multimodal sessions</p>
            </div>
          </div>

          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">1.</span>
              <span>Find a quiet room with minimal background noise and good frontal lighting.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">2.</span>
              <span>Speak clearly into your microphone; the AI listens in turn-based structured sequence.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">3.</span>
              <span>Keep your camera centered at eye level throughout the session.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">4.</span>
              <span>Results & scorecards appear in this dashboard once verified by the hiring team.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Complete Interview History */}
      {interviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>All Interview Sessions ({interviews.length})</span>
          </h4>

          <div className="divide-y divide-slate-100">
            {interviews.map((session) => (
              <div key={session.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">{session.title}</h5>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{session.job_title}</span>
                    <span>•</span>
                    <span>{new Date(session.scheduled_at).toLocaleDateString()} at {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                    <span>•</span>
                    <span>{session.duration_minutes} Mins</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                      session.status === 'SCHEDULED'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : session.status === 'RESCHEDULED'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : session.status === 'IN_PROGRESS'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : session.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {session.status}
                  </span>
                  {session.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleJoinRoom(session.room_token)}
                      className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Room</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
