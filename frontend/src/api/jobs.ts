import api from './client';

export interface Job {
  id: string;
  title: string;
  description: string;
  responsibilities?: string | null;
  required_skills: string[];
  qualifications?: string | null;
  education?: string | null;
  experience?: string | null;
  salary?: string | null;
  employment_type: string;
  vacancies: number;
  application_deadline?: string | null;
  department?: string | null;
  location?: string | null;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  is_published: boolean;
  created_by_id: string;
  company_id?: string | null;
  created_at: string;
  updated_at: string;
  applicants_count: number;
}

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  size: number;
}

export interface JobCreateData {
  title: string;
  description: string;
  responsibilities?: string;
  required_skills: string[];
  qualifications?: string;
  education?: string;
  experience?: string;
  salary?: string;
  employment_type: string;
  vacancies: number;
  application_deadline?: string;
  department?: string;
  location?: string;
  is_published?: boolean;
  status?: string;
}

export interface JobUpdateData extends Partial<JobCreateData> {}

export const jobsApi = {
  // Admin endpoints
  getAdminJobs: async (params?: { search?: string; status?: string; page?: number; size?: number }) => {
    const response = await api.get<JobListResponse>('/jobs/admin/all', { params });
    return response.data;
  },

  createJob: async (data: JobCreateData) => {
    const response = await api.post<Job>('/jobs', data);
    return response.data;
  },

  updateJob: async (id: string, data: JobUpdateData) => {
    const response = await api.put<Job>(`/jobs/${id}`, data);
    return response.data;
  },

  publishJob: async (id: string) => {
    const response = await api.patch<Job>(`/jobs/${id}/publish`);
    return response.data;
  },

  unpublishJob: async (id: string) => {
    const response = await api.patch<Job>(`/jobs/${id}/unpublish`);
    return response.data;
  },

  deleteJob: async (id: string) => {
    const response = await api.delete<{ message: string; id: string }>(`/jobs/${id}`);
    return response.data;
  },

  // Public / Candidate endpoints
  getPublicJobs: async (params?: { search?: string; department?: string; employment_type?: string }) => {
    const response = await api.get<JobListResponse>('/jobs', { params });
    return response.data;
  },

  getJobById: async (id: string) => {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },
};
