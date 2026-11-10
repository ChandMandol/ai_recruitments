import api from './client';
import type { Job } from './jobs';
import type { CVAnalysisReport } from './evaluations';

export interface CandidateBrief {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface CandidateDetailProfile {
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  skills: string[];
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  experience: Array<{ role?: string; company?: string; duration?: string; description?: string }>;
  projects: Array<{ title?: string; technologies?: string; link?: string; description?: string }>;
  certifications: Array<{ name?: string; issuer?: string; year?: string }>;
}

export type ApplicationStatusType =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'WAITING_LIST'
  | 'INTERVIEW_SCHEDULED'
  | 'EVALUATED'
  | 'ACCEPTED'
  | 'REJECTED';

export interface JobApplication {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_url?: string | null;
  resume_filename?: string | null;
  cover_letter?: string | null;
  status: ApplicationStatusType;
  ai_match_score?: number | null;
  ai_match_summary?: string | null;
  admin_notes?: string | null;
  applied_at: string;
  created_at: string;
  job?: Job;
  candidate?: CandidateBrief;
  candidate_profile?: CandidateDetailProfile | null;
  ai_report?: CVAnalysisReport | null;
}

export interface ApplicationListResponse {
  items: JobApplication[];
  total: number;
}

export interface ApplicationCreateData {
  job_id: string;
  resume_url?: string;
  resume_filename?: string;
  cover_letter?: string;
}

export interface CandidateCompareResponse {
  applications: JobApplication[];
  comparison_summary?: string | null;
}

export const applicationsApi = {
  // Candidate Endpoints
  applyForJob: async (data: ApplicationCreateData) => {
    const response = await api.post<JobApplication>('/applications', data);
    return response.data;
  },

  getMyApplications: async () => {
    const response = await api.get<ApplicationListResponse>('/applications/my');
    return response.data;
  },

  checkApplicationStatus: async (jobId: string) => {
    const response = await api.get<{
      has_applied: boolean;
      application_id?: string | null;
      status?: string | null;
      applied_at?: string | null;
    }>(`/applications/check/${jobId}`);
    return response.data;
  },

  // Admin Endpoints
  getAdminApplications: async (params?: { job_id?: string; status?: string; search?: string }) => {
    const response = await api.get<ApplicationListResponse>('/applications/admin/all', { params });
    return response.data;
  },

  getApplicationDetails: async (applicationId: string) => {
    const response = await api.get<JobApplication>(`/applications/${applicationId}/details`);
    return response.data;
  },

  updateApplicationStatus: async (
    applicationId: string,
    data: {
      status: string;
      ai_match_score?: number;
      ai_match_summary?: string;
      admin_notes?: string;
    }
  ) => {
    const response = await api.patch<JobApplication>(`/applications/${applicationId}/status`, data);
    return response.data;
  },

  compareCandidates: async (applicationIds: string[]) => {
    const response = await api.post<CandidateCompareResponse>('/applications/admin/compare', {
      application_ids: applicationIds,
    });
    return response.data;
  },
};
