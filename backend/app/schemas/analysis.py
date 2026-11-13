from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CVAnalysisResponse(BaseModel):
    id: str
    application_id: str
    job_id: str
    candidate_id: str
    overall_score: int = Field(..., ge=0, le=100)
    recommendation: str
    recommendation_reason: str
    extracted_profile: Dict[str, Any]
    skill_matching: Dict[str, Any]
    experience_matching: Dict[str, Any]
    education_matching: Dict[str, Any]
    strengths: List[str]
    weaknesses: List[str]
    suggested_questions: List[str]
    raw_cv_text_snippet: Optional[str] = None
    analyzed_at: datetime

    # Display conveniences
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class GeminiConfigResponse(BaseModel):
    has_api_key: bool
    key_source: str  # "DATABASE", "ENVIRONMENT_VARIABLE", "NONE"
    masked_key: Optional[str] = None
    model: str
    status: str


class GeminiConfigUpdate(BaseModel):
    api_key: str = Field(..., min_length=10, description="Google Gemini API Key")
    model: Optional[str] = Field("gemini-2.0-flash", description="Gemini Model Identifier")


class SmtpConfigResponse(BaseModel):
    host: str
    port: int
    user: str
    has_password: bool
    masked_password: Optional[str] = None
    from_name: str
    is_enabled: bool
    source: str
    status: str


class SmtpConfigUpdate(BaseModel):
    host: str = Field("smtp.gmail.com", min_length=3)
    port: int = Field(587, ge=1, le=65535)
    user: str = Field(..., description="Gmail address or SMTP user")
    password: Optional[str] = Field(None, description="Gmail App Password (leave empty to retain current password)")
    from_name: Optional[str] = Field("AI Recruitment Hub", description="Sender display name")
    is_enabled: bool = Field(True, description="Enable or disable automated email notifications")


class SmtpTestRequest(BaseModel):
    recipient_email: str = Field(..., description="Destination email address to receive test email")


class CloudinaryConfigResponse(BaseModel):
    cloud_name: str
    api_key: str
    has_secret: bool
    masked_secret: Optional[str] = None
    is_enabled: bool
    source: str
    status: str


class CloudinaryConfigUpdate(BaseModel):
    cloud_name: str = Field(..., min_length=2, description="Cloudinary Cloud Name")
    api_key: str = Field(..., min_length=2, description="Cloudinary API Key")
    api_secret: Optional[str] = Field(None, description="Cloudinary API Secret (leave empty to retain current)")
    is_enabled: bool = Field(True, description="Enable or disable Cloudinary cloud resume storage")

