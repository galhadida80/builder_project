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
        accent_color = "#D97706"
        accent_bg = "#FFFBEB"
        badge_text = f"Due in {APPROACHING_DAYS} days"
        heading = "Deadline Approaching"
        detail = f"RFI <strong style=\"color:#0F172A;\">{rfi_number}</strong> — \"{subject}\" is due in {APPROACHING_DAYS} days."
    elif alert_type == "due_today":
        email_subject = f"RFI {rfi_number} - Response Due Today"
        accent_color = "#EA580C"
        accent_bg = "#FFF7ED"
        badge_text = "Due Today"
        heading = "Response Due Today"
        detail = f"RFI <strong style=\"color:#0F172A;\">{rfi_number}</strong> — \"{subject}\" requires a response today."
    else:
        email_subject = f"RFI {rfi_number} - Overdue by {days_overdue} Day(s)"
        accent_color = "#DC2626"
        accent_bg = "#FEF2F2"
        badge_text = f"Overdue {days_overdue} day(s)"
        heading = f"Overdue by {days_overdue} Day(s)"
        detail = f"RFI <strong style=\"color:#0F172A;\">{rfi_number}</strong> — \"{subject}\" is overdue by {days_overdue} day(s)."

    body_html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04);">
<tr><td style="background:#0F172A;padding:32px 32px 28px;">
  <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#64748B;">BuilderOps</p>
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">{heading}</h1>
  <p style="margin:8px 0 0;">
    <span style="display:inline-block;background:{accent_bg};color:{accent_color};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;">{badge_text}</span>
  </p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">{detail}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:24px;">
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">RFI Number</p>
        <p style="margin:0;font-size:14px;color:#0F172A;font-weight:600;">{rfi_number}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 18px;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">Subject</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:500;">{subject}</p>
      </td>
    </tr>
  </table>
  <p style="margin:0;font-size:13px;color:#64748B;">Please take action to avoid further delays.</p>
</td></tr>
<tr><td style="background-color:#F8FAFC;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="margin:0;color:#94A3B8;font-size:12px;">This is an automated alert from BuilderOps.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
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
