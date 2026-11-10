from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CandidateProfileBase(BaseModel):
    headline: Optional[str] = Field(None, max_length=255, description="Professional headline")
    bio: Optional[str] = Field(None, description="Candidate summary biography")
    phone: Optional[str] = Field(None, max_length=50, description="Phone contact")
    location: Optional[str] = Field(None, max_length=150, description="City, Country")
    github_url: Optional[str] = Field(None, max_length=255, description="GitHub profile URL")
    linkedin_url: Optional[str] = Field(None, max_length=255, description="LinkedIn profile URL")
    portfolio_url: Optional[str] = Field(None, max_length=255, description="Personal portfolio URL")
    skills: List[str] = Field(default_factory=list, description="Array of skill names")
    education: List[Dict[str, Any]] = Field(default_factory=list, description="List of education records")
    experience: List[Dict[str, Any]] = Field(default_factory=list, description="List of work experience records")
    projects: List[Dict[str, Any]] = Field(default_factory=list, description="List of key projects")
    certifications: List[Dict[str, Any]] = Field(default_factory=list, description="List of professional certifications")


class CandidateProfileUpdate(CandidateProfileBase):
    pass


class CandidateProfileResponse(CandidateProfileBase):
    id: str
    user_id: str
    resume_url: Optional[str] = None
    resume_filename: Optional[str] = None
    resume_file_size: Optional[int] = None
    resume_mime_type: Optional[str] = None
    resume_uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

