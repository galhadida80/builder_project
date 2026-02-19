import logging
import uuid as uuid_mod
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
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
    RSVPInfoResponse,
    RSVPRequest,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.calendar_service import (
    generate_google_calendar_url,
    generate_ical_event,
    generate_outlook_url,
)
from app.services.email_renderer import render_meeting_invitation_email
from app.services.email_service import EmailService
from app.utils.localization import get_language_from_request, translate_message

logger = logging.getLogger(__name__)
router = APIRouter()

PARTSTAT_MAP = {
    "accepted": "ACCEPTED",
    "declined": "DECLINED",
    "tentative": "TENTATIVE",
    "pending": "NEEDS-ACTION",
}


def send_meeting_invitations(
    meeting: Meeting,
    attendees: list[MeetingAttendee],
    organizer_name: str,
    frontend_url: str,
):
    settings = get_settings()
    email_service = EmailService()
    if not email_service.enabled:
        logger.warning("Email service not enabled, skipping meeting invitations")
        return

    organizer_email = settings.rfi_email_address or "noreply@builderops.dev"
    meeting_date = meeting.scheduled_date.strftime("%Y-%m-%d")
    meeting_time = meeting.scheduled_date.strftime("%H:%M")

    attendees_data = []
    for att in attendees:
        if att.email:
            attendees_data.append({
                "email": att.email,
                "name": att.user.full_name if att.user else att.email,
                "partstat": "NEEDS-ACTION",
            })

    ical_content = generate_ical_event({
        "title": meeting.title,
        "description": meeting.description or "",
        "location": meeting.location or "",
        "scheduled_date": meeting.scheduled_date,
        "attendees": attendees_data,
        "organizer": {"email": organizer_email, "name": organizer_name},
    })

    for att in attendees:
        if not att.email:
            continue
        att_name = att.user.full_name if att.user else att.email
        language = att.user.language if att.user and hasattr(att.user, "language") and att.user.language else "en"

        subject, html = render_meeting_invitation_email(
            meeting_title=meeting.title,
            meeting_date=meeting_date,
            meeting_time=meeting_time,
            meeting_location=meeting.location or "",
            meeting_description=meeting.description or "",
            attendee_name=att_name,
            organizer_name=organizer_name,
            rsvp_token=att.rsvp_token or "",
            frontend_url=frontend_url,
            language=language,
        )

        try:
            email_service.send_notification(
                to_email=att.email,
                subject=subject,
                body_html=html,
            )
            logger.info(f"Meeting invitation sent to {att.email} for '{meeting.title}'")
        except Exception as e:
            logger.error(f"Failed to send meeting invitation to {att.email}: {e}")


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
    background_tasks: BackgroundTasks,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting_data = data.model_dump(exclude={"attendee_ids"})
    meeting = Meeting(**meeting_data, project_id=project_id, created_by_id=current_user.id)
    db.add(meeting)
    await db.flush()

    created_attendees = []
    if data.attendee_ids:
        user_ids = [UUID(uid) for uid in data.attendee_ids]
        user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in user_result.scalars().all()}

        for uid in user_ids:
            user = users_map.get(uid)
            if not user:
                continue
            attendee = MeetingAttendee(
                meeting_id=meeting.id,
                user_id=uid,
                email=user.email,
                attendance_status="pending",
                rsvp_token=str(uuid_mod.uuid4()),
            )
            db.add(attendee)
            created_attendees.append(attendee)

        await db.flush()
        for att in created_attendees:
            await db.refresh(att, ["user"])

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(meeting))

    await db.refresh(meeting, ["created_by", "attendees"])

    if created_attendees:
        settings = get_settings()
        frontend_url = settings.frontend_base_url
        organizer_name = current_user.full_name or current_user.email
        background_tasks.add_task(
            send_meeting_invitations,
            meeting,
            created_attendees,
            organizer_name,
            frontend_url,
        )

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
    user_result = await db.execute(select(User).where(User.id == data.user_id))
    user = user_result.scalar_one_or_none()

    attendee = MeetingAttendee(
        meeting_id=meeting_id,
        user_id=data.user_id,
        role=data.role,
        email=user.email if user else None,
        attendance_status="pending",
        rsvp_token=str(uuid_mod.uuid4()),
    )
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


@router.put("/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}/rsvp", response_model=MeetingAttendeeResponse)
async def rsvp_attendee(
    project_id: UUID,
    meeting_id: UUID,
    user_id: UUID,
    data: RSVPRequest,
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

    attendee.attendance_status = data.status
    attendee.rsvp_responded_at = datetime.utcnow()
    await db.flush()
    await db.refresh(attendee, ["user"])
    return attendee


@router.get("/meetings/rsvp/{token}", response_model=RSVPInfoResponse)
async def get_rsvp_info(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MeetingAttendee)
        .options(
            selectinload(MeetingAttendee.user),
            selectinload(MeetingAttendee.meeting).selectinload(Meeting.created_by),
        )
        .where(MeetingAttendee.rsvp_token == token)
    )
    attendee = result.scalar_one_or_none()
    if not attendee or not attendee.meeting:
        raise HTTPException(status_code=404, detail="Invalid RSVP token")

    meeting = attendee.meeting
    return RSVPInfoResponse(
        meeting_title=meeting.title,
        meeting_date=meeting.scheduled_date,
        meeting_location=meeting.location,
        organizer_name=meeting.created_by.full_name if meeting.created_by else None,
        attendee_name=attendee.user.full_name if attendee.user else attendee.email,
        attendance_status=attendee.attendance_status,
    )


@router.post("/meetings/rsvp/{token}", response_model=RSVPInfoResponse)
async def rsvp_by_token(
    token: str,
    data: RSVPRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MeetingAttendee)
        .options(
            selectinload(MeetingAttendee.user),
            selectinload(MeetingAttendee.meeting).selectinload(Meeting.created_by),
        )
        .where(MeetingAttendee.rsvp_token == token)
    )
    attendee = result.scalar_one_or_none()
    if not attendee or not attendee.meeting:
        raise HTTPException(status_code=404, detail="Invalid RSVP token")

    attendee.attendance_status = data.status
    attendee.rsvp_responded_at = datetime.utcnow()
    await db.commit()

    meeting = attendee.meeting
    return RSVPInfoResponse(
        meeting_title=meeting.title,
        meeting_date=meeting.scheduled_date,
        meeting_location=meeting.location,
        organizer_name=meeting.created_by.full_name if meeting.created_by else None,
        attendee_name=attendee.user.full_name if attendee.user else attendee.email,
        attendance_status=attendee.attendance_status,
    )


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
        .options(
            selectinload(Meeting.created_by),
            selectinload(Meeting.attendees).selectinload(MeetingAttendee.user),
        )
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        language = get_language_from_request(request)
        raise HTTPException(status_code=404, detail=translate_message('resources.meeting_not_found', language))

    attendees_data = []
    for att in meeting.attendees:
        email = att.email or (att.user.email if att.user else "")
        name = att.user.full_name if att.user else ""
        if email:
            attendees_data.append({
                "email": email,
                "name": name,
                "partstat": PARTSTAT_MAP.get(att.attendance_status, "NEEDS-ACTION"),
            })

    organizer = {}
    if meeting.created_by:
        organizer = {"email": meeting.created_by.email, "name": meeting.created_by.full_name or ""}

    meeting_data = {
        "title": meeting.title,
        "description": meeting.description or "",
        "location": meeting.location or "",
        "scheduled_date": meeting.scheduled_date,
        "attendees": attendees_data,
        "organizer": organizer,
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
