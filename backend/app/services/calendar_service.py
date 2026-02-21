import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote, urlencode
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.calendar_token import UserCalendarToken
from app.models.meeting import Meeting
from app.utils import utcnow

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events"

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logger.warning("httpx not installed. Google Calendar API sync will be disabled.")


def build_google_auth_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.google_calendar_client_id,
        "redirect_uri": settings.google_calendar_redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_CALENDAR_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_google_code(code: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_calendar_client_id,
                "client_secret": settings.google_calendar_client_secret,
                "redirect_uri": settings.google_calendar_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_google_token(refresh_token: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.google_calendar_client_id,
                "client_secret": settings.google_calendar_client_secret,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        return response.json()


async def get_valid_access_token(db: AsyncSession, user_id: UUID) -> Optional[str]:
    result = await db.execute(
        select(UserCalendarToken).where(
            UserCalendarToken.user_id == user_id,
            UserCalendarToken.provider == "google",
        )
    )
    token_record = result.scalar_one_or_none()
    if not token_record:
        return None

    now = utcnow()
    if token_record.token_expiry and token_record.token_expiry > now + timedelta(minutes=5):
        return token_record.access_token

    if not token_record.refresh_token:
        return None

    try:
        token_data = await refresh_google_token(token_record.refresh_token)
        token_record.access_token = token_data["access_token"]
        if "refresh_token" in token_data:
            token_record.refresh_token = token_data["refresh_token"]
        expires_in = token_data.get("expires_in", 3600)
        token_record.token_expiry = now + timedelta(seconds=expires_in)
        token_record.updated_at = now
        await db.flush()
        return token_record.access_token
    except Exception as e:
        logger.error(f"Failed to refresh Google Calendar token for user {user_id}: {e}")
        return None


async def create_google_calendar_event(
    access_token: str,
    meeting: Meeting,
    attendee_emails: list[str],
) -> Optional[str]:
    if not HTTPX_AVAILABLE:
        logger.warning("httpx not available, cannot create calendar event")
        return None

    dt_start = meeting.scheduled_date
    if dt_start.tzinfo is None:
        dt_start = dt_start.replace(tzinfo=timezone.utc)
    dt_end = dt_start + timedelta(hours=1)

    event_body = {
        "summary": meeting.title,
        "description": meeting.description or "",
        "location": meeting.location or "",
        "start": {"dateTime": dt_start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": dt_end.isoformat(), "timeZone": "UTC"},
        "attendees": [{"email": e} for e in attendee_emails],
        "reminders": {"useDefault": True},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
            json=event_body,
            headers={"Authorization": f"Bearer {access_token}"},
            params={"sendUpdates": "all"},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("id")


async def update_google_calendar_event(
    access_token: str,
    event_id: str,
    meeting: Meeting,
    attendee_emails: list[str],
) -> bool:
    if not HTTPX_AVAILABLE:
        return False

    dt_start = meeting.scheduled_date
    if dt_start.tzinfo is None:
        dt_start = dt_start.replace(tzinfo=timezone.utc)
    dt_end = dt_start + timedelta(hours=1)

    event_body = {
        "summary": meeting.title,
        "description": meeting.description or "",
        "location": meeting.location or "",
        "start": {"dateTime": dt_start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": dt_end.isoformat(), "timeZone": "UTC"},
        "attendees": [{"email": e} for e in attendee_emails],
    }

    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events/{event_id}",
            json=event_body,
            headers={"Authorization": f"Bearer {access_token}"},
            params={"sendUpdates": "all"},
        )
        return response.status_code == 200


async def delete_google_calendar_event(access_token: str, event_id: str) -> bool:
    if not HTTPX_AVAILABLE:
        return False

    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"sendUpdates": "all"},
        )
        return response.status_code in (200, 204)


async def sync_meeting_to_google(
    db: AsyncSession,
    user_id: UUID,
    meeting: Meeting,
    attendee_emails: list[str],
) -> Optional[str]:
    access_token = await get_valid_access_token(db, user_id)
    if not access_token:
        return None

    if meeting.google_event_id:
        success = await update_google_calendar_event(
            access_token, meeting.google_event_id, meeting, attendee_emails
        )
        if success:
            meeting.calendar_synced = True
            await db.flush()
            return meeting.google_event_id
        return None

    event_id = await create_google_calendar_event(access_token, meeting, attendee_emails)
    if event_id:
        meeting.google_event_id = event_id
        meeting.calendar_synced = True
        await db.flush()
    return event_id


async def unsync_meeting_from_google(
    db: AsyncSession,
    user_id: UUID,
    meeting: Meeting,
) -> bool:
    if not meeting.google_event_id:
        return True

    access_token = await get_valid_access_token(db, user_id)
    if not access_token:
        return False

    success = await delete_google_calendar_event(access_token, meeting.google_event_id)
    if success:
        meeting.google_event_id = None
        meeting.calendar_synced = False
        await db.flush()
    return success


def generate_ical_event(meeting_data: dict) -> str:
    title = meeting_data.get("title", "Meeting")
    description = meeting_data.get("description", "")
    location = meeting_data.get("location", "")
    scheduled_date = meeting_data.get("scheduled_date")
    attendees = meeting_data.get("attendees", [])
    organizer = meeting_data.get("organizer", {})

    if isinstance(scheduled_date, str):
        dt_start = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
    else:
        dt_start = scheduled_date

    if dt_start.tzinfo is None:
        dt_start = dt_start.replace(tzinfo=timezone.utc)
    else:
        dt_start = dt_start.astimezone(timezone.utc)

    dt_end = dt_start + timedelta(hours=1)
    now = utcnow()

    dt_format = "%Y%m%dT%H%M%SZ"
    uid = f"{uuid4()}@builderops"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//BuilderOps//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{dt_start.strftime(dt_format)}",
        f"DTEND:{dt_end.strftime(dt_format)}",
        f"DTSTAMP:{now.strftime(dt_format)}",
        f"SUMMARY:{escape_ical_text(title)}",
        f"DESCRIPTION:{escape_ical_text(description)}",
        f"LOCATION:{escape_ical_text(location)}",
    ]

    if organizer.get("email"):
        org_name = escape_ical_text(organizer.get("name", ""))
        lines.append(f"ORGANIZER;CN={org_name}:mailto:{organizer['email']}")

    for attendee in attendees:
        email = attendee.get("email", "")
        name = attendee.get("name", "")
        partstat = attendee.get("partstat", "NEEDS-ACTION")
        if email:
            lines.append(f"ATTENDEE;CN={escape_ical_text(name)};PARTSTAT={partstat};RSVP=TRUE:mailto:{email}")

    lines.extend([
        "END:VEVENT",
        "END:VCALENDAR",
    ])

    return "\r\n".join(lines)


def generate_google_calendar_url(meeting_data: dict) -> str:
    title = meeting_data.get("title", "Meeting")
    description = meeting_data.get("description", "")
    location = meeting_data.get("location", "")
    scheduled_date = meeting_data.get("scheduled_date")

    if isinstance(scheduled_date, str):
        dt_start = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
    else:
        dt_start = scheduled_date

    if dt_start.tzinfo is None:
        dt_start = dt_start.replace(tzinfo=timezone.utc)
    else:
        dt_start = dt_start.astimezone(timezone.utc)

    dt_end = dt_start + timedelta(hours=1)
    dt_format = "%Y%m%dT%H%M%SZ"

    dates = f"{dt_start.strftime(dt_format)}/{dt_end.strftime(dt_format)}"

    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": dates,
        "details": description,
        "location": location,
    }

    query_parts = []
    for key, value in params.items():
        query_parts.append(f"{key}={quote(str(value))}")

    return f"https://calendar.google.com/calendar/render?{'&'.join(query_parts)}"


def generate_outlook_url(meeting_data: dict) -> str:
    title = meeting_data.get("title", "Meeting")
    description = meeting_data.get("description", "")
    location = meeting_data.get("location", "")
    scheduled_date = meeting_data.get("scheduled_date")

    if isinstance(scheduled_date, str):
        dt_start = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
    else:
        dt_start = scheduled_date

    if dt_start.tzinfo is None:
        dt_start = dt_start.replace(tzinfo=timezone.utc)
    else:
        dt_start = dt_start.astimezone(timezone.utc)

    dt_end = dt_start + timedelta(hours=1)
    iso_format = "%Y-%m-%dT%H:%M:%SZ"

    params = {
        "rru": "addevent",
        "subject": title,
        "body": description,
        "startdt": dt_start.strftime(iso_format),
        "enddt": dt_end.strftime(iso_format),
        "location": location,
        "path": "/calendar/action/compose",
    }

    query_parts = []
    for key, value in params.items():
        query_parts.append(f"{key}={quote(str(value))}")

    return f"https://outlook.live.com/calendar/0/action/compose?{'&'.join(query_parts)}"


def escape_ical_text(text: str) -> str:
    if not text:
        return ""
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
