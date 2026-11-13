import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Alert } from '../../components/Alert';
import { jobsApi, type Job, type JobCreateData, type CustomInterviewQuestion } from '../../api/jobs';

export const JobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const initialFormState: JobCreateData = {
    title: '',
    description: '',
    responsibilities: '',
    required_skills: [],
    qualifications: '',
    education: '',
    experience: '',
    salary: '',
    employment_type: 'Full-time',
    vacancies: 1,
    application_deadline: '',
    department: '',
    location: 'Remote',
    is_published: false,
  };
  const [formData, setFormData] = useState<JobCreateData>(initialFormState);
  const [skillsInput, setSkillsInput] = useState('');
  const [customQuestions, setCustomQuestions] = useState<CustomInterviewQuestion[]>([]);

  const samplePresets: CustomInterviewQuestion[] = [
    {
      question: 'How do you approach database indexing and query optimization?',
      expected_answer: 'B-Tree indexing avoids full table scan, reduces disk I/O, gives O(log N) lookup time. Write operations (INSERT/UPDATE) have overhead due to index maintenance.',
      keywords: ['B-Tree', 'table scan', 'disk I/O', 'O(log N)', 'write overhead'],
    },
    {
      question: 'Explain how you handle concurrency, race conditions, and idempotency in distributed APIs.',
      expected_answer: 'Use database row-level locking (SELECT FOR UPDATE) or optimistic locking with version columns, distributed Redis mutex/Redlock, and idempotent request keys to prevent duplicate operations.',
      keywords: ['optimistic locking', 'row lock', 'idempotency key', 'Redis lock', 'race condition'],
    },
    {
      question: 'What is your strategy for automated testing and zero-downtime deployment in CI/CD?',
      expected_answer: 'Comprehensive unit and integration test suites, static analysis, containerized builds, blue-green or rolling canary deployments with automated health checks and instant rollback triggers.',
      keywords: ['unit tests', 'blue-green', 'canary', 'health checks', 'automated rollback'],
    },
  ];

  const handleAddQuestion = () => {
    setCustomQuestions([
      ...customQuestions,
      { question: '', expected_answer: '', keywords: [] },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (
    index: number,
    field: keyof CustomInterviewQuestion,
    value: any
  ) => {
    const updated = [...customQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomQuestions(updated);
  };

  const handleLoadSampleQuestions = () => {
    setCustomQuestions(samplePresets);
  };

  // Fetch jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await jobsApi.getAdminJobs({
        search: searchQuery || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setJobs(data.items);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to load jobs from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const openCreateModal = () => {
    setEditingJob(null);
    setFormData(initialFormState);
    setSkillsInput('');
    setCustomQuestions([]);
    setShowModal(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      responsibilities: job.responsibilities || '',
      required_skills: job.required_skills || [],
      qualifications: job.qualifications || '',
      education: job.education || '',
      experience: job.experience || '',
      salary: job.salary || '',
      employment_type: job.employment_type || 'Full-time',
      vacancies: job.vacancies || 1,
      application_deadline: job.application_deadline ? job.application_deadline.slice(0, 10) : '',
      department: job.department || '',
      location: job.location || 'Remote',
      is_published: job.is_published,
    });
    setSkillsInput((job.required_skills || []).join(', '));
    setCustomQuestions(job.custom_interview_questions || []);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const skillsArray = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validQuestions = customQuestions
      .filter((q) => q.question.trim().length > 0)
      .map((q) => ({
        ...q,
        keywords: Array.isArray(q.keywords)
          ? q.keywords
          : typeof q.keywords === 'string'
          ? (q.keywords as string).split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
          : [],
      }));

    const payload: JobCreateData = {
      ...formData,
      required_skills: skillsArray,
      vacancies: Number(formData.vacancies) || 1,
      application_deadline: formData.application_deadline
        ? new Date(formData.application_deadline).toISOString()
        : undefined,
      custom_interview_questions: validQuestions,
    };

    try {
      if (editingJob) {
        await jobsApi.updateJob(editingJob.id, payload);
        setAlert({ type: 'success', message: 'Job updated successfully!' });
      } else {
        await jobsApi.createJob(payload);
        setAlert({ type: 'success', message: 'Job created successfully!' });
      }
      setShowModal(false);
      fetchJobs();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save job.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (job: Job) => {
    try {
      if (job.is_published) {
        await jobsApi.unpublishJob(job.id);
        setAlert({ type: 'success', message: `Job "${job.title}" has been unpublished (Draft).` });
      } else {
        await jobsApi.publishJob(job.id);
        setAlert({ type: 'success', message: `Job "${job.title}" has been published live!` });
      }
      fetchJobs();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update job status.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await jobsApi.deleteJob(id);
      setAlert({ type: 'success', message: 'Job deleted successfully.' });
      setDeleteConfirmId(null);
      fetchJobs();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to delete job.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>Job Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit, publish, unpublish, and manage job vacancies for AI screening.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Job</span>
        </button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search title, department, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Jobs' : tab === 'PUBLISHED' ? 'Published' : 'Drafts'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Loading jobs from PostgreSQL...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-700">No Jobs Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No jobs matching "${searchQuery}". Try a different keyword.`
                : 'Get started by creating your first job opening.'}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              Post a Job Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Job Title & Department</th>
                  <th className="py-3.5 px-4">Type & Location</th>
                  <th className="py-3.5 px-4">Experience & Vacancies</th>
                  <th className="py-3.5 px-4">Required Skills</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{job.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{job.department || 'General'}</span>
                        {job.salary && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-medium">{job.salary}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 font-medium">{job.employment_type}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-semibold">{job.experience || 'Not specified'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" />
                        <span>{job.vacancies} {job.vacancies === 1 ? 'Opening' : 'Openings'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {job.required_skills && job.required_skills.length > 0 ? (
                          job.required_skills.slice(0, 3).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold border border-indigo-100"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None specified</span>
                        )}
                        {job.required_skills && job.required_skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold self-center">
                            +{job.required_skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePublish(job)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          job.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Click to toggle Publish / Unpublish"
                      >
                        {job.is_published ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Live / Published</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTogglePublish(job)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                          title={job.is_published ? 'Unpublish Job' : 'Publish Job'}
                        >
                          {job.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => openEditModal(job)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Job"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(job.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Job"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create / Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {editingJob ? 'Edit Job Posting' : 'Create New Job Opening'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Full Stack AI Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering, AI Research"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Employment Type, Vacancies, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vacancies</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.vacancies}
                    onChange={(e) => setFormData({ ...formData, vacancies: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Remote / Dhaka / Hybrid"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 3: Salary, Experience, Education */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salary / Compensation</label>
                  <input
                    type="text"
                    placeholder="e.g. $90,000 - $120,000 / year"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience Required</label>
                  <input
                    type="text"
                    placeholder="e.g. 3-5 years"
                    value={formData.experience || ''}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Education</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Sc in Computer Science"
                    value={formData.education || ''}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Application Deadline & Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={formData.application_deadline || ''}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Required Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Python, FastAPI, React, TypeScript, PostgreSQL"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Comprehensive description of the role and team goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Key Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="Key day-to-day duties and deliverables..."
                  value={formData.responsibilities || ''}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications & Requirements</label>
                <textarea
                  rows={2}
                  placeholder="Required domain qualifications, certifications or competencies..."
                  value={formData.qualifications || ''}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* AI Interview Questions & Expected Answers Builder */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-purple-50/40 border border-indigo-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        AI Interview Questions & Benchmark Model Answers
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      ইন্টারভিউ চলাকালীন AI এই প্রশ্নগুলো করবে। প্রার্থীর উত্তরকে আপনার দেওয়া <strong>আদর্শ উত্তরের (Expected Answer)</strong> সাথে মিলিয়ে AI স্বয়ংক্রিয়ভাবে <strong>% Match ও সঠিক/আংশিক/ভুল</strong> এনালাইসিস প্রকাশ করবে।
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {customQuestions.length === 0 && (
                      <button
                        type="button"
                        onClick={handleLoadSampleQuestions}
                        className="px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-xs"
                      >
                        নমুনা প্রশ্ন লোড করুন
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                {customQuestions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/70 border border-indigo-100/70 text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      কোনো কাস্টম প্রশ্ন যোগ করা হয়নি। আপনি চাইলে নির্দিষ্ট প্রশ্ন ও উত্তর যোগ করতে পারেন অথবা ডিফল্ট AI প্রশ্ন দিয়ে ইন্টারভিউ চালাতে পারেন।
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadSampleQuestions}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    >
                      Click to load 3 standard technical benchmark questions
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {customQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white border border-indigo-100/80 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px]">
                            Question #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Interview Question (প্রশ্ন) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. How does database indexing improve query performance?"
                            value={q.question}
                            onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Expected Benchmark Answer (প্রত্যাশিত মডেল উত্তর) <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="e.g. B-Tree structure avoids full table scan, reduces disk I/O, gives O(log N) lookup time. Write operations (INSERT/UPDATE) have overhead due to index maintenance."
                            value={q.expected_answer}
                            onChange={(e) => handleUpdateQuestion(idx, 'expected_answer', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Key Concepts / Keywords (মূল ধারণা বা কীওয়ার্ড, কমা দিয়ে আলাদা করুন)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. B-Tree, table scan, disk I/O, O(log N), write overhead"
                            value={Array.isArray(q.keywords) ? q.keywords.join(', ') : (q.keywords || '')}
                            onChange={(e) => handleUpdateQuestion(idx, 'keywords', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publishToggle"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="publishToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Publish immediately (Visible to candidate browse jobs portal)
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingJob ? 'Save Changes' : 'Create Job'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Delete Job Opening?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this job? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
