from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    token = credentials.credentials

    try:
        # For development: accept any token and return first user
        # In production: verify Firebase token
        # decoded_token = auth.verify_id_token(token)
        # firebase_uid = decoded_token['uid']

        # Development mode: get first user or create demo user
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()

        if not user:
            # Create a demo user for development
            user = User(
                firebase_uid="demo-uid",
                email="demo@builder.com",
                full_name="Demo User"
            )
            db.add(user)
            await db.flush()

        return user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    if credentials is None:
        return None
    return await get_current_user(credentials, db)
