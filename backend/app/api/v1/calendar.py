import logging
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.calendar_token import UserCalendarToken
from app.models.meeting import Meeting, MeetingAttendee
from app.models.user import User
from app.services.calendar_service import (
    build_google_auth_url,
    exchange_google_code,
    generate_ical_feed,
    generate_ical_feed_token,
    sync_meeting_to_google,
    unsync_meeting_from_google,
    verify_ical_feed_token,
)
from app.utils import utcnow

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/calendar/auth-url")
async def get_calendar_auth_url(
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()
    if not settings.google_calendar_client_id:
        raise HTTPException(status_code=501, detail="Google Calendar integration not configured")

    state = str(current_user.id)
    url = build_google_auth_url(state)
    return {"auth_url": url}


@router.get("/calendar/callback")
async def calendar_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    if not settings.google_calendar_client_id:
        raise HTTPException(status_code=501, detail="Google Calendar integration not configured")

    try:
        user_id = UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    frontend_url = settings.frontend_base_url

    try:
        token_data = await exchange_google_code(code)
    except Exception as e:
        logger.error(f"Google Calendar OAuth exchange failed: {e}")
        return RedirectResponse(url=f"{frontend_url}/settings?calendar=error")

    now = utcnow()
    expires_in = token_data.get("expires_in", 3600)

    result = await db.execute(
        select(UserCalendarToken).where(
            UserCalendarToken.user_id == user_id,
            UserCalendarToken.provider == "google",
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.access_token = token_data["access_token"]
        if "refresh_token" in token_data:
            existing.refresh_token = token_data["refresh_token"]
        existing.token_expiry = now + timedelta(seconds=expires_in)
        existing.updated_at = now
    else:
        token_record = UserCalendarToken(
            user_id=user_id,
            provider="google",
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_expiry=now + timedelta(seconds=expires_in),
        )
        db.add(token_record)

    await db.commit()

    return RedirectResponse(url=f"{frontend_url}/settings?calendar=connected")


@router.get("/calendar/status")
async def get_calendar_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()
    result = await db.execute(
        select(UserCalendarToken).where(
            UserCalendarToken.user_id == current_user.id,
            UserCalendarToken.provider == "google",
        )
    )
    token = result.scalar_one_or_none()

    return {
        "google_connected": token is not None,
        "google_configured": bool(settings.google_calendar_client_id),
    }


@router.delete("/calendar/disconnect")
async def disconnect_calendar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserCalendarToken).where(
            UserCalendarToken.user_id == current_user.id,
            UserCalendarToken.provider == "google",
        )
    )
    token = result.scalar_one_or_none()
    if token:
        await db.delete(token)
    return {"message": "Calendar disconnected"}


@router.post("/projects/{project_id}/meetings/{meeting_id}/sync-calendar")
async def sync_meeting_to_calendar(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.attendees).selectinload(MeetingAttendee.user))
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    attendee_emails = []
    for att in meeting.attendees:
        email = att.email or (att.user.email if att.user else None)
        if email:
            attendee_emails.append(email)

    try:
        event_id = await sync_meeting_to_google(db, current_user.id, meeting, attendee_emails)
    except Exception as e:
        logger.error(f"Failed to sync meeting {meeting_id} to Google Calendar: {e}")
        raise HTTPException(status_code=502, detail="Failed to sync with Google Calendar")

    if not event_id:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not connected. Please connect your calendar first.",
        )

    return {
        "message": "Meeting synced to Google Calendar",
        "google_event_id": event_id,
        "calendar_synced": True,
    }


@router.delete("/projects/{project_id}/meetings/{meeting_id}/calendar-event")
async def remove_calendar_event(
    project_id: UUID,
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.project_id == project_id)
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.google_event_id:
        return {"message": "No calendar event to remove"}

    try:
        success = await unsync_meeting_from_google(db, current_user.id, meeting)
    except Exception as e:
        logger.error(f"Failed to remove calendar event for meeting {meeting_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to remove calendar event")

    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove calendar event")

    return {"message": "Calendar event removed", "calendar_synced": False}


@router.get("/projects/{project_id}/calendar/feed-url")
async def get_ical_feed_url(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()
    token = generate_ical_feed_token(current_user.id, project_id)
    base = settings.backend_base_url
    prefix = settings.api_v1_prefix
    feed_url = f"{base}{prefix}/calendar/feed/{current_user.id}/{project_id}?token={token}"
    return {"feed_url": feed_url}


@router.get("/calendar/feed/{user_id}/{project_id}")
async def get_ical_feed(
    user_id: UUID,
    project_id: UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not verify_ical_feed_token(user_id, project_id, token):
        raise HTTPException(status_code=403, detail="Invalid feed token")

    result = await db.execute(
        select(Meeting)
        .where(Meeting.project_id == project_id)
        .order_by(Meeting.scheduled_date.desc())
    )
    meetings = result.scalars().all()

    meeting_dicts = [
        {
            "id": str(m.id),
            "title": m.title,
            "description": m.description or "",
            "location": m.location or "",
            "scheduled_date": m.scheduled_date,
        }
        for m in meetings
    ]

    ics_content = generate_ical_feed(meeting_dicts, calendar_name="BuilderOps Meetings")
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "inline; filename=builderops.ics"},
    )


@router.post("/projects/{project_id}/meetings/sync-all-calendar")
async def sync_all_meetings_to_calendar(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    now = utcnow()
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.attendees).selectinload(MeetingAttendee.user))
        .where(
            Meeting.project_id == project_id,
            Meeting.scheduled_date >= now,
            Meeting.status.in_(["scheduled", "invitations_sent", "pending_votes"]),
        )
    )
    meetings = result.scalars().all()

    synced = 0
    failed = 0
    skipped = 0

    for meeting in meetings:
        if meeting.calendar_synced and meeting.google_event_id:
            skipped += 1
            continue

        attendee_emails = []
        for att in meeting.attendees:
            email = att.email or (att.user.email if att.user else None)
            if email:
                attendee_emails.append(email)

        try:
            event_id = await sync_meeting_to_google(db, current_user.id, meeting, attendee_emails)
            if event_id:
                synced += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Bulk sync failed for meeting {meeting.id}: {e}")
            failed += 1

    await db.commit()
    return {"synced": synced, "failed": failed, "skipped": skipped}
