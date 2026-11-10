import api from './client';

export interface CandidateProfile {
  id: string;
  user_id: string;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  skills: string[];
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
    grade?: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    period?: string;
    description?: string;
  }>;
  projects: Array<{
    title: string;
    tech?: string[];
    link?: string;
    description?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    year?: string;
    link?: string;
  }>;
  resume_url?: string | null;
  resume_filename?: string | null;
  resume_file_size?: number | null;
  resume_mime_type?: string | null;
  resume_uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const candidateApi = {
  getProfile: async () => {
    const response = await api.get<CandidateProfile>('/candidate/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<CandidateProfile>) => {
    const response = await api.put<CandidateProfile>('/candidate/profile', data);
    return response.data;
  },

  uploadResume: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<CandidateProfile>('/candidate/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteResume: async () => {
    const response = await api.delete<CandidateProfile>('/candidate/resume');
    return response.data;
  },
};

