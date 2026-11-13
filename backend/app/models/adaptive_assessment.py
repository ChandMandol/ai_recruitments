from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class AssessmentStatus(str, Enum):
    CONFIGURING = "CONFIGURING"
    IN_PROGRESS = "IN_PROGRESS"
    TERMINATED_EARLY = "TERMINATED_EARLY"
    COMPLETED = "COMPLETED"


class AssessmentLevel(str, Enum):
    JUNIOR = "Junior"
    MID = "Mid-Level"
    SENIOR = "Senior"
    LEAD = "Lead"


class AdaptiveAssessment(Base, UUIDMixin, TimestampMixin):
    """
    Adaptive AI Interview Assessment.
    CV-based dynamic interview with adaptive progression:
    - Round 1: 5 questions (must get >= 1 correct, else terminated early)
    - Subsequent Rounds: 2 questions each (must get >= 1 correct per round, else terminated early)
    - Maximum 20 questions total.
    - AI-generated summary report upon completion.
    """
    __tablename__ = "adaptive_assessments"

    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    interview_level: Mapped[str] = mapped_column(String(50), default="Mid-Level", nullable=False)

    cv_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cv_text_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), default=AssessmentStatus.IN_PROGRESS.value, nullable=False, index=True
    )

    total_questions_asked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_round: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_question_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Rounds & questions history: list of round dicts containing questions, user answers, scores, feedback
    rounds_data: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # Final AI comprehensive summary report
    summary_report: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )

    termination_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    candidate: Mapped["User"] = relationship("User", backref="adaptive_assessments")
