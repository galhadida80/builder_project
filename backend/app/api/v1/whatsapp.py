import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.whatsapp import (
    WhatsAppLinkRequest,
    WhatsAppLinkResponse,
    WhatsAppUnlinkResponse,
    WhatsAppVerifyRequest,
    WhatsAppVerifyResponse,
    WhatsAppWebhookRequest,
)
from app.services.chat_service import send_message
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for verification codes (user_id -> {code, phone, expires_at})
# In production, this should use Redis for distributed systems
_verification_codes: Dict[str, dict] = {}


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint for incoming WhatsApp messages from Twilio.

    Receives messages, maps phone number to user, processes through chat service,
    and sends response back via WhatsApp.
    """
    whatsapp_service = WhatsAppService()

    # Get form data from Twilio webhook
    try:
        form_data = await request.form()
        body_params = dict(form_data)
    except Exception as e:
        logger.error(f"Failed to parse webhook form data: {e}")
        raise HTTPException(status_code=400, detail="Invalid form data")

    # Verify Twilio signature
    signature = request.headers.get("X-Twilio-Signature", "")
    if not whatsapp_service.verify_webhook_signature(
        signature=signature,
        url=str(request.url),
        body_params=body_params
    ):
        logger.warning("Invalid Twilio webhook signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    # Parse webhook data
    try:
        webhook_data = WhatsAppWebhookRequest(**body_params)
    except Exception as e:
        logger.error(f"Failed to parse webhook data: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    # Extract phone number (Twilio sends "whatsapp:+972501234567")
    phone_number = webhook_data.From
    if phone_number.startswith("whatsapp:"):
        phone_number = phone_number[9:]  # Remove "whatsapp:" prefix

    # Find user by WhatsApp number
    result = await db.execute(
        select(User).where(
            User.whatsapp_number == phone_number,
            User.whatsapp_verified == True,
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        logger.warning(f"WhatsApp message from unverified/unknown number: {phone_number}")
        # Send helpful response
        try:
            whatsapp_service.send_message(
                to_whatsapp=phone_number,
                body="שלום! מספר זה לא מקושר לחשבון BuilderOps. אנא קשר את מספר הוואטסאפ שלך דרך דף הפרופיל באפליקציה.\n\nHello! This number is not linked to a BuilderOps account. Please link your WhatsApp number through the profile page in the app."
            )
        except Exception as e:
            logger.error(f"Failed to send unlinked response: {e}")

        return {"status": "ok", "message": "Number not linked"}

    # Get user's first project
    project_result = await db.execute(
        select(ProjectMember.project_id)
        .where(ProjectMember.user_id == user.id)
        .limit(1)
    )
    project_row = project_result.first()

    if not project_row:
        logger.warning(f"User {user.id} has no projects")
        try:
            whatsapp_service.send_message(
                to_whatsapp=phone_number,
                body="לא נמצאו פרויקטים לחשבון שלך. אנא פנה למנהל המערכת.\n\nNo projects found for your account. Please contact your administrator."
            )
        except Exception as e:
            logger.error(f"Failed to send no-projects response: {e}")

        return {"status": "ok", "message": "No projects"}

    project_id = project_row[0]

    # Process message through chat service
    try:
        result = await send_message(
            db=db,
            project_id=project_id,
            user_id=user.id,
            message=webhook_data.Body,
            conversation_id=None  # Create new conversation for each WhatsApp interaction
        )

        assistant_message = result.get("assistant_message")
        if assistant_message and assistant_message.content:
            response_text = assistant_message.content
        else:
            response_text = "מצטער, לא הצלחתי לעבד את ההודעה.\n\nSorry, I couldn't process your message."

        # Send AI response back via WhatsApp
        try:
            whatsapp_service.send_message(
                to_whatsapp=phone_number,
                body=response_text
            )
            logger.info(f"Successfully processed WhatsApp message from {phone_number}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp response: {e}")
            raise HTTPException(status_code=500, detail="Failed to send response")

        # Check for pending actions
        pending_actions = result.get("pending_actions", [])
        if pending_actions:
            action_count = len(pending_actions)
            action_text = f"📋 יש {action_count} פעולות מוצעות. אנא בדוק את האפליקציה לאישור.\n\n📋 There are {action_count} proposed actions. Please check the app for approval."
            try:
                whatsapp_service.send_message(
                    to_whatsapp=phone_number,
                    body=action_text
                )
            except Exception as e:
                logger.error(f"Failed to send pending actions notification: {e}")

    except ValueError as e:
        logger.error(f"Chat service error: {e}")
        try:
            whatsapp_service.send_message(
                to_whatsapp=phone_number,
                body="שגיאה בעיבוד ההודעה.\n\nError processing message."
            )
        except Exception as send_err:
            logger.error(f"Failed to send error response: {send_err}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing WhatsApp message: {e}", exc_info=True)
        try:
            whatsapp_service.send_message(
                to_whatsapp=phone_number,
                body="שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.\n\nUnexpected error. Please try again later."
            )
        except Exception as send_err:
            logger.error(f"Failed to send error response: {send_err}")
        raise HTTPException(status_code=500, detail="Failed to process message")

    return {"status": "ok", "message": "Message processed"}


@router.post("/users/me/whatsapp/link", response_model=WhatsAppLinkResponse)
async def link_whatsapp_number(
    data: WhatsAppLinkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate WhatsApp number linking by sending a verification code.

    The verification code will be sent to the provided WhatsApp number
    and must be verified within 10 minutes using the /verify endpoint.
    """
    whatsapp_number = data.whatsapp_number

    # Check if another user already has this WhatsApp number verified
    result = await db.execute(
        select(User).where(
            User.whatsapp_number == whatsapp_number,
            User.whatsapp_verified == True,
            User.id != user.id
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="This WhatsApp number is already linked to another account"
        )

    # Generate 6-digit verification code
    verification_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store verification code with expiration (10 minutes)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    _verification_codes[str(user.id)] = {
        'code': verification_code,
        'phone': whatsapp_number,
        'expires_at': expires_at
    }

    # Send verification code via WhatsApp
    whatsapp_service = WhatsAppService()

    # Prepare bilingual message
    if user.language == 'he':
        message = f"🔐 קוד האימות שלך ל-BuilderOps הוא: *{verification_code}*\n\nהקוד תקף ל-10 דקות."
    else:
        message = f"🔐 Your BuilderOps verification code is: *{verification_code}*\n\nThis code is valid for 10 minutes."

    try:
        whatsapp_service.send_message(
            to_whatsapp=whatsapp_number,
            body=message
        )
        logger.info(f"Verification code sent to {whatsapp_number} for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to send verification code to {whatsapp_number}: {e}")
        # Clean up verification code if sending failed
        _verification_codes.pop(str(user.id), None)
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification code. Please check the WhatsApp number and try again."
        )

    return WhatsAppLinkResponse(
        message="Verification code sent to your WhatsApp number",
        whatsapp_number=whatsapp_number,
        verification_required=True
    )


@router.post("/users/me/whatsapp/verify", response_model=WhatsAppVerifyResponse)
async def verify_whatsapp_number(
    data: WhatsAppVerifyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify WhatsApp number by submitting the code received via WhatsApp.

    Once verified, the WhatsApp number will be linked to the user's account
    and they can receive notifications and interact with the AI via WhatsApp.
    """
    user_id = str(user.id)

    # Check if verification code exists
    if user_id not in _verification_codes:
        raise HTTPException(
            status_code=400,
            detail="No verification in progress. Please request a new code."
        )

    verification_data = _verification_codes[user_id]

    # Check if code expired
    if datetime.now(timezone.utc) > verification_data['expires_at']:
        _verification_codes.pop(user_id, None)
        raise HTTPException(
            status_code=400,
            detail="Verification code expired. Please request a new code."
        )

    # Verify code
    if data.code != verification_data['code']:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code. Please try again."
        )

    # Update user's WhatsApp number and mark as verified
    user.whatsapp_number = verification_data['phone']
    user.whatsapp_verified = True

    await db.commit()
    await db.refresh(user)

    # Clean up verification code
    _verification_codes.pop(user_id, None)

    logger.info(f"WhatsApp number {user.whatsapp_number} verified for user {user.id}")

    return WhatsAppVerifyResponse(
        message="WhatsApp number verified successfully",
        whatsapp_number=user.whatsapp_number,
        verified=True
    )


@router.delete("/users/me/whatsapp/unlink", response_model=WhatsAppUnlinkResponse)
async def unlink_whatsapp_number(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unlink WhatsApp number from the user's account.

    After unlinking, the user will no longer receive WhatsApp notifications
    or be able to interact with the AI via WhatsApp.
    """
    if not user.whatsapp_number:
        raise HTTPException(
            status_code=404,
            detail="No WhatsApp number linked to this account"
        )

    # Store number for logging before clearing
    old_number = user.whatsapp_number

    # Clear WhatsApp number and verification status
    user.whatsapp_number = None
    user.whatsapp_verified = False

    await db.commit()
    await db.refresh(user)

    # Clean up any pending verification codes
    _verification_codes.pop(str(user.id), None)

    logger.info(f"WhatsApp number {old_number} unlinked from user {user.id}")

    return WhatsAppUnlinkResponse(
        message="WhatsApp number unlinked successfully"
    )
