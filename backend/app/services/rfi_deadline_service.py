import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import Notification
from app.models.rfi import RFI, RFIStatus

logger = logging.getLogger(__name__)

APPROACHING_DAYS = 3
ACTIVE_STATUSES = [RFIStatus.OPEN.value, RFIStatus.WAITING_RESPONSE.value]


def render_rfi_deadline_email(rfi_number: str, subject: str, alert_type: str, days_overdue: int = 0) -> tuple[str, str]:
    if alert_type == "approaching":
        email_subject = f"RFI {rfi_number} - Response Due in {APPROACHING_DAYS} Days"
        banner_color = "#f59e0b"
        heading = "Deadline Approaching"
        detail = f"RFI <strong>{rfi_number}</strong> — \"{subject}\" is due in {APPROACHING_DAYS} days."
    elif alert_type == "due_today":
        email_subject = f"RFI {rfi_number} - Response Due Today"
        banner_color = "#ef4444"
        heading = "Response Due Today"
        detail = f"RFI <strong>{rfi_number}</strong> — \"{subject}\" requires a response today."
    else:
        email_subject = f"RFI {rfi_number} - Overdue by {days_overdue} Day(s)"
        banner_color = "#dc2626"
        heading = f"Overdue by {days_overdue} Day(s)"
        detail = f"RFI <strong>{rfi_number}</strong> — \"{subject}\" is overdue by {days_overdue} day(s)."

    body_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:{banner_color};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">{heading}</h2>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 16px;font-size:14px;color:#374151;">{detail}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Please take action to avoid further delays.</p>
      </div>
    </div>
    """
    return email_subject, body_html


async def check_rfi_deadlines(db: AsyncSession) -> list[dict]:
    today = date.today()
    approaching_date = today + timedelta(days=APPROACHING_DAYS)

    result = await db.execute(
        select(RFI)
        .options(selectinload(RFI.created_by))
        .where(
            RFI.status.in_(ACTIVE_STATUSES),
            RFI.due_date.isnot(None),
        )
    )
    rfis = result.scalars().all()

    notifications = []

    for rfi in rfis:
        due = rfi.due_date.date() if hasattr(rfi.due_date, 'date') else rfi.due_date
        notify_user_id = rfi.created_by_id

        if due == approaching_date:
            alert_type = "approaching"
            title = f"RFI {rfi.rfi_number} due in {APPROACHING_DAYS} days"
            message = f"RFI \"{rfi.subject}\" is due on {due.isoformat()}. Please follow up."
        elif due == today:
            alert_type = "due_today"
            title = f"RFI {rfi.rfi_number} is due today"
            message = f"RFI \"{rfi.subject}\" requires a response today."
        elif due < today:
            alert_type = "overdue"
            days_overdue = (today - due).days
            title = f"RFI {rfi.rfi_number} is overdue by {days_overdue} day(s)"
            message = f"RFI \"{rfi.subject}\" was due on {due.isoformat()} and is now {days_overdue} day(s) overdue."
        else:
            continue

        notification = Notification(
            user_id=notify_user_id,
            category="rfi",
            title=title,
            message=message,
            related_entity_type="rfi",
            related_entity_id=rfi.id,
        )
        db.add(notification)

        user_email = rfi.created_by.email if rfi.created_by else None
        days_overdue_val = (today - due).days if due < today else 0
        email_subject, email_html = render_rfi_deadline_email(
            rfi.rfi_number, rfi.subject, alert_type, days_overdue_val
        )

        notifications.append({
            "rfi_id": str(rfi.id),
            "rfi_number": rfi.rfi_number,
            "alert_type": alert_type,
            "user_id": str(notify_user_id),
            "user_email": user_email,
            "email_subject": email_subject,
            "email_html": email_html,
        })

    if notifications:
        await db.commit()

    logger.info(f"RFI deadline check: {len(notifications)} alerts created")
    return notifications
