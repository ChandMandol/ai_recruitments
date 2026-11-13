import api from './client';
import type {
  AnswerEvaluationResponse,
  AssessmentResponse,
  SummaryReport,
} from '../types/adaptiveInterview';

export const adaptiveInterviewApi = {
  startAssessment: async (formData: FormData): Promise<AssessmentResponse> => {
    const res = await api.post<AssessmentResponse>('/adaptive-interview/start', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getAssessment: async (id: string): Promise<AssessmentResponse> => {
    const res = await api.get<AssessmentResponse>(`/adaptive-interview/${id}`);
    return res.data;
  },

  submitAnswer: async (
    id: string,
    questionIndex: number,
    answerText: string
  ): Promise<AnswerEvaluationResponse> => {
    const res = await api.post<AnswerEvaluationResponse>(
      `/adaptive-interview/${id}/answer`,
      {
        question_index: questionIndex,
        answer_text: answerText,
      }
    );
    return res.data;
  },

  endAssessment: async (id: string, reason?: string): Promise<AssessmentResponse> => {
    const res = await api.post<AssessmentResponse>(
      `/adaptive-interview/${id}/end`,
      null,
      { params: reason ? { reason } : undefined }
    );
    return res.data;
  },

  getHistory: async (): Promise<AssessmentResponse[]> => {
    const res = await api.get<AssessmentResponse[]>('/adaptive-interview/history');
    return res.data;
  },

  getSummary: async (id: string): Promise<SummaryReport> => {
    const res = await api.get<SummaryReport>(`/adaptive-interview/${id}/summary`);
    return res.data;
  },
};

