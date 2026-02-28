import base64
import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.services.gmail_service import GmailService
from app.services.rfi_service import RFIService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])
settings = get_settings()


def verify_pubsub_token(request: Request):
    if not settings.google_pubsub_verify:
        return

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Missing or invalid Authorization header")

    token = auth_header[len("Bearer "):]

    try:
        claim = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=settings.google_pubsub_audience or None,
        )
        logger.info(f"Pub/Sub token verified, email: {claim.get('email')}")
    except Exception as e:
        logger.warning(f"Pub/Sub token verification failed: {e}")
        raise HTTPException(status_code=403, detail="Invalid Pub/Sub token")


def verify_webhook_signature(signature: str, body: bytes, secret: str) -> bool:
    """Verify HMAC-SHA256 signature of webhook request body."""
    expected = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.post("/gmail/push")
async def gmail_push_notification(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    verify_pubsub_token(request)
    try:
        body = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook body: {e}")
        return {"status": "error", "message": "Invalid JSON"}

    if 'message' not in body:
        logger.warning("Webhook received without message field")
        return {"status": "no message"}

    pubsub_message = body['message']

    if 'data' not in pubsub_message:
        logger.warning("Pub/Sub message has no data field")
        return {"status": "no data"}

    try:
        data = base64.b64decode(pubsub_message['data']).decode('utf-8')
        notification = json.loads(data)
        history_id = notification.get('historyId')

        if history_id:
            background_tasks.add_task(
                process_gmail_history,
                history_id=history_id
            )
            logger.info(f"Queued Gmail history processing for historyId: {history_id}")

    except Exception as e:
        logger.error(f"Failed to process Pub/Sub message: {e}")

    return {"status": "ok"}


async def process_gmail_history(history_id: str):
    from app.db.session import AsyncSessionLocal

    gmail_service = GmailService()

    if not gmail_service.enabled:
        logger.warning("Gmail service not enabled, skipping history processing")
        return

    try:
        history = gmail_service.get_history(history_id)

        if 'history' not in history:
            logger.info(f"No new history records for historyId: {history_id}")
            return

        async with AsyncSessionLocal() as db:
            rfi_service = RFIService(db)

            for record in history['history']:
                for msg_added in record.get('messagesAdded', []):
                    message_id = msg_added['message']['id']
                    labels = msg_added['message'].get('labelIds', [])

                    if 'INBOX' not in labels:
                        continue

                    try:
                        full_message = gmail_service.get_message(message_id)
                        response = await rfi_service.process_incoming_email(full_message)

                        if response:
                            logger.info(f"Processed email as RFI response: {response.id}")
                        else:
                            logger.info(f"Email {message_id} did not match any RFI")

                    except Exception as e:
                        logger.error(f"Failed to process message {message_id}: {e}")

    except Exception as e:
        logger.error(f"Failed to process Gmail history: {e}")


@router.post("/gmail/setup-watch")
async def setup_gmail_watch():
    gmail_service = GmailService()

    if not gmail_service.enabled:
        return {"status": "error", "message": "Gmail service not configured"}

    try:
        settings = gmail_service.settings
        if not settings.google_pubsub_topic:
            return {"status": "error", "message": "Pub/Sub topic not configured"}

        result = gmail_service.setup_watch(settings.google_pubsub_topic)
        return {
            "status": "ok",
            "historyId": result.get('historyId'),
            "expiration": result.get('expiration')
        }
    except Exception as e:
        logger.error(f"Failed to setup Gmail watch: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/incoming")
async def receive_webhook(request: Request):
    """Generic webhook endpoint secured with HMAC-SHA256 signature verification."""
    if not settings.webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    signature = request.headers.get("X-Webhook-Signature", "")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing X-Webhook-Signature header")

    body = await request.body()
    if not verify_webhook_signature(signature, body, settings.webhook_secret):
        logger.warning("Webhook signature verification failed")
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = payload.get("event_type", "unknown")
    logger.info(f"Received verified webhook event: {event_type}")

    return {"status": "ok", "event_type": event_type}


@router.post("/scheduled-reports")
async def scheduled_reports_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Webhook endpoint for Cloud Scheduler to trigger scheduled report generation."""
    if not settings.scheduler_secret:
        raise HTTPException(status_code=500, detail="Scheduler secret not configured")

    try:
        body = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook body: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    report_id = body.get("report_id")
    scheduler_secret = body.get("scheduler_secret")

    if not report_id:
        raise HTTPException(status_code=400, detail="Missing report_id")

    if not scheduler_secret:
        raise HTTPException(status_code=401, detail="Missing scheduler_secret")

    if scheduler_secret != settings.scheduler_secret:
        logger.warning("Scheduler secret verification failed")
        raise HTTPException(status_code=403, detail="Invalid scheduler_secret")

    background_tasks.add_task(
        execute_scheduled_report,
        report_id=report_id
    )
    logger.info(f"Queued scheduled report execution for report_id: {report_id}")

    return {"status": "ok", "report_id": report_id}


async def execute_scheduled_report(report_id: str):
    from uuid import UUID

    from app.db.session import AsyncSessionLocal
    from app.models.project import Project
    from app.models.scheduled_report import ScheduledReport
    from app.services.ai_report_generator import send_report_email
    from app.services.inspection_report_service import (
        generate_ai_inspection_summary_pdf,
        generate_ai_weekly_report_pdf,
    )
    from app.utils import utcnow

    try:
        report_uuid = UUID(report_id)
    except (ValueError, TypeError):
        logger.error(f"Invalid report_id format: {report_id}")
        return

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        stmt = select(ScheduledReport).where(ScheduledReport.id == report_uuid)
        result = await db.execute(stmt)
        scheduled_report = result.scalar_one_or_none()

        if not scheduled_report:
            logger.error(f"Scheduled report not found: {report_id}")
            return

        if not scheduled_report.is_active:
            logger.info(f"Scheduled report is inactive: {report_id}")
            return

        try:
            report_type = scheduled_report.report_type
            project_id = scheduled_report.project_id
            config = scheduled_report.config or {}
            language = config.get("language", "he")

            logger.info(f"Generating {report_type} report for project {project_id}")

            # Get project info for email
            project_stmt = select(Project).where(Project.id == project_id)
            project_result = await db.execute(project_stmt)
            project = project_result.scalar_one_or_none()

            if not project:
                logger.error(f"Project not found: {project_id}")
                return

            if report_type == "weekly-ai":
                pdf_bytes = await generate_ai_weekly_report_pdf(
                    db=db,
                    project_id=project_id,
                    language=language,
                    config=config
                )
            elif report_type == "inspection-summary-ai":
                pdf_bytes = await generate_ai_inspection_summary_pdf(
                    db=db,
                    project_id=project_id,
                    language=language,
                    config=config
                )
            else:
                logger.warning(f"Unsupported report type for scheduled execution: {report_type}")
                return

            # Send email to recipients if configured
            if scheduled_report.recipients and pdf_bytes:
                try:
                    date_from = config.get("date_from", "")
                    date_to = config.get("date_to", "")
                    report_date = f"{date_from} to {date_to}" if date_from and date_to else None

                    email_result = send_report_email(
                        recipients=scheduled_report.recipients,
                        project_name=project.name,
                        report_type=report_type,
                        pdf_bytes=pdf_bytes,
                        language=language,
                        report_date=report_date
                    )
                    logger.info(
                        f"Email sent for report {report_id}: "
                        f"{email_result['sent_count']} sent, {email_result['failed_count']} failed"
                    )
                except Exception as email_error:
                    logger.error(f"Failed to send email for report {report_id}: {email_error}")

            scheduled_report.last_run_at = utcnow()
            scheduled_report.run_count += 1
            await db.commit()

            logger.info(f"Successfully generated scheduled report {report_id}")

        except Exception as e:
            logger.error(f"Failed to generate scheduled report {report_id}: {e}")
            await db.rollback()
