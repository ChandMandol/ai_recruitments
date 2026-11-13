export interface QuestionDetail {
  index: number;
  round_number: number;
  question: string;
  topic: string;
  candidate_answer?: string | null;
  is_correct?: boolean | null;
  score?: number | null;
  feedback?: string | null;
  model_answer?: string | null;
}

export interface RoundDetail {
  round_number: number;
  questions_count: number;
  min_required_correct: number;
  correct_count: number;
  is_completed: boolean;
  passed?: boolean | null;
  questions: QuestionDetail[];
}

export interface SummaryReport {
  verdict: string;
  total_questions: number;
  total_correct: number;
  accuracy_percentage: number;
  performance_tier: string;
  summary_narrative: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  topic_breakdown: Record<string, number>;
  termination_reason?: string | null;
}

export interface AssessmentResponse {
  id: string;
  candidate_id: string;
  job_category: string;
  interview_level: string;
  cv_filename?: string | null;
  status: 'IN_PROGRESS' | 'TERMINATED_EARLY' | 'COMPLETED' | 'CONFIGURING';
  current_round: number;
  current_question_index: number;
  total_questions_asked: number;
  total_correct: number;
  active_question?: QuestionDetail | null;
  rounds: RoundDetail[];
  summary_report?: SummaryReport | null;
  termination_reason?: string | null;
  created_at: string;
}

export interface AnswerEvaluationResponse {
  question_index: number;
  is_correct: boolean;
  score: number;
  feedback: string;
  model_answer: string;
  round_completed: boolean;
  round_passed?: boolean | null;
  session_status: string;
  termination_reason?: string | null;
  next_question?: QuestionDetail | null;
  summary_report?: SummaryReport | null;
}

