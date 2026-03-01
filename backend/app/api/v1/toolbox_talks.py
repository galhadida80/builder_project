import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.toolbox_talk import ToolboxTalk, TalkAttendee, TalkStatus
from app.models.user import User
from app.schemas.toolbox_talk import (
    ToolboxTalkCreate,
    ToolboxTalkResponse,
    ToolboxTalkUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import notify_user
from app.utils import utcnow

logger = logging.getLogger(__name__)
router = APIRouter()

TALK_LOAD_OPTIONS = [
    selectinload(ToolboxTalk.created_by),
    selectinload(ToolboxTalk.attendees).selectinload(TalkAttendee.worker),
]


@router.get("/toolbox-talks", response_model=list[ToolboxTalkResponse])
async def list_toolbox_talks(
    project_id: UUID = Query(..., description="Project ID"),
    status: str | None = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(db, current_user.id, project_id)

    query = select(ToolboxTalk).options(*TALK_LOAD_OPTIONS).where(
        ToolboxTalk.project_id == project_id
    )

    if status:
        query = query.where(ToolboxTalk.status == status)

    query = query.order_by(ToolboxTalk.scheduled_date.desc())

    result = await db.execute(query)
    talks = result.scalars().all()
    return talks


@router.post(
    "/projects/{project_id}/toolbox-talks",
    response_model=ToolboxTalkResponse,
    status_code=201,
)
async def create_toolbox_talk(
    project_id: UUID,
    talk_data: ToolboxTalkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=require_permission(Permission.CREATE),
):
    await verify_project_access(db, current_user.id, project_id)

    # Prepare key points and action items as JSON
    key_points = [kp.model_dump() for kp in talk_data.key_points] if talk_data.key_points else []
    action_items = [ai.model_dump() for ai in talk_data.action_items] if talk_data.action_items else []

    # Create toolbox talk
    talk = ToolboxTalk(
        project_id=project_id,
        title=talk_data.title,
        topic=talk_data.topic,
        description=talk_data.description,
        scheduled_date=talk_data.scheduled_date,
        location=talk_data.location,
        presenter=talk_data.presenter,
        key_points=key_points,
        action_items=action_items,
        duration_minutes=talk_data.duration_minutes,
        status=TalkStatus.SCHEDULED.value,
        created_by_id=current_user.id,
    )

    db.add(talk)
    await db.flush()

    # Add attendees
    if talk_data.attendee_ids:
        for attendee_id_str in talk_data.attendee_ids:
            try:
                worker_id = UUID(attendee_id_str)
                attendee = TalkAttendee(
                    talk_id=talk.id,
                    worker_id=worker_id,
                    attended=True,
                )
                db.add(attendee)
            except (ValueError, TypeError):
                logger.warning(f"Invalid attendee ID: {attendee_id_str}")
                continue

    await db.commit()
    await db.refresh(talk, attribute_names=["created_by", "attendees"])

    # Audit log
    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        resource_type="toolbox_talk",
        resource_id=talk.id,
        project_id=project_id,
        details={"title": talk.title, "topic": talk.topic},
    )

    # Notify project members
    await notify_user(
        db=db,
        user_id=current_user.id,
        project_id=project_id,
        notification_type="toolbox_talk_created",
        title=f"New Toolbox Talk: {talk.title}",
        message=f"{talk.topic} scheduled for {talk.scheduled_date.strftime('%Y-%m-%d %H:%M')}",
        related_id=talk.id,
    )

    return talk


@router.get("/toolbox-talks/{talk_id}", response_model=ToolboxTalkResponse)
async def get_toolbox_talk(
    talk_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ToolboxTalk).options(*TALK_LOAD_OPTIONS).where(ToolboxTalk.id == talk_id)
    )
    talk = result.scalar_one_or_none()

    if not talk:
        raise HTTPException(status_code=404, detail="Toolbox talk not found")

    await verify_project_access(db, current_user.id, talk.project_id)
    return talk


@router.put("/toolbox-talks/{talk_id}", response_model=ToolboxTalkResponse)
async def update_toolbox_talk(
    talk_id: UUID,
    talk_data: ToolboxTalkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=require_permission(Permission.EDIT),
):
    result = await db.execute(
        select(ToolboxTalk).options(*TALK_LOAD_OPTIONS).where(ToolboxTalk.id == talk_id)
    )
    talk = result.scalar_one_or_none()

    if not talk:
        raise HTTPException(status_code=404, detail="Toolbox talk not found")

    await verify_project_access(db, current_user.id, talk.project_id)

    old_values = get_model_dict(talk)

    # Update fields
    update_data = talk_data.model_dump(exclude_unset=True, exclude={"attendee_ids"})

    # Handle key_points and action_items
    if "key_points" in update_data and update_data["key_points"] is not None:
        update_data["key_points"] = [kp.model_dump() if hasattr(kp, 'model_dump') else kp for kp in update_data["key_points"]]
    if "action_items" in update_data and update_data["action_items"] is not None:
        update_data["action_items"] = [ai.model_dump() if hasattr(ai, 'model_dump') else ai for ai in update_data["action_items"]]

    for field, value in update_data.items():
        setattr(talk, field, value)

    talk.updated_at = utcnow()

    # Update attendees if provided
    if talk_data.attendee_ids is not None:
        # Remove existing attendees
        await db.execute(
            select(TalkAttendee).where(TalkAttendee.talk_id == talk_id)
        )
        result = await db.execute(
            select(TalkAttendee).where(TalkAttendee.talk_id == talk_id)
        )
        existing_attendees = result.scalars().all()
        for att in existing_attendees:
            await db.delete(att)

        # Add new attendees
        for attendee_id_str in talk_data.attendee_ids:
            try:
                worker_id = UUID(attendee_id_str)
                attendee = TalkAttendee(
                    talk_id=talk.id,
                    worker_id=worker_id,
                    attended=True,
                )
                db.add(attendee)
            except (ValueError, TypeError):
                logger.warning(f"Invalid attendee ID: {attendee_id_str}")
                continue

    await db.commit()
    await db.refresh(talk, attribute_names=["created_by", "attendees"])

    # Audit log
    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type="toolbox_talk",
        resource_id=talk.id,
        project_id=talk.project_id,
        old_values=old_values,
        new_values=get_model_dict(talk),
    )

    return talk


@router.delete("/toolbox-talks/{talk_id}", status_code=204)
async def delete_toolbox_talk(
    talk_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=require_permission(Permission.DELETE),
):
    result = await db.execute(select(ToolboxTalk).where(ToolboxTalk.id == talk_id))
    talk = result.scalar_one_or_none()

    if not talk:
        raise HTTPException(status_code=404, detail="Toolbox talk not found")

    await verify_project_access(db, current_user.id, talk.project_id)

    old_values = get_model_dict(talk)

    await db.delete(talk)
    await db.commit()

    # Audit log
    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        resource_type="toolbox_talk",
        resource_id=talk_id,
        project_id=talk.project_id,
        old_values=old_values,
    )

    return None


# Attendance management endpoints moved to toolbox_talk_attendance.py
