from datetime import datetime, timedelta
from urllib.parse import quote


def generate_ical_event(meeting_data: dict) -> str:
    title = meeting_data.get("title", "Meeting")
    description = meeting_data.get("description", "")
    location = meeting_data.get("location", "")
    scheduled_date = meeting_data.get("scheduled_date")
    attendees = meeting_data.get("attendees", [])

    if isinstance(scheduled_date, str):
        dt_start = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
    else:
        dt_start = scheduled_date

    dt_end = dt_start + timedelta(hours=1)
    now = datetime.utcnow()

    dt_format = "%Y%m%dT%H%M%SZ"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//BuilderOps//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"DTSTART:{dt_start.strftime(dt_format)}",
        f"DTEND:{dt_end.strftime(dt_format)}",
        f"DTSTAMP:{now.strftime(dt_format)}",
        f"SUMMARY:{escape_ical_text(title)}",
        f"DESCRIPTION:{escape_ical_text(description)}",
        f"LOCATION:{escape_ical_text(location)}",
    ]

    for attendee in attendees:
        email = attendee.get("email", "")
        name = attendee.get("name", "")
        if email:
            lines.append(f"ATTENDEE;CN={escape_ical_text(name)}:mailto:{email}")

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
