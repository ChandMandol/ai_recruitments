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

