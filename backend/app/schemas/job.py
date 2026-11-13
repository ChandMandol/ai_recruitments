from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CustomInterviewQuestion(BaseModel):
    id: Optional[str] = None
    question: str = Field(..., min_length=3, description="Interview question")
    expected_answer: str = Field(..., min_length=3, description="Expected model answer")
    keywords: Optional[List[str]] = Field(default_factory=list, description="Target keywords / concepts")

    model_config = ConfigDict(from_attributes=True)


class JobBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Job Title")
    description: str = Field(..., min_length=5, description="Full job description")
    responsibilities: Optional[str] = Field(None, description="Detailed job responsibilities")
    required_skills: List[str] = Field(default_factory=list, description="List of required skills & technologies")
    qualifications: Optional[str] = Field(None, description="Key qualifications & competencies")
    education: Optional[str] = Field(None, description="Minimum education level required")
    experience: Optional[str] = Field(None, description="Years and domain of experience required")
    salary: Optional[str] = Field(None, description="Salary range or compensation details")
    employment_type: str = Field("Full-time", description="Employment type (e.g. Full-time, Remote, Contract)")
    vacancies: int = Field(1, ge=1, description="Number of open vacancies")
    application_deadline: Optional[datetime] = Field(None, description="Application submission deadline")
    department: Optional[str] = Field(None, description="Department or team (e.g. Engineering, AI)")
    location: Optional[str] = Field("Remote", description="Job location or Remote/Hybrid")
    custom_interview_questions: Optional[List[CustomInterviewQuestion]] = Field(
        default_factory=list, description="Admin configured benchmark interview questions with expected answers"
    )


class JobCreate(JobBase):
    is_published: bool = Field(False, description="Whether to publish immediately")
    status: Optional[str] = Field("DRAFT", description="Job status: DRAFT or PUBLISHED")


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, min_length=5)
    responsibilities: Optional[str] = None
    required_skills: Optional[List[str]] = None
    qualifications: Optional[str] = None
    education: Optional[str] = None
    experience: Optional[str] = None
    salary: Optional[str] = None
    employment_type: Optional[str] = None
    vacancies: Optional[int] = Field(None, ge=1)
    application_deadline: Optional[datetime] = None
    department: Optional[str] = None
    location: Optional[str] = None
    is_published: Optional[bool] = None
    status: Optional[str] = None
    custom_interview_questions: Optional[List[CustomInterviewQuestion]] = None


class JobStatusUpdate(BaseModel):
    is_published: bool = Field(..., description="Target publication state")


class JobResponse(JobBase):
    id: str
    status: str
    is_published: bool
    created_by_id: str
    company_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    applicants_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    size: int
