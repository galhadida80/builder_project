import base64
import json
import logging
from fastapi import APIRouter, Request, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.rfi_service import RFIService
from app.services.gmail_service import GmailService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/gmail/push")
async def gmail_push_notification(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
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
    from app.db.session import async_session_maker

    gmail_service = GmailService()

    if not gmail_service.enabled:
        logger.warning("Gmail service not enabled, skipping history processing")
        return

    try:
        history = gmail_service.get_history(history_id)

        if 'history' not in history:
            logger.info(f"No new history records for historyId: {history_id}")
            return

        async with async_session_maker() as db:
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
