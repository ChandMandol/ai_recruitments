from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class InterviewCreate(BaseModel):
    application_id: str = Field(..., description="Target Job Application UUID")
    scheduled_at: datetime = Field(..., description="UTC Timestamp for interview start")
    duration_minutes: int = Field(30, ge=10, le=180, description="Interview duration in minutes")
    title: Optional[str] = Field(None, description="Interview title (e.g. AI Technical Screening Round)")
    instructions: Optional[str] = Field(None, description="Specific preparation instructions for candidate")
    notes: Optional[str] = Field(None, description="Internal recruiter/admin notes")


class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=10, le=180)
    title: Optional[str] = None
    instructions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class InterviewCancel(BaseModel):
    cancellation_reason: Optional[str] = Field(None, description="Reason for cancelling the interview")


class InterviewResponse(BaseModel):
    id: str
    application_id: str
    candidate_id: str
    job_id: str
    title: str
    scheduled_at: datetime
    duration_minutes: int
    end_at: datetime
    room_token: str
    meeting_link: str
    instructions: Optional[str] = None
    notes: Optional[str] = None
    status: str
    cancellation_reason: Optional[str] = None
    created_at: datetime

    # Display convenience fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    job_department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InterviewListResponse(BaseModel):
    items: List[InterviewResponse]
    total: int


class EligibleCandidateItem(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    job_id: str
    job_title: str
    status: str
    ai_match_score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class EligibleCandidateListResponse(BaseModel):
    items: List[EligibleCandidateItem]
    total: int

