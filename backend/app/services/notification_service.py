import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole

logger = logging.getLogger("ai_recruitment_hub.notifications")


async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    message: str,
    type: str = NotificationType.SYSTEM.value,
    link_url: Optional[str] = None,
) -> Notification:
    """Create and persist an in-app notification for a single user."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link_url=link_url,
        is_read=False,
    )
    db.add(notification)
    await db.flush()
    logger.info(f"Notification created for user {user_id}: [{type}] {title}")
    return notification


async def notify_admins(
    db: AsyncSession,
    title: str,
    message: str,
    type: str = NotificationType.SYSTEM.value,
    link_url: Optional[str] = None,
) -> List[Notification]:
    """Create notifications for all active administrators."""
    stmt = select(User).where(
        User.role.in_([UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]),
        User.is_active == True,
    )
    result = await db.execute(stmt)
    admins = result.scalars().all()

    created_notifications: List[Notification] = []
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            title=title,
            message=message,
            type=type,
            link_url=link_url,
            is_read=False,
        )
        db.add(notif)
        created_notifications.append(notif)

    if created_notifications:
        await db.flush()
        logger.info(f"Dispatched admin notification to {len(created_notifications)} admin(s): {title}")

    return created_notifications


async def get_user_notifications(
    db: AsyncSession,
    user_id: str,
    unread_only: bool = False,
    limit: int = 25,
) -> List[Notification]:
    """Fetch notifications for a user, ordered from newest to oldest."""
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: str) -> int:
    """Count how many unread notifications the user has."""
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.is_read == False,
    )
    result = await db.execute(stmt)
    return result.scalar_one() or 0


async def mark_as_read(
    db: AsyncSession,
    notification_id: str,
    user_id: str,
) -> Optional[Notification]:
    """Mark a single notification as read."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    result = await db.execute(stmt)
    notif = result.scalar_one_or_none()
    if not notif:
        return None

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notif)
    return notif


async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
    """Mark all unread notifications for a user as read."""
    now = datetime.now(timezone.utc)
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True, read_at=now)
    )
    result = await db.execute(stmt)
    await db.commit()
    count = result.rowcount or 0
    logger.info(f"Marked {count} notifications as read for user {user_id}")
    return count
