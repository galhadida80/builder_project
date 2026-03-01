import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import Notification
from app.models.permit import Permit, PermitStatus

logger = logging.getLogger(__name__)

ALERT_DAYS = [30, 14, 7]
ACTIVE_STATUSES = [
    PermitStatus.APPROVED.value,
    PermitStatus.CONDITIONAL.value,
]


def render_permit_deadline_email(
    permit_type: str, permit_number: str, alert_type: str, days_remaining: int = 0, days_overdue: int = 0
) -> tuple[str, str]:
    permit_type_display = permit_type.replace("_", " ").title()

    if alert_type == "approaching":
        email_subject = f"Permit Expiration Alert - {permit_type_display} Expires in {days_remaining} Days"
        accent_color = "#D97706"
        accent_bg = "#FFFBEB"
        badge_text = f"Expires in {days_remaining} days"
        heading = "Permit Expiration Approaching"
        detail = f"{permit_type_display} permit <strong style=\"color:#0F172A;\">{permit_number}</strong> will expire in {days_remaining} days. Please ensure timely renewal."
    elif alert_type == "expired":
        email_subject = f"Permit Expired - {permit_type_display} Overdue by {days_overdue} Day(s)"
        accent_color = "#DC2626"
        accent_bg = "#FEF2F2"
        badge_text = f"Expired {days_overdue} day(s) ago"
        heading = "Permit Expired"
        detail = f"{permit_type_display} permit <strong style=\"color:#0F172A;\">{permit_number}</strong> expired {days_overdue} day(s) ago. Immediate action required for regulatory compliance."
    else:
        email_subject = f"Permit Expiration - {permit_type_display}"
        accent_color = "#EA580C"
        accent_bg = "#FFF7ED"
        badge_text = "Action Required"
        heading = "Permit Deadline Alert"
        detail = f"{permit_type_display} permit <strong style=\"color:#0F172A;\">{permit_number}</strong> requires attention."

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
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">Permit Type</p>
        <p style="margin:0;font-size:14px;color:#0F172A;font-weight:600;">{permit_type_display}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 18px;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">Permit Number</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:500;">{permit_number or 'N/A'}</p>
      </td>
    </tr>
  </table>
  <p style="margin:0;font-size:13px;color:#64748B;">Please take action to maintain regulatory compliance.</p>
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


async def check_permit_deadlines(db: AsyncSession) -> list[dict]:
    """
    Check permit expiration dates and create notifications for:
    - Permits expiring in 30, 14, or 7 days
    - Permits that have expired
    """
    today = date.today()
    alert_dates = [today + timedelta(days=days) for days in ALERT_DAYS]

    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(
            Permit.status.in_(ACTIVE_STATUSES),
            Permit.expiration_date.isnot(None),
        )
    )
    permits = result.scalars().all()

    notifications = []

    for permit in permits:
        expiration = permit.expiration_date.date() if hasattr(permit.expiration_date, 'date') else permit.expiration_date
        notify_user_id = permit.created_by_id

        if not notify_user_id:
            continue

        permit_display = permit.permit_number or f"{permit.permit_type} permit"

        if expiration in alert_dates:
            days_remaining = (expiration - today).days
            alert_type = "approaching"
            title = f"Permit expires in {days_remaining} days"
            message = f"{permit.permit_type.replace('_', ' ').title()} permit ({permit_display}) will expire on {expiration.isoformat()}. Please ensure timely renewal."
        elif expiration < today:
            alert_type = "expired"
            days_overdue = (today - expiration).days
            title = f"Permit expired {days_overdue} day(s) ago"
            message = f"{permit.permit_type.replace('_', ' ').title()} permit ({permit_display}) expired on {expiration.isoformat()} and is now {days_overdue} day(s) overdue."
        else:
            continue

        notification = Notification(
            user_id=notify_user_id,
            category="general",
            urgency="high" if alert_type == "expired" else "medium",
            title=title,
            message=message,
            related_entity_type="permit",
            related_entity_id=permit.id,
        )
        db.add(notification)

        user_email = permit.created_by.email if permit.created_by else None
        days_remaining_val = (expiration - today).days if expiration >= today else 0
        days_overdue_val = (today - expiration).days if expiration < today else 0

        email_subject, email_html = render_permit_deadline_email(
            permit.permit_type,
            permit.permit_number or "N/A",
            alert_type,
            days_remaining_val,
            days_overdue_val,
        )

        notifications.append({
            "permit_id": str(permit.id),
            "permit_type": permit.permit_type,
            "permit_number": permit.permit_number,
            "alert_type": alert_type,
            "user_id": str(notify_user_id),
            "user_email": user_email,
            "email_subject": email_subject,
            "email_html": email_html,
        })

    if notifications:
        await db.commit()

    logger.info(f"Permit deadline check: {len(notifications)} alerts created")
    return notifications
