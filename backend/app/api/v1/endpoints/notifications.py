from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification_service import (
    get_unread_count,
    get_user_notifications,
    mark_all_as_read,
    mark_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/my", response_model=NotificationListResponse)
async def get_my_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(30, ge=1, le=100, description="Max notifications to retrieve"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch notifications for the logged-in user with live unread counter."""
    notifications = await get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
    )
    unread_count = await get_unread_count(db=db, user_id=current_user.id)

    return NotificationListResponse(
        unread_count=unread_count,
        total=len(notifications),
        items=[NotificationResponse.model_validate(n) for n in notifications],
    )


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    notif = await mark_as_read(db=db, notification_id=notification_id, user_id=current_user.id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied.",
        )
    return NotificationResponse.model_validate(notif)


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications for current user as read."""
    count = await mark_all_as_read(db=db, user_id=current_user.id)
    return {"message": "All notifications marked as read.", "count": count}
