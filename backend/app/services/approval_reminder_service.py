import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.equipment_template import EquipmentApprovalSubmission, SubmissionStatus
from app.models.material_template import MaterialApprovalSubmission
from app.models.notification import Notification
from app.models.project import ProjectMember, UserRole
from app.models.user import User

logger = logging.getLogger(__name__)

REMINDER_DAYS = 5
ESCALATION_DAYS = 7
PENDING_STATUSES = [SubmissionStatus.PENDING_REVIEW.value]


def render_approval_reminder_email(
    submission_name: str, submission_type: str, alert_type: str, pending_days: int
) -> tuple[str, str]:
    type_label = "Equipment" if submission_type == "equipment" else "Material"

    if alert_type == "reminder":
        email_subject = f"{type_label} Approval Pending: {submission_name} ({pending_days} days)"
        accent_color = "#D97706"
        accent_bg = "#FFFBEB"
        badge_text = "Reminder"
        heading = "Approval Reminder"
        detail = (
            f"The {type_label.lower()} approval for <strong style=\"color:#0F172A;\">{submission_name}</strong> "
            f"has been pending for <strong>{pending_days} days</strong>. Please review and take action."
        )
    else:
        email_subject = f"ESCALATION: {type_label} Approval Overdue — {submission_name} ({pending_days} days)"
        accent_color = "#DC2626"
        accent_bg = "#FEF2F2"
        badge_text = "Escalation"
        heading = "Approval Escalation"
        detail = (
            f"The {type_label.lower()} approval for <strong style=\"color:#0F172A;\">{submission_name}</strong> "
            f"has been pending for <strong>{pending_days} days</strong> and requires immediate attention."
        )

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
    <span style="display:inline-block;background:{accent_bg};color:{accent_color};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;">{badge_text} &middot; {pending_days} days</span>
  </p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">{detail}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:24px;">
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">Type</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:500;">{type_label}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 18px;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">Submission</p>
        <p style="margin:0;font-size:14px;color:#0F172A;font-weight:600;">{submission_name}</p>
      </td>
    </tr>
  </table>
  <p style="margin:0;font-size:13px;color:#64748B;">Please log in to review and process this approval.</p>
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


async def get_project_admin_emails(db: AsyncSession, project_id) -> list[dict]:
    result = await db.execute(
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.role == UserRole.PROJECT_ADMIN.value,
            User.is_active == True,
        )
    )
    admins = result.scalars().all()
    return [{"user_id": str(a.id), "email": a.email} for a in admins]


async def check_approval_deadlines(db: AsyncSession) -> list[dict]:
    now = datetime.utcnow()
    reminder_threshold = now - timedelta(days=REMINDER_DAYS)
    escalation_threshold = now - timedelta(days=ESCALATION_DAYS)

    eq_result = await db.execute(
        select(EquipmentApprovalSubmission)
        .options(selectinload(EquipmentApprovalSubmission.submitted_by))
        .where(
            EquipmentApprovalSubmission.status.in_(PENDING_STATUSES),
            EquipmentApprovalSubmission.submitted_at.isnot(None),
            EquipmentApprovalSubmission.submitted_at <= reminder_threshold,
        )
    )
    equipment_submissions = eq_result.scalars().all()

    mat_result = await db.execute(
        select(MaterialApprovalSubmission)
        .options(selectinload(MaterialApprovalSubmission.submitted_by))
        .where(
            MaterialApprovalSubmission.status.in_(PENDING_STATUSES),
            MaterialApprovalSubmission.submitted_at.isnot(None),
            MaterialApprovalSubmission.submitted_at <= reminder_threshold,
        )
    )
    material_submissions = mat_result.scalars().all()

    notifications = []

    for sub in equipment_submissions:
        pending_days = (now - sub.submitted_at).days
        notifs = await process_submission(db, sub, "equipment", pending_days, escalation_threshold)
        notifications.extend(notifs)

    for sub in material_submissions:
        pending_days = (now - sub.submitted_at).days
        notifs = await process_submission(db, sub, "material", pending_days, escalation_threshold)
        notifications.extend(notifs)

    if notifications:
        await db.commit()

    logger.info(f"Approval reminder check: {len(notifications)} alerts created")
    return notifications


async def process_submission(
    db: AsyncSession, submission, submission_type: str, pending_days: int, escalation_threshold
) -> list[dict]:
    results = []
    is_escalation = submission.submitted_at <= escalation_threshold
    alert_type = "escalation" if is_escalation else "reminder"

    submitter_id = submission.submitted_by_id
    submitter_email = submission.submitted_by.email if submission.submitted_by else None

    if submitter_id:
        title = (
            f"Approval pending {pending_days} days: {submission.name}"
            if alert_type == "reminder"
            else f"Approval escalation ({pending_days} days): {submission.name}"
        )
        message = (
            f"Your {submission_type} approval submission \"{submission.name}\" "
            f"has been waiting for review for {pending_days} days."
        )

        notification = Notification(
            user_id=submitter_id,
            category="approval",
            title=title,
            message=message,
            related_entity_type=f"{submission_type}_approval_submission",
            related_entity_id=submission.id,
        )
        db.add(notification)

        email_subject, email_html = render_approval_reminder_email(
            submission.name, submission_type, alert_type, pending_days
        )
        results.append({
            "submission_id": str(submission.id),
            "submission_name": submission.name,
            "submission_type": submission_type,
            "alert_type": alert_type,
            "user_id": str(submitter_id),
            "user_email": submitter_email,
            "email_subject": email_subject,
            "email_html": email_html,
        })

    if is_escalation:
        admins = await get_project_admin_emails(db, submission.project_id)
        for admin in admins:
            escalation_title = f"Escalation: {submission_type} approval \"{submission.name}\" pending {pending_days} days"
            escalation_message = (
                f"The {submission_type} approval \"{submission.name}\" has been pending "
                f"for {pending_days} days and requires admin attention."
            )

            notification = Notification(
                user_id=admin["user_id"],
                category="approval",
                title=escalation_title,
                message=escalation_message,
                related_entity_type=f"{submission_type}_approval_submission",
                related_entity_id=submission.id,
            )
            db.add(notification)

            email_subject, email_html = render_approval_reminder_email(
                submission.name, submission_type, "escalation", pending_days
            )
            results.append({
                "submission_id": str(submission.id),
                "submission_name": submission.name,
                "submission_type": submission_type,
                "alert_type": "escalation_admin",
                "user_id": admin["user_id"],
                "user_email": admin["email"],
                "email_subject": email_subject,
                "email_html": email_html,
            })

    return results
