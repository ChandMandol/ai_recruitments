from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StartAssessmentRequest(BaseModel):
    job_category: str = Field(..., description="Target job domain, e.g. Frontend Developer, DevOps")
    interview_level: str = Field("Mid-Level", description="Junior, Mid-Level, Senior, Lead")
    use_profile_cv: bool = Field(True, description="Use already uploaded profile resume if available")


class SubmitAnswerRequest(BaseModel):
    question_index: int = Field(..., description="1-based index of the question being answered")
    answer_text: str = Field(..., min_length=2, description="Candidate's typed or transcribed spoken answer")


class QuestionDetail(BaseModel):
    index: int
    round_number: int
    question: str
    topic: str
    candidate_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    model_answer: Optional[str] = None


class RoundDetail(BaseModel):
    round_number: int
    questions_count: int
    min_required_correct: int
    correct_count: int = 0
    is_completed: bool = False
    passed: Optional[bool] = None
    questions: List[QuestionDetail] = []


class SummaryReport(BaseModel):
    verdict: str
    total_questions: int
    total_correct: int
    accuracy_percentage: float
    performance_tier: str
    summary_narrative: str
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommendations: List[str] = []
    topic_breakdown: Dict[str, float] = {}


class AssessmentResponse(BaseModel):
    id: str
    candidate_id: str
    job_category: str
    interview_level: str
    cv_filename: Optional[str] = None
    status: str
    current_round: int
    current_question_index: int
    total_questions_asked: int
    total_correct: int
    active_question: Optional[QuestionDetail] = None
    rounds: List[Dict[str, Any]] = []
    summary_report: Optional[Dict[str, Any]] = None
    termination_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnswerEvaluationResponse(BaseModel):
    question_index: int
    is_correct: bool
    score: float
    feedback: str
    model_answer: str
    round_completed: bool
    round_passed: Optional[bool] = None
    session_status: str
    termination_reason: Optional[str] = None
    next_question: Optional[QuestionDetail] = None
    summary_report: Optional[Dict[str, Any]] = None
