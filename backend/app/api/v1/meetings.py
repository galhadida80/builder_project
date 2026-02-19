import html as html_mod
import logging
import uuid as uuid_mod
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.meeting import Meeting, MeetingAttendee, MeetingTimeSlot, MeetingTimeVote
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.meeting import (
    ConfirmTimeSlotRequest,
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
from app.services.email_renderer import render_meeting_invitation_email, render_meeting_vote_email
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

MEETING_LOAD_OPTIONS = [
    selectinload(Meeting.created_by),
    selectinload(Meeting.attendees).selectinload(MeetingAttendee.user),
    selectinload(Meeting.time_slots),
    selectinload(Meeting.time_votes),
]


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


def send_meeting_vote_emails(
    meeting: Meeting,
    time_slots: list[MeetingTimeSlot],
    vote_records: list[MeetingTimeVote],
    organizer_name: str,
):
    settings = get_settings()
    email_service = EmailService()
    if not email_service.enabled:
        logger.warning("Email service not enabled, skipping vote emails")
        return

    backend_url = settings.backend_base_url

    for vote in vote_records:
        att = vote.attendee
        if not att or not att.email:
            continue

        att_name = att.user.full_name if att.user else att.email
        language = att.user.language if att.user and hasattr(att.user, "language") and att.user.language else "en"

        subject, html = render_meeting_vote_email(
            meeting_title=meeting.title,
            meeting_location=meeting.location or "",
            meeting_description=meeting.description or "",
            attendee_name=att_name,
            organizer_name=organizer_name,
            vote_token=vote.vote_token,
            time_slots=time_slots,
            backend_url=backend_url,
            language=language,
        )

        try:
            email_service.send_notification(
                to_email=att.email,
                subject=subject,
                body_html=html,
            )
            logger.info(f"Meeting vote email sent to {att.email} for '{meeting.title}'")
        except Exception as e:
            logger.error(f"Failed to send meeting vote email to {att.email}: {e}")


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
        .options(*MEETING_LOAD_OPTIONS)
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
        .options(*MEETING_LOAD_OPTIONS)
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
    has_time_slots = data.time_slots is not None and len(data.time_slots) >= 2

    meeting_data = data.model_dump(exclude={"attendee_ids", "time_slots"})
    meeting = Meeting(
        **meeting_data,
        project_id=project_id,
        created_by_id=current_user.id,
        has_time_slots=has_time_slots,
    )
    if has_time_slots:
        meeting.status = "pending_votes"

    db.add(meeting)
    await db.flush()

    created_slots = []
    if has_time_slots:
        for idx, slot_input in enumerate(data.time_slots):
            slot = MeetingTimeSlot(
                meeting_id=meeting.id,
                slot_number=idx + 1,
                proposed_start=slot_input.proposed_start,
                proposed_end=slot_input.proposed_end,
            )
            db.add(slot)
            created_slots.append(slot)
        await db.flush()

    created_attendees = []
    vote_records = []
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

        if has_time_slots:
            for att in created_attendees:
                vote = MeetingTimeVote(
                    meeting_id=meeting.id,
                    attendee_id=att.id,
                    vote_token=str(uuid_mod.uuid4()),
                )
                db.add(vote)
                vote_records.append(vote)
            await db.flush()

        for att in created_attendees:
            await db.refresh(att, ["user"])

        if has_time_slots:
            for vote in vote_records:
                await db.refresh(vote, ["attendee"])

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(meeting))

    await db.refresh(meeting, ["created_by", "attendees", "time_slots", "time_votes"])

    settings = get_settings()
    organizer_name = current_user.full_name or current_user.email

    if created_attendees and has_time_slots:
        background_tasks.add_task(
            send_meeting_vote_emails,
            meeting,
            created_slots,
            vote_records,
            organizer_name,
        )
    elif created_attendees:
        frontend_url = settings.frontend_base_url
        background_tasks.add_task(
            send_meeting_invitations,
            meeting,
            created_attendees,
            organizer_name,
            frontend_url,
        )
        meeting.status = "invitations_sent"
        await db.flush()

    return meeting


@router.get("/projects/{project_id}/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Meeting)
        .options(*MEETING_LOAD_OPTIONS)
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

    await db.flush()
    await db.refresh(meeting, ["created_by", "attendees", "time_slots", "time_votes"])
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
    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    if not meeting_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Meeting not found")

    existing_result = await db.execute(
        select(MeetingAttendee).where(
            MeetingAttendee.meeting_id == meeting_id,
            MeetingAttendee.user_id == data.user_id,
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already an attendee")

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
    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    if not meeting_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Meeting not found")

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
    attendee.rsvp_responded_at = datetime.now(timezone.utc)
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
    attendee.rsvp_responded_at = datetime.now(timezone.utc)
    await db.flush()

    meeting = attendee.meeting
    return RSVPInfoResponse(
        meeting_title=meeting.title,
        meeting_date=meeting.scheduled_date,
        meeting_location=meeting.location,
        organizer_name=meeting.created_by.full_name if meeting.created_by else None,
        attendee_name=attendee.user.full_name if attendee.user else attendee.email,
        attendance_status=attendee.attendance_status,
    )


@router.post("/meetings/vote/{token}", response_class=HTMLResponse)
async def vote_for_time_slot(
    token: str,
    slot: UUID = Query(..., description="Time slot ID to vote for"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MeetingTimeVote)
        .options(
            selectinload(MeetingTimeVote.attendee).selectinload(MeetingAttendee.user),
            selectinload(MeetingTimeVote.meeting).selectinload(Meeting.created_by),
            selectinload(MeetingTimeVote.time_slot),
        )
        .where(MeetingTimeVote.vote_token == token)
    )
    vote = result.scalar_one_or_none()
    if not vote or not vote.meeting:
        return HTMLResponse(content=render_vote_result_html("Invalid or expired vote link.", error=True), status_code=404)

    slot_result = await db.execute(
        select(MeetingTimeSlot).where(
            MeetingTimeSlot.id == slot,
            MeetingTimeSlot.meeting_id == vote.meeting_id,
        ).with_for_update()
    )
    chosen_slot = slot_result.scalar_one_or_none()
    if not chosen_slot:
        return HTMLResponse(content=render_vote_result_html("Invalid time slot.", error=True), status_code=400)

    old_slot_id = vote.time_slot_id
    if old_slot_id and old_slot_id != slot:
        old_slot_result = await db.execute(
            select(MeetingTimeSlot).where(MeetingTimeSlot.id == old_slot_id).with_for_update()
        )
        old_slot = old_slot_result.scalar_one_or_none()
        if old_slot and old_slot.vote_count > 0:
            old_slot.vote_count -= 1

    if old_slot_id != slot:
        chosen_slot.vote_count += 1

    vote.time_slot_id = slot
    vote.voted_at = datetime.now(timezone.utc)
    await db.commit()

    slot_label = chosen_slot.proposed_start.strftime("%b %d, %Y at %H:%M")
    if chosen_slot.proposed_end:
        slot_label += f" - {chosen_slot.proposed_end.strftime('%H:%M')}"

    msg = f"Your vote has been recorded! You chose Option {chosen_slot.slot_number}: {slot_label}"
    meeting_title = vote.meeting.title if vote.meeting else "Meeting"
    return HTMLResponse(content=render_vote_result_html(msg, meeting_title=meeting_title))


@router.post("/projects/{project_id}/meetings/{meeting_id}/confirm-time", response_model=MeetingResponse)
async def confirm_time_slot(
    project_id: UUID,
    meeting_id: UUID,
    data: ConfirmTimeSlotRequest,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Meeting)
        .options(*MEETING_LOAD_OPTIONS)
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        language = get_language_from_request(request)
        raise HTTPException(status_code=404, detail=translate_message('resources.meeting_not_found', language))

    if not meeting.has_time_slots:
        raise HTTPException(status_code=400, detail="Meeting does not have time slots")

    slot_result = await db.execute(
        select(MeetingTimeSlot).where(
            MeetingTimeSlot.id == data.time_slot_id,
            MeetingTimeSlot.meeting_id == meeting_id,
        )
    )
    chosen_slot = slot_result.scalar_one_or_none()
    if not chosen_slot:
        raise HTTPException(status_code=400, detail="Invalid time slot")

    meeting.scheduled_date = chosen_slot.proposed_start
    meeting.status = "scheduled"

    await create_audit_log(db, current_user, "meeting", meeting.id, AuditAction.UPDATE,
                          project_id=project_id, new_values={"status": "scheduled", "scheduled_date": str(chosen_slot.proposed_start)})

    await db.flush()
    await db.refresh(meeting, ["created_by", "attendees", "time_slots", "time_votes"])
    return meeting


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


def render_vote_result_html(message: str, meeting_title: str = "Meeting", error: bool = False) -> str:
    color = "#DC2626" if error else "#16A34A"
    icon = "&#10060;" if error else "&#9989;"
    safe_title = html_mod.escape(meeting_title)
    safe_message = html_mod.escape(message)
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vote - {safe_title}</title></head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04);">
<tr><td style="background:#0F172A;padding:24px 32px;">
<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#64748B;">BuilderOps</p>
<p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#FFFFFF;">{safe_title}</p>
</td></tr>
<tr><td style="padding:40px 32px;text-align:center;">
<p style="font-size:48px;margin:0 0 16px;">{icon}</p>
<p style="font-size:16px;color:#334155;line-height:1.6;margin:0;">{safe_message}</p>
</td></tr>
<tr><td style="background-color:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0;">
<p style="margin:0;color:#94A3B8;font-size:12px;">You can close this page.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
