from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.meeting import Meeting, MeetingAttendee
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.meeting import (
    MeetingAttendeeCreate,
    MeetingAttendeeResponse,
    MeetingCreate,
    MeetingResponse,
    MeetingUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.calendar_service import (
    generate_google_calendar_url,
    generate_ical_event,
    generate_outlook_url,
)
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/meetings", response_model=list[MeetingResponse])
async def list_all_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    result = await db.execute(
        select(Meeting)
        .options(
            selectinload(Meeting.created_by),
            selectinload(Meeting.attendees).selectinload(MeetingAttendee.user)
        )
        .where(Meeting.project_id.in_(user_project_ids))
        .order_by(Meeting.scheduled_date.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/meetings", response_model=list[MeetingResponse])
async def list_meetings(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
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
    member: ProjectMember = require_permission(Permission.CREATE),
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
async def get_meeting(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
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
        language = get_language_from_request(request)
        error_message = translate_message('resources.meeting_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return meeting


@router.put("/projects/{project_id}/meetings/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        language = get_language_from_request(request)
        error_message = translate_message('resources.meeting_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

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
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        language = get_language_from_request(request)
        error_message = translate_message('resources.meeting_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(meeting))

    await db.delete(meeting)
    return {"message": "Meeting deleted"}


@router.post("/projects/{project_id}/meetings/{meeting_id}/attendees", response_model=MeetingAttendeeResponse)
async def add_attendee(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingAttendeeCreate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
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


@router.get("/projects/{project_id}/meetings/{meeting_id}/ical")
async def get_meeting_ical(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.attendees).selectinload(MeetingAttendee.user))
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        language = get_language_from_request(request)
        raise HTTPException(status_code=404, detail=translate_message('resources.meeting_not_found', language))

    attendees_data = []
    for att in meeting.attendees:
        if att.user:
            attendees_data.append({"email": att.user.email, "name": att.user.full_name or ""})

    meeting_data = {
        "title": meeting.title,
        "description": meeting.description or "",
        "location": meeting.location or "",
        "scheduled_date": meeting.scheduled_date,
        "attendees": attendees_data,
    }

    ical_content = generate_ical_event(meeting_data)
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="meeting-{meeting_id}.ics"'},
    )


@router.get("/projects/{project_id}/meetings/{meeting_id}/calendar-links")
async def get_meeting_calendar_links(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        language = get_language_from_request(request)
        raise HTTPException(status_code=404, detail=translate_message('resources.meeting_not_found', language))

    meeting_data = {
        "title": meeting.title,
        "description": meeting.description or "",
        "location": meeting.location or "",
        "scheduled_date": meeting.scheduled_date,
    }

    return {
        "google_url": generate_google_calendar_url(meeting_data),
        "outlook_url": generate_outlook_url(meeting_data),
        "ics_download_url": f"/api/v1/projects/{project_id}/meetings/{meeting_id}/ical",
    }
