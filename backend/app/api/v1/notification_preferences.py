from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.notification_preference import NotificationPreference
from app.models.user import User
from app.schemas.notification_preference import (
    NotificationPreferenceCreate,
    NotificationPreferenceListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)

router = APIRouter()


@router.get("", response_model=NotificationPreferenceListResponse)
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


@router.post("", response_model=NotificationPreferenceResponse)
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


@router.get("/{preference_id}", response_model=NotificationPreferenceResponse)
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


@router.put("/{preference_id}", response_model=NotificationPreferenceResponse)
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


@router.delete("/{preference_id}")
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
