from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.analysis import CVAnalysisResponse
from app.schemas.job import JobResponse


class CandidateBrief(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateDetailProfile(BaseModel):
    headline: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: List[str] = []
    education: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    job_id: str = Field(..., description="Target Job UUID")
    resume_url: Optional[str] = Field(None, description="Resume file path or URL")
    resume_filename: Optional[str] = Field(None, description="Resume file display name")
    cover_letter: Optional[str] = Field(None, description="Optional candidate cover note")


class ApplicationStatusUpdate(BaseModel):
    status: str = Field(..., description="Target application state (SHORTLISTED, WAITING_LIST, REJECTED, etc.)")
    ai_match_score: Optional[int] = Field(None, ge=0, le=100)
    ai_match_summary: Optional[str] = None
    admin_notes: Optional[str] = Field(None, description="Internal notes written by recruiter / admin")


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    resume_url: Optional[str] = None
    resume_filename: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    ai_match_score: Optional[int] = None
    ai_match_summary: Optional[str] = None
    admin_notes: Optional[str] = None
    applied_at: datetime
    created_at: datetime
    job: Optional[JobResponse] = None
    candidate: Optional[CandidateBrief] = None
    candidate_profile: Optional[CandidateDetailProfile] = None
    ai_report: Optional[CVAnalysisResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationListResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int


class CandidateCompareRequest(BaseModel):
    application_ids: List[str] = Field(..., min_length=2, max_length=5, description="2 to 5 application IDs to compare")


class CandidateCompareResponse(BaseModel):
    applications: List[ApplicationResponse]
    comparison_summary: Optional[str] = None
