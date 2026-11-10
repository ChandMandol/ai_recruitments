from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class CandidateProfile(Base, UUIDMixin, TimestampMixin):
    """Candidate profile containing personal info, CV metadata, and career history."""
    __tablename__ = "candidate_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")

    # Personal Information
    headline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Social & Professional Links
    github_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Career & Background Details (Stored as Structured JSON)
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    education: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    experience: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    projects: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    certifications: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Secure CV Upload Metadata
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resume_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resume_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
