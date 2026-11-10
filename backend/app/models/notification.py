from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class NotificationType(str, Enum):
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEW_REMINDER = "INTERVIEW_REMINDER"
    RESULT_PUBLISHED = "RESULT_PUBLISHED"
    APPLICATION_STATUS_UPDATED = "APPLICATION_STATUS_UPDATED"
    NEW_APPLICATION = "NEW_APPLICATION"
    SYSTEM = "SYSTEM"


class Notification(Base, UUIDMixin, TimestampMixin):
    """User notifications table for real-time and in-app system events."""
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        String(50), default=NotificationType.SYSTEM.value, nullable=False, index=True
    )
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
