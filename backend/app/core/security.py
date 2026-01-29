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

    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            firebase_uid="demo-uid",
            email="demo@builder.com",
            full_name="Demo User"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    if credentials is None:
        return None
    return await get_current_user(credentials, db)


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to verify user is an admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
