from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.application import JobApplication
    from app.models.interview import InterviewSchedule
    from app.models.job import Job
    from app.models.user import User


class FinalDecision(str, Enum):
    PENDING = "PENDING"
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"
    WAITLISTED = "WAITLISTED"


class InterviewEvaluation(Base, UUIDMixin, TimestampMixin):
    """
    AI-powered interview evaluation report and Admin final hiring decision.
    Generated upon interview completion; reviewed and published by Admin.
    """
    __tablename__ = "interview_evaluations"

    interview_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("interview_schedules.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Evaluation Criteria Scores (0.0 to 100.0) ──────────────────────────────
    technical_knowledge: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    problem_solving: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    answer_relevance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    conceptual_understanding: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    communication_clarity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    job_compatibility: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)

    # ── AI Comprehensive Report ────────────────────────────────────────────────
    question_analysis: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    individual_scores: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict, nullable=False)
    strengths: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    weaknesses: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    improvement_suggestions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    overall_evaluation: Mapped[str] = mapped_column(Text, nullable=False)
    ai_recommendation: Mapped[str] = mapped_column(String(50), default="RECOMMENDED", nullable=False)

    # ── Human Admin Final Decision & Publishing Control ────────────────────────
    final_decision: Mapped[str] = mapped_column(
        String(50), default=FinalDecision.PENDING.value, nullable=False, index=True
    )
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    interview: Mapped["InterviewSchedule"] = relationship("InterviewSchedule", foreign_keys=[interview_id])
    application: Mapped["JobApplication"] = relationship("JobApplication", foreign_keys=[application_id])
    candidate: Mapped["User"] = relationship("User", foreign_keys=[candidate_id])
    job: Mapped["Job"] = relationship("Job", foreign_keys=[job_id])
    decided_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[decided_by_id])
