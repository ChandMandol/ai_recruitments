from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class QuestionAnalysisItem(BaseModel):
    question_number: int
    question: str
    candidate_answer_summary: str
    feedback: str
    score: float

    model_config = ConfigDict(from_attributes=True)


class InterviewEvaluationResponse(BaseModel):
    id: str
    interview_id: str
    application_id: str
    candidate_id: str
    job_id: str

    # Criteria Scores (0 - 100)
    technical_knowledge: float
    problem_solving: float
    answer_relevance: float
    conceptual_understanding: float
    communication_clarity: float
    job_compatibility: float
    overall_score: float

    # AI Breakdown
    question_analysis: List[Dict[str, Any]] = Field(default_factory=list)
    individual_scores: Dict[str, float] = Field(default_factory=dict)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    improvement_suggestions: List[str] = Field(default_factory=list)
    overall_evaluation: str
    ai_recommendation: str

    # Admin Control
    final_decision: str
    admin_notes: Optional[str] = None
    is_published: bool
    published_at: Optional[datetime] = None
    decided_at: Optional[datetime] = None
    created_at: datetime

    # Display Helpers
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminDecisionUpdate(BaseModel):
    final_decision: str = Field(..., description="SELECTED | REJECTED | WAITLISTED")
    admin_notes: Optional[str] = Field(None, description="Optional feedback / reasoning from recruiter")
    is_published: bool = Field(True, description="Whether the decision is published to candidate")


class CandidateResultResponse(BaseModel):
    is_evaluated: bool
    is_published: bool
    interview_id: Optional[str] = None
    job_title: Optional[str] = None
    final_decision: Optional[str] = None
    overall_score: Optional[float] = None
    criteria_scores: Optional[Dict[str, float]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    improvement_suggestions: Optional[List[str]] = None
    overall_evaluation: Optional[str] = None
    admin_feedback: Optional[str] = None
    published_at: Optional[datetime] = None
    status_message: str

    model_config = ConfigDict(from_attributes=True)
