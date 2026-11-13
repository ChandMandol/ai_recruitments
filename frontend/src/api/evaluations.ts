import api from './client';

export interface CVAnalysisReport {
  id: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  overall_score: number;
  recommendation:
    | 'RECOMMENDED_FOR_INTERVIEW'
    | 'CONSIDER_WITH_RESERVATIONS'
    | 'REQUIRES_FURTHER_REVIEW';
  recommendation_reason: string;
  extracted_profile: {
    skills?: string[];
    education?: Array<{ degree?: string; institution?: string }>;
    experience?: Array<{ title?: string; company?: string; years?: string }>;
    projects?: Array<{ name?: string; description?: string }>;
    certifications?: string[];
  };
  skill_matching: {
    matched_skills: string[];
    missing_skills: string[];
    match_percentage: number;
  };
  experience_matching: {
    candidate_experience?: string;
    required_experience?: string;
    is_sufficient: boolean;
    evaluation: string;
  };
  education_matching: {
    candidate_education?: string;
    required_education?: string;
    is_sufficient: boolean;
    evaluation: string;
  };
  strengths: string[];
  weaknesses: string[];
  suggested_questions: string[];
  raw_cv_text_snippet?: string | null;
  analyzed_at: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  job_title?: string | null;
}

export interface QuestionAnalysisItem {
  question_number: number;
  question: string;
  expected_answer?: string;
  candidate_answer_summary: string;
  feedback: string;
  score: number;
  is_correct?: boolean;
  similarity_score?: number;
  status?: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | string;
  matched_concepts?: string[];
  missing_concepts?: string[];
}

export interface InterviewEvaluation {
  id: string;
  interview_id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;

  // 6 Core Criteria
  technical_knowledge: number;
  problem_solving: number;
  answer_relevance: number;
  conceptual_understanding: number;
  communication_clarity: number;
  job_compatibility: number;
  overall_score: number;

  // AI Breakdown
  question_analysis: QuestionAnalysisItem[];
  individual_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
  overall_evaluation: string;
  ai_recommendation: string;

  // Human Admin Final Decision & Publishing Control
  final_decision: 'PENDING' | 'SELECTED' | 'REJECTED' | 'WAITLISTED';
  admin_notes?: string | null;
  is_published: boolean;
  published_at?: string | null;
  decided_at?: string | null;
  created_at: string;

  // Display fields
  candidate_name?: string | null;
  candidate_email?: string | null;
  job_title?: string | null;
}

export interface CandidateResult {
  is_evaluated: boolean;
  is_published: boolean;
  interview_id?: string;
  job_title?: string;
  final_decision?: 'SELECTED' | 'REJECTED' | 'WAITLISTED';
  overall_score?: number;
  criteria_scores?: Record<string, number>;
  question_analysis?: QuestionAnalysisItem[];
  strengths?: string[];
  weaknesses?: string[];
  improvement_suggestions?: string[];
  overall_evaluation?: string;
  admin_feedback?: string;
  published_at?: string;
  status_message: string;
}

export interface GeminiConfig {
  has_api_key: boolean;
  key_source: 'DATABASE' | 'ENVIRONMENT_VARIABLE' | 'NONE';
  masked_key?: string | null;
  model: string;
  status: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  has_password: boolean;
  masked_password?: string | null;
  from_name: string;
  is_enabled: boolean;
  source: string;
  status: string;
}

export interface SmtpConfigUpdate {
  host: string;
  port: number;
  user: string;
  password?: string;
  from_name?: string;
  is_enabled: boolean;
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  has_secret: boolean;
  masked_secret?: string | null;
  is_enabled: boolean;
  source: string;
  status: string;
}

export interface CloudinaryConfigUpdate {
  cloud_name: string;
  api_key: string;
  api_secret?: string;
  is_enabled: boolean;
}

export const evaluationsApi = {
  // ── CV Reports ─────────────────────────────────────────────────────────────
  getCVReport: async (applicationId: string) => {
    const response = await api.get<CVAnalysisReport>(`/evaluations/cv/${applicationId}`);
    return response.data;
  },

  triggerCVAnalysis: async (applicationId: string) => {
    const response = await api.post<CVAnalysisReport>(`/evaluations/cv/analyze/${applicationId}`);
    return response.data;
  },

  listAllReports: async () => {
    const response = await api.get<CVAnalysisReport[]>('/evaluations/cv/all/reports');
    return response.data;
  },

  // ── Phase 14: Interview Evaluations & Final Results ────────────────────────
  getInterviewEvaluation: async (interviewId: string) => {
    const response = await api.get<InterviewEvaluation>(`/evaluations/interview/${interviewId}`);
    return response.data;
  },

  triggerInterviewEvaluation: async (interviewId: string) => {
    const response = await api.post<InterviewEvaluation>(`/evaluations/interview/evaluate/${interviewId}`);
    return response.data;
  },

  updateAdminDecision: async (
    interviewId: string,
    payload: {
      final_decision: 'SELECTED' | 'REJECTED' | 'WAITLISTED';
      admin_notes?: string;
      is_published: boolean;
    }
  ) => {
    const response = await api.put<InterviewEvaluation>(
      `/evaluations/interview/${interviewId}/decision`,
      payload
    );
    return response.data;
  },

  getCandidateResults: async () => {
    const response = await api.get<CandidateResult[]>('/evaluations/candidate/my-results');
    return response.data;
  },

  listAllInterviewEvaluations: async () => {
    const response = await api.get<InterviewEvaluation[]>('/evaluations/admin/all-evaluations');
    return response.data;
  },

  // ── Gemini Settings API ────────────────────────────────────────────────────
  getGeminiConfig: async () => {
    const response = await api.get<GeminiConfig>('/admin/settings/gemini');
    return response.data;
  },

  updateGeminiConfig: async (apiKey: string, model?: string) => {
    const response = await api.post<GeminiConfig>('/admin/settings/gemini', {
      api_key: apiKey,
      model: model || 'gemini-2.0-flash',
    });
    return response.data;
  },

  testGeminiConnection: async () => {
    const response = await api.post<{
      success: boolean;
      status_code: number;
      message: string;
      reply?: string;
    }>('/admin/settings/gemini/test');
    return response.data;
  },

  clearGeminiConfig: async () => {
    const response = await api.delete<{ message: string }>('/admin/settings/gemini');
    return response.data;
  },

  // ── Gmail SMTP Dispatcher API ──────────────────────────────────────────────
  getSmtpConfig: async () => {
    const response = await api.get<SmtpConfig>('/admin/settings/smtp');
    return response.data;
  },

  updateSmtpConfig: async (payload: SmtpConfigUpdate) => {
    const response = await api.post<SmtpConfig>('/admin/settings/smtp', payload);
    return response.data;
  },

  testSmtpConnection: async (recipient_email: string) => {
    const response = await api.post<{
      success: boolean;
      message: string;
    }>('/admin/settings/smtp/test', { recipient_email });
    return response.data;
  },

  // ── Cloudinary Cloud Storage API ───────────────────────────────────────────
  getCloudinaryConfig: async () => {
    const response = await api.get<CloudinaryConfig>('/admin/settings/cloudinary');
    return response.data;
  },

  updateCloudinaryConfig: async (payload: CloudinaryConfigUpdate) => {
    const response = await api.post<CloudinaryConfig>('/admin/settings/cloudinary', payload);
    return response.data;
  },

  testCloudinaryConnection: async () => {
    const response = await api.post<{
      success: boolean;
      message: string;
    }>('/admin/settings/cloudinary/test');
    return response.data;
  },
};
