from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter()


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(require_role("admin", "shopkeeper", "customer")),
    db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == current_user.id, Notification.is_read == False
        )
    )).scalar()
    return UnreadCountResponse(count=count or 0)


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    type: str | None = None,
    current_user: User = Depends(require_role("admin", "shopkeeper", "customer")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
    if type:
        try:
            ntype = NotificationType(type)
            query = query.where(Notification.type == ntype)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid notification type: {type}")
    result = await db.execute(query)
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


@router.patch("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    current_user: User = Depends(require_role("admin", "shopkeeper", "customer")),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False).values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper", "customer")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    n.is_read = True
    await db.commit()
    await db.refresh(n)
    return NotificationResponse.model_validate(n)
