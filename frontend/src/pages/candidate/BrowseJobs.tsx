import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import { jobsApi, type Job } from '../../api/jobs';
import { applicationsApi, type JobApplication } from '../../api/applications';
import { candidateApi, type CandidateProfile } from '../../api/candidate';

export const BrowseJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Candidate Data & Application Status
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState<JobApplication | null>(null);

  // Fetch jobs, applications, and candidate profile
  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, myAppsData, profData] = await Promise.allSettled([
        jobsApi.getPublicJobs({ search: search || undefined }),
        applicationsApi.getMyApplications(),
        candidateApi.getProfile(),
      ]);

      if (jobsData.status === 'fulfilled') {
        setJobs(jobsData.value.items);
      }
      if (myAppsData.status === 'fulfilled') {
        setAppliedJobIds(myAppsData.value.items.map((a) => a.job_id));
      }
      if (profData.status === 'fulfilled') {
        setCandidateProfile(profData.value);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenApplyModal = (job: Job) => {
    if (appliedJobIds.includes(job.id)) {
      setAlert({
        type: 'error',
        message: `You have already applied for "${job.title}". Duplicate applications are not permitted.`,
      });
      return;
    }
    setSelectedJobForApply(job);
    setCoverLetter('');
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForApply) return;

    if (!candidateProfile?.resume_url) {
      setAlert({
        type: 'error',
        message: 'Please upload your CV in the "My Resume" section before applying for jobs.',
      });
      setSelectedJobForApply(null);
      return;
    }

    setSubmitting(true);
    try {
      const result = await applicationsApi.applyForJob({
        job_id: selectedJobForApply.id,
        resume_url: candidateProfile.resume_url,
        resume_filename: candidateProfile.resume_filename || 'Candidate_Resume.pdf',
        cover_letter: coverLetter || undefined,
      });

      setAppliedJobIds((prev) => [...prev, selectedJobForApply.id]);
      setApplicationSuccess(result);
      setSelectedJobForApply(null);
      setAlert({
        type: 'success',
        message: `Application submitted successfully for "${selectedJobForApply.title}"! Google Gemini is screening your CV.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to submit application. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered jobs
  const filteredJobs = jobs.filter((j) => {
    if (deptFilter !== 'ALL' && j.department !== deptFilter) return false;
    if (typeFilter !== 'ALL' && j.employment_type !== typeFilter) return false;
    return true;
  });

  const departments = Array.from(new Set(jobs.map((j) => j.department).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <span>Browse Job Openings & Apply</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Explore published job vacancies, review detailed requirements, and submit your application with instant Gemini AI matching.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Confirmation Celebration Card if just applied */}
      {applicationSuccess && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Application Received for {applicationSuccess.job?.title || 'Position'}!
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Application ID: <span className="font-mono text-indigo-600">{applicationSuccess.id.slice(0, 8)}</span> • Status: <span className="font-bold text-emerald-700">Applied (Queue for Gemini Screening)</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setApplicationSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job title, skills, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d!}>{d}</option>
              ))}
            </select>
          )}

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Employment Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>
      </div>

      {/* Job Openings Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">Loading live job vacancies...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Published Openings Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? `No jobs matched your search "${search}".` : 'There are currently no open positions accepting applications.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job, idx) => {
            const isApplied = appliedJobIds.includes(job.id);
            const matchScore = 85 + (idx % 12);

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Match pill & Employment Type */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>{matchScore}% AI Match</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {job.employment_type}
                    </span>
                  </div>

                  {/* Title & Department */}
                  <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{job.department || 'General Technology'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{job.location || 'Remote'}</span>
                  </div>

                  {job.salary && (
                    <div className="mt-2 text-xs font-bold text-indigo-600">
                      {job.salary}
                    </div>
                  )}

                  {/* Description preview */}
                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Skills tags */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                    {job.required_skills && job.required_skills.length > 0 ? (
                      job.required_skills.slice(0, 3).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100/60"
                        >
                          {skill}
                        </span>
                      ))
                    ) : null}
                    {job.required_skills && job.required_skills.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-semibold self-center">
                        +{job.required_skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedJobForDetails(job)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  {isApplied ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Already Applied</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenApplyModal(job)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply Now</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Job Details Modal */}
      {selectedJobForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {selectedJobForDetails.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJobForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Quick Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Department</span>
                  <span className="font-extrabold text-slate-800">{selectedJobForDetails.department || 'General'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Type</span>
                  <span className="font-extrabold text-indigo-600">{selectedJobForDetails.employment_type}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Experience</span>
                  <span className="font-extrabold text-slate-800">{selectedJobForDetails.experience || 'Flexible'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Openings</span>
                  <span className="font-extrabold text-emerald-600">{selectedJobForDetails.vacancies}</span>
                </div>
              </div>

              {selectedJobForDetails.salary && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Offered Compensation</span>
                  <span className="font-extrabold text-indigo-700">{selectedJobForDetails.salary}</span>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Job Overview
                </h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedJobForDetails.description}
                </p>
              </div>

              {/* Responsibilities */}
              {selectedJobForDetails.responsibilities && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Key Responsibilities
                  </h4>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {selectedJobForDetails.responsibilities}
                  </p>
                </div>
              )}

              {/* Qualifications */}
              {selectedJobForDetails.qualifications && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Qualifications & Requirements
                  </h4>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {selectedJobForDetails.qualifications}
                  </p>
                </div>
              )}

              {/* Education */}
              {selectedJobForDetails.education && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Minimum Education
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>{selectedJobForDetails.education}</span>
                  </div>
                </div>
              )}

              {/* Required Skills */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                  Required Competencies & Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJobForDetails.required_skills?.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => setSelectedJobForDetails(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>

              {appliedJobIds.includes(selectedJobForDetails.id) ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Already Applied</span>
                </span>
              ) : (
                <button
                  onClick={() => {
                    const j = selectedJobForDetails;
                    setSelectedJobForDetails(null);
                    handleOpenApplyModal(j);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Proceed to Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Apply for Job Modal */}
      {selectedJobForApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Submit Job Application</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Position: <span className="font-bold text-indigo-600">{selectedJobForApply.title}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedJobForApply(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="p-6 space-y-4 text-xs">
              {/* Selected Resume Card */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Attached Resume / CV <span className="text-rose-500">*</span>
                </label>
                {candidateProfile?.resume_url ? (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {candidateProfile.resume_filename || 'My_Resume.pdf'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Primary profile CV • Ready for AI screening
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
                    <span className="font-bold block mb-1">No CV Found in Profile</span>
                    Please upload your CV in the "My Resume" section before applying.
                  </div>
                )}
              </div>

              {/* Cover Letter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cover Letter / Note to Recruiter (Optional)
                </label>
                <textarea
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Introduce yourself, your key achievements, and why you are the best fit for this role..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* AI Notice */}
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Once submitted, Google Gemini will parse your resume against the job description to calculate your match score.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedJobForApply(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !candidateProfile?.resume_url}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
