from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse
from app.core.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from app.core.validation import validate_email, validate_password, sanitize_string
from app.core.csrf import csrf_manager
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, request: Request, db: AsyncSession = Depends(get_db)):
    # Validate and sanitize input
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
            detail=error_message
        )

    user = User(
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

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
