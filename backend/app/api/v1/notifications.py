from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.schemas.notification_preference import (
    NotificationPreferenceCreate,
    NotificationPreferenceListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from app.schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionResponse

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    category: Optional[str] = Query(None, description="Filter by category"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    search: Optional[str] = Query(None, description="Search in title/message"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(Notification).where(Notification.user_id == current_user.id)

    if category:
        base = base.where(Notification.category == category)
    if urgency:
        base = base.where(Notification.urgency == urgency)
    if is_read is not None:
        base = base.where(Notification.is_read == is_read)
    if search:
        pattern = f"%{search}%"
        base = base.where(
            Notification.title.ilike(pattern) | Notification.message.ilike(pattern)
        )

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0

    query = base.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()

    return NotificationListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    )
    count = result.scalar()
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/mark-read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.put("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    notifications = result.scalars().all()

    for notification in notifications:
        notification.is_read = True

    await db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.post("/push-subscribe", response_model=PushSubscriptionResponse)
async def push_subscribe(
    data: PushSubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == data.endpoint,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    subscription = PushSubscription(
        user_id=current_user.id,
        endpoint=data.endpoint,
        p256dh_key=data.p256dh_key,
        auth_key=data.auth_key,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.put("/{notification_id}/mark-unread", response_model=NotificationResponse)
async def mark_notification_unread(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = False
    await db.commit()
    await db.refresh(notification)
    return notification


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.delete(notification)
    await db.commit()
    return {"message": "Notification deleted"}


@router.put("/bulk/mark-read", response_model=dict)
async def bulk_mark_read(
    ids: list[UUID] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.id.in_(ids), Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": f"Marked {len(ids)} notifications as read"}


@router.delete("/bulk/delete", response_model=dict)
async def bulk_delete_notifications(
    ids: list[UUID] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(Notification).where(
            Notification.id.in_(ids), Notification.user_id == current_user.id
        )
    )
    await db.commit()
    return {"message": f"Deleted {len(ids)} notifications"}


@router.delete("/push-unsubscribe")
async def push_unsubscribe(
    endpoint: str = Query(..., description="Push subscription endpoint URL"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == endpoint,
        )
    )
    await db.commit()
    return {"message": "Push subscription removed"}


@router.get("/preferences", response_model=NotificationPreferenceListResponse)
async def list_notification_preferences(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(NotificationPreference).where(NotificationPreference.user_id == current_user.id)

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0

    query = base.order_by(NotificationPreference.category).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()

    return NotificationPreferenceListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/preferences", response_model=NotificationPreferenceResponse)
async def create_notification_preference(
    data: NotificationPreferenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id,
            NotificationPreference.category == data.category,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Preference for this category already exists")

    preference = NotificationPreference(
        user_id=current_user.id,
        category=data.category,
        enabled=data.enabled,
        min_urgency_level=data.min_urgency_level.value,
        quiet_hours_start=data.quiet_hours_start,
        quiet_hours_end=data.quiet_hours_end,
        email_enabled=data.email_enabled,
        push_enabled=data.push_enabled,
        digest_frequency=data.digest_frequency.value,
    )
    db.add(preference)
    await db.commit()
    await db.refresh(preference)
    return preference


@router.get("/preferences/{preference_id}", response_model=NotificationPreferenceResponse)
async def get_notification_preference(
    preference_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.id == preference_id,
            NotificationPreference.user_id == current_user.id,
        )
    )
    preference = result.scalar_one_or_none()
    if not preference:
        raise HTTPException(status_code=404, detail="Notification preference not found")

    return preference


@router.put("/preferences/{preference_id}", response_model=NotificationPreferenceResponse)
async def update_notification_preference(
    preference_id: UUID,
    data: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.id == preference_id,
            NotificationPreference.user_id == current_user.id,
        )
    )
    preference = result.scalar_one_or_none()
    if not preference:
        raise HTTPException(status_code=404, detail="Notification preference not found")

    update_data = data.model_dump(exclude_unset=True)
    if "min_urgency_level" in update_data:
        update_data["min_urgency_level"] = update_data["min_urgency_level"].value
    if "digest_frequency" in update_data:
        update_data["digest_frequency"] = update_data["digest_frequency"].value

    for field, value in update_data.items():
        setattr(preference, field, value)

    await db.commit()
    await db.refresh(preference)
    return preference


@router.delete("/preferences/{preference_id}")
async def delete_notification_preference(
    preference_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.id == preference_id,
            NotificationPreference.user_id == current_user.id,
        )
    )
    preference = result.scalar_one_or_none()
    if not preference:
        raise HTTPException(status_code=404, detail="Notification preference not found")

    await db.delete(preference)
    await db.commit()
    return {"message": "Notification preference deleted"}
