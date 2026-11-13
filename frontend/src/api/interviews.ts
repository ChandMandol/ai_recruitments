import api from './client';

export interface InterviewSession {
  id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  end_at: string;
  room_token: string;
  meeting_link: string;
  instructions?: string | null;
  notes?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  cancellation_reason?: string | null;
  created_at: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  job_title?: string | null;
  job_department?: string | null;
}

export interface InterviewListResponse {
  items: InterviewSession[];
  total: number;
}

export interface InterviewCreateData {
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  title?: string;
  instructions?: string;
  notes?: string;
}

export interface InterviewUpdateData {
  scheduled_at?: string;
  duration_minutes?: number;
  title?: string;
  instructions?: string;
  notes?: string;
  status?: string;
}

export interface EligibleCandidateItem {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  status: string;
  ai_match_score?: number | null;
}

export interface EligibleCandidateListResponse {
  items: EligibleCandidateItem[];
  total: number;
}

export const interviewsApi = {
  // Admin endpoints
  getAdminInterviews: async (params?: { job_id?: string; status?: string; search?: string }) => {
    const response = await api.get<InterviewListResponse>('/interviews/admin/all', { params });
    return response.data;
  },

  getEligibleCandidates: async (jobId?: string) => {
    const response = await api.get<EligibleCandidateListResponse>('/interviews/admin/eligible-candidates', {
      params: jobId ? { job_id: jobId } : undefined,
    });
    return response.data;
  },

  scheduleInterview: async (data: InterviewCreateData) => {
    const response = await api.post<InterviewSession>('/interviews', data);
    return response.data;
  },

  updateInterview: async (id: string, data: InterviewUpdateData) => {
    const response = await api.put<InterviewSession>(`/interviews/${id}`, data);
    return response.data;
  },

  cancelInterview: async (id: string, cancellationReason?: string) => {
    const response = await api.post<InterviewSession>(`/interviews/${id}/cancel`, {
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },

  seedDemoData: async () => {
    const response = await api.post<{
      success: boolean;
      message: string;
      candidate_id?: string;
      job_id?: string;
      application_id?: string;
    }>('/admin/seed-demo-data');
    return response.data;
  },

  // Candidate endpoints
  getMyInterviews: async () => {
    const response = await api.get<InterviewListResponse>('/interviews/my');
    return response.data;
  },

  getInterviewDetail: async (id: string) => {
    const response = await api.get<InterviewSession>(`/interviews/${id}`);
    return response.data;
  },
};

