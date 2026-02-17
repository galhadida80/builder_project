import base64
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from webauthn import generate_authentication_options, generate_registration_options, verify_authentication_response, verify_registration_response
from webauthn.helpers.cose import COSEAlgorithmIdentifier
from webauthn.helpers.structs import AuthenticatorSelectionCriteria, PublicKeyCredentialDescriptor, ResidentKeyRequirement, UserVerificationRequirement

from app.config import get_settings
from app.core.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.core.validation import sanitize_string, validate_email, validate_password
from app.core.webauthn_challenges import get_challenge, store_challenge
from app.db.session import get_db
from app.models.invitation import InvitationStatus, ProjectInvitation
from app.models.project import ProjectMember
from app.models.user import PasswordResetToken, User
from app.models.webauthn_credential import WebAuthnCredential
from app.schemas.user import (
    MessageResponse, PasswordResetConfirm, PasswordResetRequest,
    TokenResponse, UserLogin, UserRegister, UserResponse, UserUpdate,
)
from app.schemas.webauthn import (
    WebAuthnCheckResponse, WebAuthnCredentialResponse,
    WebAuthnLoginBeginRequest, WebAuthnLoginCompleteRequest, WebAuthnLoginOptionsResponse,
    WebAuthnRegisterBeginRequest, WebAuthnRegisterCompleteRequest, WebAuthnRegisterOptionsResponse,
)
from app.services.email_renderer import render_password_reset_email, render_welcome_email
from app.services.email_service import EmailService
from app.utils.localization import get_language_from_request, translate_message
from app.middleware.rate_limiter import get_rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = get_rate_limiter()


def safe_send_email(email_service: EmailService, to_email: str, subject: str, body_html: str):
    try:
        email_service.send_notification(to_email=to_email, subject=subject, body_html=body_html)
    except Exception:
        logger.warning("Background email send failed for %s", to_email, exc_info=True)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/5minute")
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
                safe_send_email, email_service, email, subject, body_html,
            )
    except Exception:
        logger.warning("Failed to send welcome email", exc_info=True)

    access_token = create_access_token(user.id)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/5minute")
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
@limiter.limit("3/hour")
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
        subject, body_html = render_password_reset_email(reset_url, language)

        try:
            email_service = EmailService()
            if email_service.enabled:
                background_tasks.add_task(
                    safe_send_email, email_service, user.email, subject, body_html,
                )
        except Exception:
            logger.warning("Failed to send password reset email", exc_info=True)

    return MessageResponse(message=generic_message)


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("3/hour")
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


@router.post("/webauthn/register/begin", response_model=WebAuthnRegisterOptionsResponse)
async def webauthn_register_begin(
    data: WebAuthnRegisterBeginRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)
    )
    existing = result.scalars().all()
    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=c.credential_id) for c in existing
    ]

    options = generate_registration_options(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        user_id=str(user.id).encode(),
        user_name=user.email,
        user_display_name=user.full_name or user.email,
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
    )

    store_challenge(f"reg:{user.id}", options.challenge)

    options_dict = {
        "rp": {"name": options.rp.name, "id": options.rp.id},
        "user": {
            "id": base64.urlsafe_b64encode(options.user.id).decode().rstrip("="),
            "name": options.user.name,
            "displayName": options.user.display_name,
        },
        "challenge": base64.urlsafe_b64encode(options.challenge).decode().rstrip("="),
        "pubKeyCredParams": [{"type": "public-key", "alg": p.alg} for p in options.pub_key_cred_params],
        "timeout": options.timeout,
        "excludeCredentials": [
            {"type": "public-key", "id": base64.urlsafe_b64encode(c.id).decode().rstrip("=")}
            for c in (options.exclude_credentials or [])
        ],
        "authenticatorSelection": {
            "residentKey": options.authenticator_selection.resident_key.value if options.authenticator_selection else "preferred",
            "userVerification": options.authenticator_selection.user_verification.value if options.authenticator_selection else "preferred",
        },
        "attestation": options.attestation.value if options.attestation else "none",
    }

    return WebAuthnRegisterOptionsResponse(options=options_dict)


@router.post("/webauthn/register/complete", response_model=WebAuthnCredentialResponse)
async def webauthn_register_complete(
    data: WebAuthnRegisterCompleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    challenge = get_challenge(f"reg:{user.id}")
    if not challenge:
        raise HTTPException(status_code=400, detail="Challenge expired or not found")

    try:
        verification = verify_registration_response(
            credential=data.credential,
            expected_challenge=challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.frontend_base_url,
        )
    except Exception as e:
        logger.warning("WebAuthn registration verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Verification failed")

    transports = ",".join(data.credential.get("response", {}).get("transports", []))

    credential = WebAuthnCredential(
        user_id=user.id,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        device_name=data.device_name,
        transports=transports or None,
    )
    db.add(credential)
    await db.commit()
    await db.refresh(credential)

    return WebAuthnCredentialResponse(
        id=credential.id,
        device_name=credential.device_name,
        created_at=credential.created_at,
    )


@router.post("/webauthn/login/begin", response_model=WebAuthnLoginOptionsResponse)
async def webauthn_login_begin(
    data: WebAuthnLoginBeginRequest,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    email = validate_email(data.email)

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="No credentials found")

    cred_result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)
    )
    credentials = cred_result.scalars().all()
    if not credentials:
        raise HTTPException(status_code=400, detail="No credentials found")

    allow_credentials = []
    for c in credentials:
        transports_list = c.transports.split(",") if c.transports else []
        allow_credentials.append(
            PublicKeyCredentialDescriptor(
                id=c.credential_id,
                transports=transports_list if transports_list else None,
            )
        )

    options = generate_authentication_options(
        rp_id=settings.webauthn_rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    store_challenge(f"auth:{email}", options.challenge)

    options_dict = {
        "challenge": base64.urlsafe_b64encode(options.challenge).decode().rstrip("="),
        "timeout": options.timeout,
        "rpId": options.rp_id,
        "allowCredentials": [
            {
                "type": "public-key",
                "id": base64.urlsafe_b64encode(c.id).decode().rstrip("="),
                **({"transports": c.transports} if c.transports else {}),
            }
            for c in (options.allow_credentials or [])
        ],
        "userVerification": options.user_verification.value if options.user_verification else "preferred",
    }

    return WebAuthnLoginOptionsResponse(options=options_dict)


@router.post("/webauthn/login/complete", response_model=TokenResponse)
async def webauthn_login_complete(
    data: WebAuthnLoginCompleteRequest,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    email = validate_email(data.email)

    challenge = get_challenge(f"auth:{email}")
    if not challenge:
        raise HTTPException(status_code=400, detail="Challenge expired or not found")

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    raw_id = data.credential.get("rawId", "")
    if isinstance(raw_id, str):
        padded = raw_id + "=" * (4 - len(raw_id) % 4) if len(raw_id) % 4 else raw_id
        credential_id_bytes = base64.urlsafe_b64decode(padded)
    else:
        credential_id_bytes = bytes(raw_id)

    cred_result = await db.execute(
        select(WebAuthnCredential).where(
            WebAuthnCredential.user_id == user.id,
            WebAuthnCredential.credential_id == credential_id_bytes,
        )
    )
    stored_credential = cred_result.scalar_one_or_none()
    if not stored_credential:
        raise HTTPException(status_code=401, detail="Credential not found")

    try:
        verification = verify_authentication_response(
            credential=data.credential,
            expected_challenge=challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.frontend_base_url,
            credential_public_key=stored_credential.public_key,
            credential_current_sign_count=stored_credential.sign_count,
        )
    except Exception as e:
        logger.warning("WebAuthn authentication verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Verification failed")

    stored_credential.sign_count = verification.new_sign_count
    await db.commit()

    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/webauthn/check", response_model=WebAuthnCheckResponse)
async def webauthn_check(
    email: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        return WebAuthnCheckResponse(has_credentials=False)

    cred_result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)
    )
    has_creds = cred_result.scalar_one_or_none() is not None
    return WebAuthnCheckResponse(has_credentials=has_creds)


@router.get("/webauthn/credentials", response_model=list[WebAuthnCredentialResponse])
async def webauthn_list_credentials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.id)
    )
    credentials = result.scalars().all()
    return [
        WebAuthnCredentialResponse(
            id=c.id, device_name=c.device_name, created_at=c.created_at
        )
        for c in credentials
    ]


@router.delete("/webauthn/credentials/{credential_id}")
async def webauthn_delete_credential(
    credential_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WebAuthnCredential).where(
            WebAuthnCredential.id == credential_id,
            WebAuthnCredential.user_id == user.id,
        )
    )
    credential = result.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")

    await db.delete(credential)
    await db.commit()
    return {"ok": True}
