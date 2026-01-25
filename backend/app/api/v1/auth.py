from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate

router = APIRouter()


class TokenVerify(BaseModel):
    token: str


@router.post("/verify", response_model=UserResponse)
async def verify_token(data: TokenVerify, db: AsyncSession = Depends(get_db)):
    # For development: create/return demo user
    # In production: verify Firebase token and get/create user

    result = await db.execute(select(User).where(User.firebase_uid == "demo-uid"))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            firebase_uid="demo-uid",
            email="demo@builder.com",
            full_name="Demo User",
            company="Builder Demo"
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
