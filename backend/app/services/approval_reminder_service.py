import logging
from datetime import timedelta

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.equipment_template import EquipmentApprovalSubmission, SubmissionStatus
from app.models.material_template import MaterialApprovalSubmission
from app.models.notification import Notification
from app.models.project import ProjectMember, UserRole
from app.models.user import User
from app.services.email_renderer import render_approval_reminder_email
from app.utils import utcnow

logger = logging.getLogger(__name__)

REMINDER_DAYS = 5
ESCALATION_DAYS = 7
PENDING_STATUSES = [SubmissionStatus.PENDING_REVIEW.value]


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
    return [{"user_id": a.id, "email": a.email} for a in admins]


async def check_approval_deadlines(db: AsyncSession) -> list[dict]:
    now = utcnow()
    escalation_threshold = now - timedelta(days=ESCALATION_DAYS)
    reminder_interval = text(f"interval '{REMINDER_DAYS} days'")

    eq_result = await db.execute(
        select(EquipmentApprovalSubmission)
        .options(selectinload(EquipmentApprovalSubmission.submitted_by))
        .where(
            EquipmentApprovalSubmission.status.in_(PENDING_STATUSES),
            EquipmentApprovalSubmission.submitted_at.isnot(None),
            EquipmentApprovalSubmission.submitted_at <= func.now() - reminder_interval,
        )
    )
    equipment_submissions = eq_result.scalars().all()

    mat_result = await db.execute(
        select(MaterialApprovalSubmission)
        .options(selectinload(MaterialApprovalSubmission.submitted_by))
        .where(
            MaterialApprovalSubmission.status.in_(PENDING_STATUSES),
            MaterialApprovalSubmission.submitted_at.isnot(None),
            MaterialApprovalSubmission.submitted_at <= func.now() - reminder_interval,
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
