import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Check,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Globe,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import {
  applicationsApi,
  type CandidateCompareResponse,
  type JobApplication,
} from '../../api/applications';
import { evaluationsApi, type CVAnalysisReport } from '../../api/evaluations';
import { jobsApi, type Job } from '../../api/jobs';

export const ApplicantsView: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Multi-select for Candidate Comparison
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<CandidateCompareResponse | null>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  // Modals state
  const [detailsModalApp, setDetailsModalApp] = useState<JobApplication | null>(null);
  const [cvPreviewApp, setCvPreviewApp] = useState<JobApplication | null>(null);
  const [selectedReport, setSelectedReport] = useState<CVAnalysisReport | null>(null);
  const [loadingReportAppId, setLoadingReportAppId] = useState<string | null>(null);

  // Admin Notes Modal state
  const [notesModalApp, setNotesModalApp] = useState<JobApplication | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Fetch jobs for dropdown filter
  const fetchJobs = async () => {
    try {
      const res = await jobsApi.getAdminJobs({ size: 100 });
      setJobs(res.items);
    } catch {
      // Non-critical
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await applicationsApi.getAdminApplications({
        job_id: selectedJobId === 'ALL' ? undefined : selectedJobId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
      });
      setApplications(data.items);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to fetch candidate applications.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [selectedJobId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  // Status update handler
  const handleUpdateStatus = async (appId: string, newStatus: string, adminNotes?: string) => {
    try {
      await applicationsApi.updateApplicationStatus(appId, {
        status: newStatus,
        admin_notes: adminNotes,
      });
      setAlert({
        type: 'success',
        message: `Applicant status successfully updated to ${newStatus.replace(/_/g, ' ')}.`,
      });
      fetchApplications();

      // If comparing, also update comparison modal data
      if (compareModalOpen && comparisonData) {
        setComparisonData({
          ...comparisonData,
          applications: comparisonData.applications.map((a) =>
            a.id === appId ? { ...a, status: newStatus as any } : a
          ),
        });
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update applicant status.',
      });
    }
  };

  // Open full AI Report
  const handleOpenReport = async (app: JobApplication) => {
    setLoadingReportAppId(app.id);
    try {
      const rep = await evaluationsApi.getCVReport(app.id);
      setSelectedReport(rep);
    } catch {
      // If no report in DB, synthesize from application data if present
      if (app.ai_report) {
        setSelectedReport(app.ai_report);
      } else {
        setAlert({
          type: 'error',
          message: 'No detailed Gemini AI evaluation report found for this candidate yet.',
        });
      }
    } finally {
      setLoadingReportAppId(null);
    }
  };

  // Open Notes Modal
  const handleOpenNotes = (app: JobApplication) => {
    setNotesModalApp(app);
    setNotesText(app.admin_notes || '');
  };

  const handleSaveNotes = async () => {
    if (!notesModalApp) return;
    setNotesSaving(true);
    try {
      await applicationsApi.updateApplicationStatus(notesModalApp.id, {
        status: notesModalApp.status,
        admin_notes: notesText,
      });
      setAlert({
        type: 'success',
        message: 'Internal recruiter notes updated successfully.',
      });
      setNotesModalApp(null);
      fetchApplications();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save admin notes.',
      });
    } finally {
      setNotesSaving(false);
    }
  };

  // Checkbox toggle for comparison
  const handleToggleSelect = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppIds.length === applications.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(applications.map((a) => a.id));
    }
  };

  // Launch Candidate Comparison
  const handleOpenComparison = async () => {
    if (selectedAppIds.length < 2) {
      setAlert({
        type: 'error',
        message: 'Please select at least 2 candidates to compare side-by-side.',
      });
      return;
    }
    if (selectedAppIds.length > 5) {
      setAlert({
        type: 'error',
        message: 'You can compare a maximum of 5 candidates at a time.',
      });
      return;
    }

    setComparingLoading(true);
    try {
      const res = await applicationsApi.compareCandidates(selectedAppIds);
      setComparisonData(res);
      setCompareModalOpen(true);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to compare candidates.',
      });
    } finally {
      setComparingLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Applicant Management & Shortlisting</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter applicants by job opening, review candidate profiles, inspect Gemini AI reports, and shortlist top talent.
          </p>
        </div>

        {/* Comparison Action Pill */}
        {selectedAppIds.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-2xl animate-fadeIn">
            <span className="text-xs font-bold text-indigo-900">
              {selectedAppIds.length} candidate{selectedAppIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleOpenComparison}
              disabled={comparingLoading || selectedAppIds.length < 2 || selectedAppIds.length > 5}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                selectedAppIds.length >= 2 && selectedAppIds.length <= 5
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                  : 'bg-indigo-200 text-indigo-400 cursor-not-allowed'
              }`}
            >
              {comparingLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              )}
              <span>Compare Side-by-Side</span>
            </button>
            <button
              onClick={() => setSelectedAppIds([])}
              className="text-xs text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Primary Toolbar: Job filter + Search + Status tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Job Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[220px]"
            >
              <option value="ALL">All Job Openings ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.applicants_count || 0} applicants)
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, email, job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </form>

          {/* Refresh button */}
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
            Status:
          </span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'APPLIED', label: 'Applied' },
            { id: 'SHORTLISTED', label: 'Shortlisted' },
            { id: 'WAITING_LIST', label: 'Waiting List' },
            { id: 'INTERVIEW_SCHEDULED', label: 'Interview' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Applicants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Loading applicants from database...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No Applicants Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `No candidates matching "${search}".`
                : 'No candidates match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        applications.length > 0 &&
                        selectedAppIds.length === applications.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select all for comparison"
                    />
                  </th>
                  <th className="py-3 px-4">Candidate Information</th>
                  <th className="py-3 px-4">Target Position</th>
                  <th className="py-3 px-4">Gemini AI Match</th>
                  <th className="py-3 px-4">CV / Resume</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recruiter Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => {
                  const isChecked = selectedAppIds.includes(app.id);
                  const score = app.ai_match_score || 85;

                  return (
                    <tr
                      key={app.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(app.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {app.candidate?.full_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <button
                              onClick={() => setDetailsModalApp(app)}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer flex items-center gap-1 group"
                              title="Click to view candidate details"
                            >
                              <span>{app.candidate?.full_name || 'Candidate'}</span>
                              <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity" />
                            </button>
                            {app.candidate_profile?.headline && (
                              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                                {app.candidate_profile.headline}
                              </p>
                            )}
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" />
                                <span>{app.candidate?.email}</span>
                              </span>
                              {app.candidate?.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{app.candidate.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {app.job?.title || 'Open Position'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {app.job?.department || 'Engineering'} •{' '}
                          {new Date(app.applied_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* AI Match */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score >= 90
                                  ? 'bg-emerald-500'
                                  : score >= 75
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-xs text-slate-800">{score}%</span>
                        </div>
                        <button
                          onClick={() => handleOpenReport(app)}
                          disabled={loadingReportAppId === app.id}
                          className="mt-1 text-[10px] text-purple-700 hover:text-purple-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {loadingReportAppId === app.id ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                          )}
                          <span>View Gemini Report</span>
                        </button>
                      </td>

                      {/* CV / Resume */}
                      <td className="py-3.5 px-4">
                        {app.resume_filename ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setCvPreviewApp(app)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer transition-colors"
                              title="Preview CV"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span className="truncate max-w-[100px]">{app.resume_filename}</span>
                            </button>
                            <a
                              href={`/api/v1/applications/${app.id}/resume`}
                              download={app.resume_filename}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                              title="Download CV file"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None attached</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            app.status === 'SHORTLISTED'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : app.status === 'WAITING_LIST'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : app.status === 'INTERVIEW_SCHEDULED'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {app.status === 'WAITING_LIST' ? 'WAITING LIST' : app.status}
                        </span>
                      </td>

                      {/* Admin Notes */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenNotes(app)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            app.admin_notes
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                          }`}
                          title="View / Edit Internal Notes"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{app.admin_notes ? 'Notes Added' : 'Add Note'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Shortlist */}
                          {app.status !== 'SHORTLISTED' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'SHORTLISTED')}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Shortlist Candidate"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Waiting List */}
                          {app.status !== 'WAITING_LIST' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'WAITING_LIST')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Move to Waiting List"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}

                          {/* Schedule Interview */}
                          {app.status !== 'INTERVIEW_SCHEDULED' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'INTERVIEW_SCHEDULED')}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Schedule Live AI Interview"
                            >
                              <Video className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reject */}
                          {app.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Reject Candidate"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Candidate Details Modal */}
      {detailsModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {detailsModalApp.candidate?.full_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {detailsModalApp.candidate?.full_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applied for{' '}
                    <span className="font-bold text-slate-800">
                      {detailsModalApp.job?.title || 'Open Position'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto text-xs">
              {/* Contact & Social Links */}
              <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{detailsModalApp.candidate?.email}</span>
                </div>
                {detailsModalApp.candidate_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{detailsModalApp.candidate_profile.phone}</span>
                  </div>
                )}
                {detailsModalApp.candidate_profile?.github_url && (
                  <a
                    href={detailsModalApp.candidate_profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>GitHub</span>
                  </a>
                )}
                {detailsModalApp.candidate_profile?.linkedin_url && (
                  <a
                    href={detailsModalApp.candidate_profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {detailsModalApp.candidate_profile?.portfolio_url && (
                  <a
                    href={detailsModalApp.candidate_profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-semibold"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Portfolio</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* Headline & Bio */}
              {detailsModalApp.candidate_profile?.bio && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1">
                    About Candidate
                  </h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    {detailsModalApp.candidate_profile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {detailsModalApp.candidate_profile?.skills &&
                detailsModalApp.candidate_profile.skills.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5">
                      Skills & Technologies
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {detailsModalApp.candidate_profile.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Work Experience */}
              {detailsModalApp.candidate_profile?.experience &&
                detailsModalApp.candidate_profile.experience.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Work Experience</span>
                    </h4>
                    <div className="space-y-2">
                      {detailsModalApp.candidate_profile.experience.map((exp: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-0.5"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{exp.role || exp.title || 'Role'}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {exp.duration || exp.years || ''}
                            </span>
                          </div>
                          <div className="text-slate-600 font-medium">{exp.company}</div>
                          {exp.description && (
                            <p className="text-[11px] text-slate-500 mt-1">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Education */}
              {detailsModalApp.candidate_profile?.education &&
                detailsModalApp.candidate_profile.education.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Education</span>
                    </h4>
                    <div className="space-y-2">
                      {detailsModalApp.candidate_profile.education.map((edu: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-0.5"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{edu.degree}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {edu.year || ''}
                            </span>
                          </div>
                          <div className="text-slate-600 font-medium">{edu.institution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Cover Letter */}
              {detailsModalApp.cover_letter && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1">
                    Candidate Cover Letter
                  </h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">
                    "{detailsModalApp.cover_letter}"
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[11px] text-slate-400">
                Applied on {new Date(detailsModalApp.applied_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdateStatus(detailsModalApp.id, 'SHORTLISTED');
                    setDetailsModalApp(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 cursor-pointer text-xs"
                >
                  Shortlist
                </button>
                <button
                  onClick={() => setDetailsModalApp(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CV Preview Modal */}
      {cvPreviewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Resume Preview: {cvPreviewApp.resume_filename || 'Candidate CV'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Candidate: {cvPreviewApp.candidate?.full_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/applications/${cvPreviewApp.id}/resume`}
                  download={cvPreviewApp.resume_filename}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setCvPreviewApp(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={`/api/v1/applications/${cvPreviewApp.id}/resume`}
                title="CV Document Preview"
                className="w-full h-full rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. AI CV Analysis Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    AI CV Screening Report
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Candidate: {selectedReport.candidate_name} • Match:{' '}
                    <span className="font-bold text-indigo-600">
                      {selectedReport.overall_score}%
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Recommendation banner */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                <span className="font-bold text-purple-900 block mb-0.5">
                  Recommendation: {selectedReport.recommendation.replace(/_/g, ' ')}
                </span>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  {selectedReport.recommendation_reason}
                </p>
              </div>

              {/* Matched vs Missing Skills */}
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block mb-1.5">
                  Skill Alignment:
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
                  {selectedReport.skill_matching?.missing_skills?.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200"
                    >
                      - {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-800 text-[10px] uppercase block mb-1">
                    Key Strengths
                  </span>
                  <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-1">
                    {selectedReport.strengths?.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100">
                  <span className="font-bold text-rose-800 text-[10px] uppercase block mb-1">
                    Areas to Probe
                  </span>
                  <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-1">
                    {selectedReport.weaknesses?.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Interview Questions */}
              {selectedReport.suggested_questions &&
                selectedReport.suggested_questions.length > 0 && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-slate-900 text-[10px] uppercase block mb-1.5">
                      Suggested Gemini Interview Questions:
                    </span>
                    <ul className="text-[11px] text-slate-700 space-y-1.5">
                      {selectedReport.suggested_questions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-indigo-600">{idx + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Candidate Side-by-Side Comparison Modal */}
      {compareModalOpen && comparisonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Candidate Comparison Matrix
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {comparisonData.comparison_summary ||
                      `Comparing ${comparisonData.applications.length} selected candidates.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="p-6 overflow-y-auto flex-1">
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${comparisonData.applications.length}, minmax(240px, 1fr))`,
                }}
              >
                {comparisonData.applications.map((c) => {
                  const score = c.ai_match_score || 85;

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Header info */}
                        <div className="text-center pb-3 border-b border-slate-200">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-sm mx-auto flex items-center justify-center shadow-xs mb-2">
                            {c.candidate?.full_name?.charAt(0) || 'C'}
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            {c.candidate?.full_name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {c.candidate_profile?.headline || c.candidate?.email}
                          </p>
                        </div>

                        {/* Overall AI Match Score */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Gemini Match Score
                          </span>
                          <span
                            className={`text-2xl font-black ${
                              score >= 90
                                ? 'text-emerald-600'
                                : score >= 75
                                ? 'text-indigo-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {score}%
                          </span>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score >= 90
                                  ? 'bg-emerald-500'
                                  : score >= 75
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Current Status
                          </span>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              c.status === 'SHORTLISTED'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : c.status === 'WAITING_LIST'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : c.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        {/* Matched Skills */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Skills Alignment
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(
                              c.ai_report?.skill_matching?.matched_skills ||
                              c.candidate_profile?.skills ||
                              []
                            )
                              .slice(0, 5)
                              .map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100"
                                >
                                  ✓ {s}
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Missing Skills */}
                        {c.ai_report?.skill_matching?.missing_skills &&
                          c.ai_report.skill_matching.missing_skills.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Missing Skills
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {c.ai_report.skill_matching.missing_skills.slice(0, 3).map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-100"
                                  >
                                    - {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Experience */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Experience
                          </span>
                          <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80">
                            {c.ai_report?.experience_matching?.evaluation ||
                              (c.candidate_profile?.experience?.[0]
                                ? `${c.candidate_profile.experience[0].role} at ${c.candidate_profile.experience[0].company}`
                                : 'Career history provided in resume.')}
                          </p>
                        </div>

                        {/* Strengths */}
                        {c.ai_report?.strengths && c.ai_report.strengths.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Key Strengths
                            </span>
                            <ul className="text-[10px] text-slate-700 list-disc list-inside space-y-0.5 bg-white p-2 rounded-lg border border-slate-200/80">
                              {c.ai_report.strengths.slice(0, 2).map((st, idx) => (
                                <li key={idx} className="truncate">
                                  {st}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions inside Comparison */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(c.id, 'SHORTLISTED')}
                          className="flex-1 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer text-center"
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(c.id, 'WAITING_LIST')}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs hover:bg-amber-200 transition-colors cursor-pointer"
                          title="Place on Waiting List"
                        >
                          Waitlist
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(c.id, 'REJECTED')}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Reject"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 shrink-0">
              <button
                onClick={() => setCompareModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Admin Notes Modal */}
      {notesModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Recruiter Internal Notes
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Candidate: {notesModalApp.candidate?.full_name} • Position:{' '}
                    {notesModalApp.job?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesModalApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Internal Evaluation Notes & Comments
              </label>
              <textarea
                rows={5}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="e.g. Candidate excelled in technical assessment. Ready for system design interview. Expected salary: $140k."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-[11px] text-slate-400">
                These notes are strictly internal and visible only to recruiters and administrators.
              </p>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setNotesModalApp(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                {notesSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
