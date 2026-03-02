from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.inbox import (
    InboxDefectItem,
    InboxMeetingItem,
    InboxResponse,
    InboxRFIItem,
    InboxTaskItem,
)
from app.services.inbox_service import (
    fetch_inbox_defects,
    fetch_inbox_meetings,
    fetch_inbox_rfis,
    fetch_inbox_tasks,
    get_inbox,
)

router = APIRouter()


@router.get("/my-inbox", response_model=InboxResponse)
async def get_my_inbox(
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_inbox(db, current_user.id, project_id, limit)


@router.get("/my-tasks", response_model=list[InboxTaskItem])
async def get_my_tasks(
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await fetch_inbox_tasks(db, current_user.id, project_id, limit)


@router.get("/my-rfis", response_model=list[InboxRFIItem])
async def get_my_rfis(
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await fetch_inbox_rfis(db, current_user.id, project_id, limit)


@router.get("/my-meetings", response_model=list[InboxMeetingItem])
async def get_my_meetings(
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await fetch_inbox_meetings(db, current_user.id, project_id, limit)


@router.get("/my-defects", response_model=list[InboxDefectItem])
async def get_my_defects(
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await fetch_inbox_defects(db, current_user.id, project_id, limit)
