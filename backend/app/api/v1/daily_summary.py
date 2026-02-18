import logging
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.models.project import Project, ProjectMember, UserRole
from app.models.user import User
from app.services.approval_reminder_service import check_approval_deadlines
from app.services.daily_summary_service import collect_project_daily_summary
from app.services.email_renderer import render_daily_summary_email
from app.services.email_service import EmailService
from app.services.rfi_deadline_service import check_rfi_deadlines

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/daily-summary")
async def trigger_daily_summary(
    db: AsyncSession = Depends(get_db),
    summary_date: date = Query(default=None),
    x_scheduler_secret: str = Header(alias="X-Scheduler-Secret"),
):
    settings = get_settings()
    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(status_code=403, detail="Invalid scheduler secret")

    if summary_date is None:
        summary_date = date.today()

    projects_result = await db.execute(
        select(Project).where(
            Project.status == "active",
            Project.daily_summary_enabled == True,
        )
    )
    projects = projects_result.scalars().all()

    email_service = EmailService()
    results = []

    for project in projects:
        summary = await collect_project_daily_summary(db, project.id, summary_date)

        if not summary["has_activity"]:
            results.append({
                "project": project.name,
                "status": "skipped",
                "reason": "no_activity",
            })
            continue

        admins_result = await db.execute(
            select(User)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .where(
                ProjectMember.project_id == project.id,
                ProjectMember.role == UserRole.PROJECT_ADMIN.value,
                User.is_active == True,
            )
        )
        admins = admins_result.scalars().all()

        if not admins:
            results.append({
                "project": project.name,
                "status": "skipped",
                "reason": "no_admins",
            })
            continue

        for admin in admins:
            lang = admin.language or "en"
            subject, body_html = render_daily_summary_email(
                summary=summary,
                project_name=project.name,
                language=lang,
                frontend_url=settings.frontend_base_url,
            )
            try:
                email_service.send_notification(
                    to_email=admin.email,
                    subject=subject,
                    body_html=body_html,
                )
                results.append({
                    "project": project.name,
                    "email": admin.email,
                    "language": lang,
                    "status": "sent",
                })
            except Exception as e:
                logger.error(f"Failed to send daily summary to {admin.email}: {e}")
                results.append({
                    "project": project.name,
                    "email": admin.email,
                    "status": "error",
                    "error": str(e),
                })

    sent_count = sum(1 for r in results if r["status"] == "sent")
    skipped_count = sum(1 for r in results if r["status"] == "skipped")
    error_count = sum(1 for r in results if r["status"] == "error")

    logger.info(
        f"Daily summary completed: {sent_count} sent, {skipped_count} skipped, {error_count} errors"
    )

    return {
        "summary_date": summary_date.isoformat(),
        "total_projects": len(projects),
        "sent": sent_count,
        "skipped": skipped_count,
        "errors": error_count,
        "results": results,
    }


@router.post("/rfi-deadline-check")
async def trigger_rfi_deadline_check(
    db: AsyncSession = Depends(get_db),
    x_scheduler_secret: str = Header(alias="X-Scheduler-Secret"),
):
    settings = get_settings()
    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(status_code=403, detail="Invalid scheduler secret")

    notifications = await check_rfi_deadlines(db)

    email_service = EmailService()
    sent = 0
    errors = 0

    for notif in notifications:
        if not notif.get("user_email"):
            continue
        try:
            email_service.send_notification(
                to_email=notif["user_email"],
                subject=notif["email_subject"],
                body_html=notif["email_html"],
            )
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send RFI deadline email to {notif['user_email']}: {e}")
            errors += 1

    return {
        "total_alerts": len(notifications),
        "emails_sent": sent,
        "emails_errors": errors,
        "notifications": notifications,
    }


@router.post("/approval-reminder-check")
async def trigger_approval_reminder_check(
    db: AsyncSession = Depends(get_db),
    x_scheduler_secret: str = Header(alias="X-Scheduler-Secret"),
):
    settings = get_settings()
    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(status_code=403, detail="Invalid scheduler secret")

    notifications = await check_approval_deadlines(db)

    email_service = EmailService()
    sent = 0
    errors = 0

    for notif in notifications:
        if not notif.get("user_email"):
            continue
        try:
            email_service.send_notification(
                to_email=notif["user_email"],
                subject=notif["email_subject"],
                body_html=notif["email_html"],
            )
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send approval reminder email to {notif['user_email']}: {e}")
            errors += 1

    return {
        "total_alerts": len(notifications),
        "emails_sent": sent,
        "emails_errors": errors,
        "notifications": notifications,
    }
