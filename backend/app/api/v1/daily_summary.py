import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.models.project import Project, ProjectMember, UserRole
from app.models.user import User
from app.services.approval_reminder_service import check_approval_deadlines
from app.services.daily_summary_service import collect_project_daily_summary
from app.services.email_renderer import render_daily_summary_email, render_notification_digest_email
from app.services.email_service import EmailService
from app.services.gmail_service import GmailService
from app.services.notification_digest_service import collect_project_digest, should_send_digest
from app.services.rfi_deadline_service import check_rfi_deadlines
from app.utils import utcnow

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

    try:
        gmail = GmailService()
        watch_result = gmail.renew_watch()
        if watch_result.get("status") == "invalid_token":
            logger.error(
                "Gmail watch renewal failed: OAuth2 token expired or revoked. "
                "Daily summary will continue, but Gmail notifications may be affected."
            )
        elif watch_result.get("status") == "error":
            logger.warning(f"Gmail watch renewal error: {watch_result.get('error')}")
        else:
            logger.info(f"Gmail watch renewal: {watch_result}")
    except Exception as e:
        logger.error(f"Unexpected error during Gmail watch renewal: {e}. Continuing with daily summary.")

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
            except RuntimeError as e:
                # OAuth/authentication errors from GmailService are wrapped in RuntimeError
                error_msg = str(e)
                if "OAuth" in error_msg or "authentication failed" in error_msg or "re-authorize" in error_msg:
                    logger.error(
                        f"Gmail OAuth/authentication error when sending daily summary to {admin.email}: {e}. "
                        f"Project: {project.name}. Re-authorization may be required."
                    )
                    results.append({
                        "project": project.name,
                        "email": admin.email,
                        "status": "auth_error",
                        "error": str(e),
                    })
                else:
                    # Other RuntimeErrors
                    logger.error(f"Failed to send daily summary to {admin.email}: {e}")
                    results.append({
                        "project": project.name,
                        "email": admin.email,
                        "status": "error",
                        "error": str(e),
                    })
            except Exception as e:
                # Generic errors (network issues, etc.)
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
    auth_error_count = sum(1 for r in results if r["status"] == "auth_error")

    logger.info(
        f"Daily summary completed: {sent_count} sent, {skipped_count} skipped, "
        f"{error_count} errors, {auth_error_count} auth errors"
    )

    return {
        "summary_date": summary_date.isoformat(),
        "total_projects": len(projects),
        "sent": sent_count,
        "skipped": skipped_count,
        "errors": error_count,
        "auth_errors": auth_error_count,
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


@router.post("/notification-digest")
async def trigger_notification_digest(
    db: AsyncSession = Depends(get_db),
    x_scheduler_secret: str = Header(alias="X-Scheduler-Secret"),
):
    settings = get_settings()
    if x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(status_code=403, detail="Invalid scheduler secret")

    projects_result = await db.execute(
        select(Project).where(
            Project.status == "active",
            Project.notification_digest_interval_hours > 0,
        )
    )
    projects = projects_result.scalars().all()

    email_service = EmailService()
    results = []

    for project in projects:
        if not await should_send_digest(project):
            results.append({"project": project.name, "status": "skipped", "reason": "interval_not_reached"})
            continue

        since = project.last_digest_sent_at or (utcnow() - timedelta(hours=project.notification_digest_interval_hours or 48))
        digest = await collect_project_digest(db, project.id, since)

        if not digest["has_events"]:
            results.append({"project": project.name, "status": "skipped", "reason": "no_events"})
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

        for admin in admins:
            lang = admin.language or "en"
            subject, body_html = render_notification_digest_email(
                digest=digest,
                project_name=project.name,
                language=lang,
                frontend_url=settings.frontend_base_url,
            )
            try:
                email_service.send_notification(to_email=admin.email, subject=subject, body_html=body_html)
                results.append({"project": project.name, "email": admin.email, "language": lang, "status": "sent"})
            except Exception as e:
                logger.error(f"Failed to send digest to {admin.email}: {e}")
                results.append({"project": project.name, "email": admin.email, "status": "error", "error": str(e)})

        project.last_digest_sent_at = utcnow()

    await db.commit()

    sent_count = sum(1 for r in results if r["status"] == "sent")
    skipped_count = sum(1 for r in results if r["status"] == "skipped")
    error_count = sum(1 for r in results if r["status"] == "error")

    return {
        "total_projects": len(projects),
        "sent": sent_count,
        "skipped": skipped_count,
        "errors": error_count,
        "results": results,
    }
