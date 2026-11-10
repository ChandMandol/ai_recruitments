from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.analysis import CVAnalysisReport
    from app.models.interview import InterviewSchedule
    from app.models.job import Job
    from app.models.user import User


class ApplicationStatus(str, Enum):
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    SHORTLISTED = "SHORTLISTED"
    WAITING_LIST = "WAITING_LIST"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    EVALUATED = "EVALUATED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class JobApplication(Base, UUIDMixin, TimestampMixin):
    """Job application submitted by a candidate."""
    __tablename__ = "job_applications"
    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_job_candidate_application"),
    )

    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), default=ApplicationStatus.APPLIED.value, index=True, nullable=False
    )
    ai_match_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_match_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="applications")
    candidate: Mapped["User"] = relationship("User", back_populates="applications")
    analysis_report: Mapped[Optional["CVAnalysisReport"]] = relationship(
        "CVAnalysisReport", back_populates="application", uselist=False, cascade="all, delete-orphan"
    )
    interviews: Mapped[list["InterviewSchedule"]] = relationship(
        "InterviewSchedule", back_populates="application", cascade="all, delete-orphan"
    )

