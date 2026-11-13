import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import { AdminEvaluationModal } from '../../components/admin/AdminEvaluationModal';
import {
  interviewsApi,
  type EligibleCandidateItem,
  type InterviewSession,
} from '../../api/interviews';
import { jobsApi, type Job } from '../../api/jobs';

interface InterviewsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({ onNavigateTab }) => {
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [eligibleCandidates, setEligibleCandidates] = useState<EligibleCandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [seedingData, setSeedingData] = useState(false);
  const [editModalSession, setEditModalSession] = useState<InterviewSession | null>(null);
  const [cancelModalSession, setCancelModalSession] = useState<InterviewSession | null>(null);
  const [evalModalSession, setEvalModalSession] = useState<InterviewSession | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Schedule Form State
  const [selectedAppId, setSelectedAppId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('14:00');
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formInstructions, setFormInstructions] = useState(
    'Please ensure your webcam and microphone are tested. Join from a quiet, well-lit environment with stable internet connectivity.'
  );

  // Copy token feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live countdown to next upcoming interview
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [nextUpcoming, setNextUpcoming] = useState<InterviewSession | null>(null);

  // Fetch initial data
  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const data = await interviewsApi.getAdminInterviews({
        job_id: selectedJobId === 'ALL' ? undefined : selectedJobId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
      });
      setInterviews(data.items);

      // Find nearest upcoming scheduled interview
      const now = new Date().getTime();
      const upcoming = data.items
        .filter((i) => (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED') && new Date(i.scheduled_at).getTime() > now)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
      setNextUpcoming(upcoming || null);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to fetch interview schedules.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await jobsApi.getAdminJobs({ size: 100 });
      setJobs(res.items);
    } catch {
      // Non-critical
    }
  };

  const fetchEligibleCandidates = async () => {
    try {
      const res = await interviewsApi.getEligibleCandidates();
      setEligibleCandidates(res.items);
      if (res.items.length > 0 && !selectedAppId) {
        setSelectedAppId(res.items[0].application_id);
        setFormTitle(`AI Technical Interview — ${res.items[0].job_title}`);
      }
    } catch {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchEligibleCandidates();
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [selectedJobId, statusFilter]);

  // Live Countdown Ticker
  useEffect(() => {
    if (!nextUpcoming) {
      setTimeLeft(null);
      return;
    }

    const updateCountdown = () => {
      const target = new Date(nextUpcoming.scheduled_at).getTime();
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

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextUpcoming]);

  // Handle Candidate Selection in Create Modal
  const handleCandidateChange = (appId: string) => {
    setSelectedAppId(appId);
    const cand = eligibleCandidates.find((c) => c.application_id === appId);
    if (cand) {
      setFormTitle(`AI Technical Interview — ${cand.job_title}`);
    }
  };

  // Open Create Modal
  const handleOpenScheduleModal = async () => {
    setModalAlert(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormDate(tomorrow.toISOString().split('T')[0]);
    setScheduleModalOpen(true);

    try {
      const res = await interviewsApi.getEligibleCandidates();
      setEligibleCandidates(res.items);
      if (res.items.length > 0) {
        const isSelectedValid = res.items.some((c) => c.application_id === selectedAppId);
        if (!isSelectedValid || !selectedAppId) {
          setSelectedAppId(res.items[0].application_id);
          setFormTitle(`AI Technical Interview — ${res.items[0].job_title}`);
        }
      } else {
        setSelectedAppId('');
      }
    } catch {
      // Non-critical
    }
  };

  // Quick Seed Demo Candidate and Job
  const handleSeedDemoData = async () => {
    setSeedingData(true);
    setModalAlert(null);
    try {
      const res = await interviewsApi.seedDemoData();
      setModalAlert({
        type: 'success',
        message: res.message || 'Demo candidate & job ready! Candidate shortlisted.',
      });
      const candRes = await interviewsApi.getEligibleCandidates();
      setEligibleCandidates(candRes.items);
      if (candRes.items.length > 0) {
        const target = res.application_id
          ? candRes.items.find((c) => c.application_id === res.application_id) || candRes.items[0]
          : candRes.items[0];
        setSelectedAppId(target.application_id);
        setFormTitle(`AI Technical Interview — ${target.job_title}`);
      }
      fetchJobs();
      fetchInterviews();
    } catch (err: any) {
      setModalAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to seed sample candidate.',
      });
    } finally {
      setSeedingData(false);
    }
  };

  // Submit New Schedule
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalAlert(null);
    if (!selectedAppId) {
      setModalAlert({ type: 'error', message: 'Please select an eligible candidate to schedule an interview.' });
      return;
    }
    if (!formDate || !formTime) {
      setModalAlert({ type: 'error', message: 'Please select both an interview date and start time.' });
      return;
    }

    setSavingSchedule(true);
    try {
      const scheduledAtIso = new Date(`${formDate}T${formTime}:00Z`).toISOString();
      await interviewsApi.scheduleInterview({
        application_id: selectedAppId,
        scheduled_at: scheduledAtIso,
        duration_minutes: formDuration,
        title: formTitle,
        instructions: formInstructions,
      });

      setAlert({
        type: 'success',
        message: 'Interview successfully scheduled! Invitation details and room token generated.',
      });
      setScheduleModalOpen(false);
      fetchInterviews();
      fetchEligibleCandidates();
    } catch (err: any) {
      setModalAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to schedule interview.',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (session: InterviewSession) => {
    setEditModalSession(session);
    const dt = new Date(session.scheduled_at);
    setFormDate(dt.toISOString().split('T')[0]);
    const hh = String(dt.getUTCHours()).padStart(2, '0');
    const mm = String(dt.getUTCMinutes()).padStart(2, '0');
    setFormTime(`${hh}:${mm}`);
    setFormDuration(session.duration_minutes);
    setFormTitle(session.title);
    setFormInstructions(session.instructions || '');
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalSession) return;

    setSavingSchedule(true);
    try {
      const scheduledAtIso = new Date(`${formDate}T${formTime}:00Z`).toISOString();
      await interviewsApi.updateInterview(editModalSession.id, {
        scheduled_at: scheduledAtIso,
        duration_minutes: formDuration,
        title: formTitle,
        instructions: formInstructions,
      });

      setAlert({
        type: 'success',
        message: 'Interview schedule successfully updated.',
      });
      setEditModalSession(null);
      fetchInterviews();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update interview schedule.',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Cancel Interview
  const handleCancelSubmit = async () => {
    if (!cancelModalSession) return;
    setSavingSchedule(true);
    try {
      await interviewsApi.cancelInterview(cancelModalSession.id, cancelReason);
      setAlert({
        type: 'success',
        message: `Interview session with ${cancelModalSession.candidate_name} has been cancelled.`,
      });
      setCancelModalSession(null);
      setCancelReason('');
      fetchInterviews();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to cancel interview.',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleJoinRoom = (roomToken: string) => {
    window.history.pushState({}, '', `/interview/live?room=${roomToken}`);
    window.dispatchEvent(new Event('popstate'));
  };

  // Copy Room Token
  const handleCopyToken = (session: InterviewSession) => {
    const inviteText = `AI Interview Invitation: ${session.title}\nCandidate: ${session.candidate_name}\nScheduled At: ${new Date(session.scheduled_at).toUTCString()}\nDuration: ${session.duration_minutes} Mins\nMeeting Link: ${window.location.origin}${session.meeting_link}\nRoom Token: ${session.room_token}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-600" />
            <span>AI Live Interview Scheduling</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule individual technical interview sessions with conflict-free overlap detection, room token generation, and countdown timers.
          </p>
        </div>

        <button
          onClick={handleOpenScheduleModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Interview</span>
        </button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Live Countdown Hero Banner (if upcoming interview exists) */}
      {nextUpcoming && timeLeft && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-200 border border-purple-400/30">
              <Timer className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Next Upcoming Interview</span>
            </span>
            <h3 className="text-lg font-black text-white">{nextUpcoming.title}</h3>
            <p className="text-xs text-purple-200">
              Candidate: <span className="font-bold text-white">{nextUpcoming.candidate_name}</span> ({nextUpcoming.candidate_email}) • Position: {nextUpcoming.job_title}
            </p>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{new Date(nextUpcoming.scheduled_at).toLocaleDateString()} at {new Date(nextUpcoming.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{nextUpcoming.duration_minutes} Minutes Duration</span>
            </div>
          </div>

          {/* 4-Box Countdown Ticker */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shrink-0">
            {[
              { label: 'DAYS', val: timeLeft.days },
              { label: 'HOURS', val: timeLeft.hours },
              { label: 'MINS', val: timeLeft.minutes },
              { label: 'SECS', val: timeLeft.seconds },
            ].map((unit, idx) => (
              <div key={idx} className="text-center px-2">
                <span className="text-xl sm:text-2xl font-black text-white block tabular-nums">
                  {String(unit.val).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Job Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer min-w-[200px]"
            >
              <option value="ALL">All Job Positions ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, email, job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchInterviews}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
            title="Refresh interview schedules"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
            Status:
          </span>
          {[
            { id: 'ALL', label: 'All Sessions' },
            { id: 'SCHEDULED', label: 'Scheduled' },
            { id: 'RESCHEDULED', label: 'Rescheduled' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interviews Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="text-xs font-semibold">Loading interview schedules from database...</span>
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-14 text-center">
            <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No Interview Schedules Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `No sessions matching "${search}".`
                : 'No interviews have been scheduled yet. Click "Schedule New Interview" to begin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Candidate & Position</th>
                  <th className="py-3.5 px-4">Interview Title</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Meeting Room & Invitation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interviews.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{session.candidate_name || 'Candidate'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span>{session.candidate_email}</span>
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                        {session.job_title}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{session.title}</div>
                      {session.instructions && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5" title={session.instructions}>
                          {session.instructions}
                        </p>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{new Date(session.scheduled_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {session.duration_minutes} Mins
                      </span>
                    </td>

                    {/* Room & Token */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-mono font-bold">
                          {session.room_token}
                        </code>
                        <button
                          onClick={() => handleCopyToken(session)}
                          className="p-1 text-slate-400 hover:text-purple-600 rounded-md transition-colors cursor-pointer"
                          title="Copy Full Invitation & Link"
                        >
                          {copiedId === session.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {copiedId === session.id && (
                        <span className="text-[10px] text-emerald-600 font-bold block mt-0.5 animate-fadeIn">
                          Copied to clipboard!
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
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
                      {session.cancellation_reason && (
                        <p className="text-[10px] text-rose-500 truncate max-w-[150px] mt-0.5" title={session.cancellation_reason}>
                          {session.cancellation_reason}
                        </p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEvalModalSession(session)}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="View AI Evaluation & Make Hiring Decision"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>AI Evaluation</span>
                        </button>

                        {session.status !== 'CANCELLED' && session.status !== 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(session)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Reschedule / Edit Session"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => setCancelModalSession(session)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Session"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleJoinRoom(session.room_token)}
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold cursor-pointer"
                          title="Open Live Interview Room"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Schedule Interview Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Schedule Individual Interview
                </h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 text-xs">
              {/* Modal-Internal Alert Banner */}
              {modalAlert && (
                <div
                  className={`p-3 rounded-xl border flex items-start justify-between text-xs font-semibold gap-2 animate-fadeIn ${
                    modalAlert.type === 'error'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span>{modalAlert.message}</span>
                  <button
                    type="button"
                    onClick={() => setModalAlert(null)}
                    className="cursor-pointer shrink-0 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Candidate Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Candidate & Position:
                </label>
                {eligibleCandidates.length === 0 ? (
                  <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>No shortlisted or applied candidates available right now.</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      To schedule an interview, candidates must have an application in <strong>Applied</strong>, <strong>Shortlisted</strong>, or <strong>Screening</strong> status without an active appointment.
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSeedDemoData}
                        disabled={seedingData}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                      >
                        {seedingData ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>{seedingData ? 'Setting Up...' : 'Quick Seed Demo Candidate'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleModalOpen(false);
                          if (onNavigateTab) {
                            onNavigateTab('applicants');
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-xs cursor-pointer transition-all"
                      >
                        Go to Applicants View
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedAppId}
                    onChange={(e) => handleCandidateChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    required
                  >
                    {eligibleCandidates.map((c) => (
                      <option key={c.application_id} value={c.application_id}>
                        {c.candidate_name} — {c.job_title} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Interview Title:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. AI Technical Screening Round"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Interview Date:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Time (UTC):
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Duration selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Interview Duration:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      type="button"
                      key={mins}
                      onClick={() => setFormDuration(mins)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                        formDuration === mins
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mins} Mins
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Candidate Preparation Instructions:
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Instructions sent in interview invitation..."
                />
              </div>

              {/* Overlap notice */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-2 text-purple-900 text-[11px]">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  The system automatically verifies candidate availability and strictly blocks overlapping interview appointments.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedAppId || savingSchedule}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 ${
                    !selectedAppId || savingSchedule
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white cursor-pointer hover:shadow-md'
                  }`}
                  title={!selectedAppId ? 'Please select or seed an eligible candidate first' : 'Confirm and schedule interview'}
                >
                  {savingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Confirm Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reschedule Modal */}
      {editModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Reschedule Interview: {editModalSession.candidate_name}
                </h3>
              </div>
              <button
                onClick={() => setEditModalSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Date:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Start Time (UTC):
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Duration:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      type="button"
                      key={mins}
                      onClick={() => setFormDuration(mins)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                        formDuration === mins
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mins} Mins
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Updated Instructions:
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalSession(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  {savingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Reschedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Cancel Confirmation Modal */}
      {cancelModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Cancel Interview Session
                </h3>
              </div>
              <button
                onClick={() => setCancelModalSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-700">
                Are you sure you want to cancel the interview for{' '}
                <span className="font-bold text-slate-900">{cancelModalSession.candidate_name}</span>?
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation:
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Position on hold or candidate requested reschedule"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setCancelModalSession(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Keep Active
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={savingSchedule}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                {savingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Evaluation Modal */}
      {evalModalSession && (
        <AdminEvaluationModal
          isOpen={!!evalModalSession}
          interviewId={evalModalSession.id}
          candidateName={evalModalSession.candidate_name || 'Candidate'}
          jobTitle={evalModalSession.job_title || 'Position'}
          onClose={() => setEvalModalSession(null)}
          onDecisionUpdated={() => {
            fetchInterviews();
          }}
        />
      )}
    </div>
  );
};
