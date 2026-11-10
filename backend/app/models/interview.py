from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.application import JobApplication
    from app.models.job import Job
    from app.models.user import User


class InterviewStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    RESCHEDULED = "RESCHEDULED"


class InterviewSchedule(Base, UUIDMixin, TimestampMixin):
    """Interview schedule allocated for a candidate application."""
    __tablename__ = "interview_schedules"

    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    room_token: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    meeting_link: Mapped[str] = mapped_column(String(500), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), default=InterviewStatus.SCHEDULED.value, nullable=False, index=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    application: Mapped["JobApplication"] = relationship("JobApplication", back_populates="interviews")
    candidate: Mapped["User"] = relationship("User", foreign_keys=[candidate_id])
    job: Mapped["Job"] = relationship("Job", foreign_keys=[job_id])
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])

