from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_admin_user
from app.db.session import get_db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectResponse
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: dict,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed_fields = {"is_active", "is_super_admin"}
    for key, value in data.items():
        if key in allowed_fields and isinstance(value, bool):
            setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/projects", response_model=list[ProjectResponse])
async def list_all_projects(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()
