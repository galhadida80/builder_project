from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.meeting import Meeting, MeetingAttendee
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse, MeetingAttendeeCreate, MeetingAttendeeResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


@router.get("/projects/{project_id}/meetings", response_model=list[MeetingResponse])
async def list_meetings(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Meeting)
        .options(
            selectinload(Meeting.created_by),
            selectinload(Meeting.attendees).selectinload(MeetingAttendee.user)
        )
        .where(Meeting.project_id == project_id)
        .order_by(Meeting.scheduled_date.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/meetings", response_model=MeetingResponse)
async def create_meeting(
    project_id: UUID,
    data: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = Meeting(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(meeting)
    await db.flush()

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(meeting))

    await db.refresh(meeting, ["created_by", "attendees"])
    return meeting


@router.get("/projects/{project_id}/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(project_id: UUID, meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Meeting)
        .options(
            selectinload(Meeting.created_by),
            selectinload(Meeting.attendees).selectinload(MeetingAttendee.user)
        )
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/projects/{project_id}/meetings/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    old_values = get_model_dict(meeting)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(meeting, key, value)

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(meeting))

    await db.refresh(meeting, ["created_by", "attendees"])
    return meeting


@router.delete("/projects/{project_id}/meetings/{meeting_id}")
async def delete_meeting(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(meeting))

    await db.delete(meeting)
    return {"message": "Meeting deleted"}


@router.post("/projects/{project_id}/meetings/{meeting_id}/attendees", response_model=MeetingAttendeeResponse)
async def add_attendee(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingAttendeeCreate,
    db: AsyncSession = Depends(get_db)
):
    attendee = MeetingAttendee(meeting_id=meeting_id, user_id=data.user_id, role=data.role)
    db.add(attendee)
    await db.flush()
    await db.refresh(attendee, ["user"])
    return attendee


@router.delete("/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}")
async def remove_attendee(
    project_id: UUID,
    meeting_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MeetingAttendee).where(
            MeetingAttendee.meeting_id == meeting_id,
            MeetingAttendee.user_id == user_id
        )
    )
    attendee = result.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    await db.delete(attendee)
    return {"message": "Attendee removed"}


@router.put("/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}/confirm")
async def confirm_attendance(
    project_id: UUID,
    meeting_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MeetingAttendee).where(
            MeetingAttendee.meeting_id == meeting_id,
            MeetingAttendee.user_id == user_id
        )
    )
    attendee = result.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    attendee.confirmed = True
    await db.refresh(attendee, ["user"])
    return attendee
