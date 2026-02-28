import hashlib
import hmac
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.models.bim import AutodeskConnection
from app.models.rfi import RFI
from app.services.acc_rfi_sync_service import ACCRFISyncService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/acc", tags=["acc"])
settings = get_settings()


def verify_acc_webhook_signature(signature: str, body: bytes, secret: str) -> bool:
    """
    Verify HMAC-SHA256 signature of ACC webhook request body.

    Args:
        signature: X-ACC-Signature header value
        body: Raw request body bytes
        secret: Webhook secret from settings

    Returns:
        True if signature is valid, False otherwise
    """
    expected = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.post("/webhooks")
async def acc_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint for incoming ACC Issue events from Autodesk Construction Cloud.

    Receives webhooks for:
    - issue.created-1.0: New issue created
    - issue.updated-1.0: Issue updated
    - issue.deleted-1.0: Issue deleted
    - issue.restored-1.0: Issue restored
    - issue.unlinked-1.0: Issue unlinked from document

    Verifies webhook signature and triggers RFI sync for affected issues.
    """
    # Verify webhook signature if secret is configured
    if settings.webhook_secret:
        signature = request.headers.get("X-ACC-Signature", "")
        if not signature:
            logger.warning("Missing X-ACC-Signature header")
            raise HTTPException(status_code=401, detail="Missing X-ACC-Signature header")

        body = await request.body()
        if not verify_acc_webhook_signature(signature, body, settings.webhook_secret):
            logger.warning("Invalid ACC webhook signature")
            raise HTTPException(status_code=403, detail="Invalid webhook signature")

        # Parse JSON from already-read body
        try:
            import json
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.error("Failed to parse ACC webhook payload")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    else:
        # If no secret configured, accept without verification (dev mode)
        logger.warning("Webhook secret not configured - accepting unverified webhook")
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse ACC webhook payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Extract event details
    event_type = payload.get("hook", {}).get("event")
    hook_payload = payload.get("payload", {})

    # Extract issue and container IDs
    issue_id = hook_payload.get("issueId") or hook_payload.get("id")
    container_id = hook_payload.get("containerId")
    project_id_acc = hook_payload.get("projectId")

    if not issue_id or not container_id:
        logger.error(f"Missing required fields in webhook payload: {payload}")
        raise HTTPException(status_code=400, detail="Missing issueId or containerId")

    logger.info(
        f"Received ACC webhook: event={event_type}, "
        f"issue_id={issue_id}, container_id={container_id}"
    )

    # Find BuilderOps project and user with ACC connection for this container
    try:
        # Look for existing RFI with this ACC issue ID to get project context
        result = await db.execute(
            select(RFI).where(RFI.acc_issue_id == issue_id).limit(1)
        )
        existing_rfi = result.scalar_one_or_none()

        if existing_rfi:
            # Use existing RFI's project
            project_id = existing_rfi.project_id
            logger.info(f"Found existing RFI {existing_rfi.id} for ACC issue {issue_id}")
        else:
            # Try to find project via AutodeskConnection with matching container
            conn_result = await db.execute(
                select(AutodeskConnection)
                .where(AutodeskConnection.acc_container_id == container_id)
                .limit(1)
            )
            connection = conn_result.scalar_one_or_none()

            if not connection:
                logger.warning(
                    f"No AutodeskConnection found for container {container_id}. "
                    "Webhook will be ignored."
                )
                # Return 200 to prevent ACC from retrying
                return {
                    "status": "ok",
                    "message": "Container not linked to BuilderOps project"
                }

            # Get project from connection (assuming first project for this user)
            # In production, you'd store project_id in AutodeskConnection.acc_metadata
            from app.models.project import ProjectMember

            project_result = await db.execute(
                select(ProjectMember.project_id)
                .where(ProjectMember.user_id == connection.user_id)
                .limit(1)
            )
            project_row = project_result.first()

            if not project_row:
                logger.warning(
                    f"No project found for user {connection.user_id}. "
                    "Webhook will be ignored."
                )
                return {
                    "status": "ok",
                    "message": "User has no projects"
                }

            project_id = project_row[0]

        # Queue background sync for this specific issue
        background_tasks.add_task(
            sync_acc_issue,
            db=db,
            project_id=project_id,
            container_id=container_id,
            issue_id=issue_id,
            event_type=event_type
        )

        logger.info(
            f"Queued ACC issue sync: project={project_id}, "
            f"issue={issue_id}, event={event_type}"
        )

        return {
            "status": "ok",
            "message": "Webhook received",
            "event_type": event_type,
            "issue_id": issue_id
        }

    except Exception as e:
        logger.error(f"Failed to process ACC webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process webhook")


async def sync_acc_issue(
    db: AsyncSession,
    project_id: uuid.UUID,
    container_id: str,
    issue_id: str,
    event_type: str
):
    """
    Background task to sync a specific ACC issue to BuilderOps.

    Args:
        db: Database session
        project_id: BuilderOps project ID
        container_id: ACC container ID
        issue_id: ACC issue ID
        event_type: Webhook event type
    """
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        try:
            # Find user with ACC connection for this container
            result = await session.execute(
                select(AutodeskConnection)
                .where(AutodeskConnection.acc_container_id == container_id)
                .limit(1)
            )
            connection = result.scalar_one_or_none()

            if not connection:
                logger.error(f"No AutodeskConnection found for container {container_id}")
                return

            # Initialize sync service
            sync_service = ACCRFISyncService(session)

            # Handle different event types
            if event_type in ["issue.created-1.0", "issue.updated-1.0", "issue.restored-1.0"]:
                # Trigger full project sync (includes this issue)
                # In a more optimized version, you'd sync just this specific issue
                result = await sync_service.sync_project_rfis(
                    project_id=project_id,
                    user_id=connection.user_id,
                    container_id=container_id
                )

                logger.info(
                    f"ACC issue sync completed: created={result.get('created_count')}, "
                    f"updated={result.get('updated_count')}, "
                    f"conflicts={result.get('conflict_count')}"
                )

            elif event_type == "issue.deleted-1.0":
                # Mark RFI as deleted or sync status
                rfi_result = await session.execute(
                    select(RFI).where(RFI.acc_issue_id == issue_id)
                )
                rfi = rfi_result.scalar_one_or_none()

                if rfi:
                    rfi.sync_status = "deleted_in_acc"
                    await session.commit()
                    logger.info(f"Marked RFI {rfi.id} as deleted in ACC")

            elif event_type == "issue.unlinked-1.0":
                # Handle unlinked pushpin issues
                logger.info(f"Issue {issue_id} was unlinked from document (pushpin)")
                # Could update metadata or sync status if needed

        except Exception as e:
            logger.error(f"Failed to sync ACC issue {issue_id}: {e}", exc_info=True)
            await session.rollback()
