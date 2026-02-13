import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.core.validation import sanitize_string, validate_email, validate_password
from app.db.session import get_db
from app.models.invitation import InvitationStatus, ProjectInvitation
from app.models.project import ProjectMember
from app.models.user import PasswordResetToken, User
from app.schemas.user import (
    MessageResponse, PasswordResetConfirm, PasswordResetRequest,
    TokenResponse, UserLogin, UserRegister, UserResponse, UserUpdate,
)
from app.services.email_service import EmailService
from app.utils.localization import get_language_from_request, translate_message

logger = logging.getLogger(__name__)

WELCOME_STRINGS = {
    "en": {
        "subject": "Welcome to BuilderOps!",
        "greeting": "Welcome, {name}!",
        "message": "Your account has been created successfully. You can now manage construction projects, track equipment approvals, schedule inspections, and collaborate with your team.",
        "cta": "Go to Dashboard",
        "footer": "This is an automated message from BuilderOps.",
    },
    "he": {
        "subject": "!BuilderOps-ברוכים הבאים ל",
        "greeting": "!{name} ,ברוכים הבאים",
        "message": "החשבון שלך נוצר בהצלחה. כעת תוכל לנהל פרויקטי בנייה, לעקוב אחר אישורי ציוד, לתזמן בדיקות ולשתף פעולה עם הצוות שלך.",
        "cta": "עבור ללוח הבקרה",
        "footer": ".זוהי הודעה אוטומטית מ-BuilderOps",
    },
}


def render_welcome_email(name: str, language: str, frontend_url: str) -> tuple[str, str]:
    s = WELCOME_STRINGS.get(language, WELCOME_STRINGS["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    esc_name = name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    subject = s["subject"]
    body_html = f"""<!DOCTYPE html>
<html lang="{language}" dir="{direction}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:36px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">{s["greeting"].format(name=esc_name)}</h1>
</td></tr>
<tr><td style="padding:32px;text-align:{align};">
<p style="margin:0 0 24px;color:#424242;font-size:15px;line-height:1.7;">{s["message"]}</p>
<div style="text-align:center;">
<a href="{frontend_url}/dashboard" style="display:inline-block;background-color:#1565c0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">{s["cta"]}</a>
</div>
</td></tr>
<tr><td style="background-color:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e0e0e0;">
<p style="margin:0;color:#9e9e9e;font-size:12px;">{s["footer"]}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    return subject, body_html


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    request: Request,
    background_tasks: BackgroundTasks,
    invite_token: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    email = validate_email(data.email)
    password = validate_password(data.password)
    full_name = sanitize_string(data.full_name)

    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        language = get_language_from_request(request)
        error_message = translate_message('email_already_registered', language)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": error_message, "code": "EMAIL_ALREADY_REGISTERED"}
        )

    user = User(
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
        is_active=True
    )
    db.add(user)
    await db.flush()

    if invite_token:
        inv_result = await db.execute(
            select(ProjectInvitation).where(ProjectInvitation.token == invite_token)
        )
        invitation = inv_result.scalar_one_or_none()
        if invitation and invitation.status == InvitationStatus.PENDING.value:
            if invitation.email.lower() == email.lower() and invitation.expires_at > datetime.utcnow():
                member = ProjectMember(
                    project_id=invitation.project_id,
                    user_id=user.id,
                    role=invitation.role,
                )
                db.add(member)
                invitation.status = InvitationStatus.ACCEPTED.value
                invitation.accepted_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)

    language = get_language_from_request(request)
    try:
        email_service = EmailService()
        if email_service.enabled:
            settings = get_settings()
            subject, body_html = render_welcome_email(
                full_name or email, language, settings.frontend_base_url
            )
            background_tasks.add_task(
                email_service.send_notification,
                to_email=email,
                subject=subject,
                body_html=body_html,
            )
    except Exception:
        logger.warning("Failed to send welcome email", exc_info=True)

    access_token = create_access_token(user.id)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    # Validate and sanitize input
    email = validate_email(data.email)
    language = get_language_from_request(request)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        error_message = translate_message('invalid_credentials', language)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message
        )

    if not verify_password(data.password, user.password_hash):
        error_message = translate_message('invalid_credentials', language)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message
        )

    if not user.is_active:
        error_message = translate_message('account_inactive', language)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message
        )

    access_token = create_access_token(user.id)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.company is not None:
        user.company = data.company
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: PasswordResetRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    language = get_language_from_request(request)
    generic_message = translate_message('password_reset_sent', language)

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = secrets.token_urlsafe(48)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(reset_token)
        await db.commit()

        settings = get_settings()
        reset_url = f"{settings.frontend_base_url}/reset-password?token={token}"
        body_html = (
            f"<p>You requested a password reset for your BuilderOps account.</p>"
            f"<p><a href='{reset_url}'>Click here to reset your password</a></p>"
            f"<p>This link expires in 1 hour.</p>"
            f"<p>If you didn't request this, please ignore this email.</p>"
        )

        try:
            email_service = EmailService()
            if email_service.enabled:
                background_tasks.add_task(
                    email_service.send_notification,
                    to_email=user.email,
                    subject="BuilderOps - Password Reset",
                    body_html=body_html,
                )
        except Exception:
            logger.warning("Failed to send password reset email", exc_info=True)

    return MessageResponse(message=generic_message)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: PasswordResetConfirm,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    language = get_language_from_request(request)

    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == data.token)
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token or reset_token.used_at or reset_token.expires_at < datetime.utcnow():
        error_message = translate_message('invalid_reset_token', language)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one_or_none()

    if not user:
        error_message = translate_message('invalid_reset_token', language)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    password = validate_password(data.new_password)
    user.password_hash = get_password_hash(password)
    reset_token.used_at = datetime.utcnow()

    await db.commit()

    success_message = translate_message('password_reset_success', language)
    return MessageResponse(message=success_message)
