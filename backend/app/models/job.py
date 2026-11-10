from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.application import JobApplication
    from app.models.company import Company
    from app.models.user import User


class Job(Base, UUIDMixin, TimestampMixin):
    """Job entity posted by Admin / Company."""
    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    responsibilities: Mapped[str | None] = mapped_column(Text, nullable=True)
    required_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    qualifications: Mapped[str | None] = mapped_column(Text, nullable=True)
    education: Mapped[str | None] = mapped_column(String(255), nullable=True)
    experience: Mapped[str | None] = mapped_column(String(100), nullable=True)
    salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(50), default="Full-time", nullable=False)
    vacancies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    application_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Additional categorization
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(150), default="Remote", nullable=True)

    # Publishing & status lifecycle
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", index=True, nullable=False)  # DRAFT, PUBLISHED, ARCHIVED
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    # Relations
    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped["User"] = relationship("User", back_populates="jobs_created")

    company_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    company: Mapped["Company | None"] = relationship("Company", back_populates="jobs")

    applications: Mapped[List["JobApplication"]] = relationship(
        "JobApplication", back_populates="job", cascade="all, delete-orphan"
    )
