from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter()


@router.get("/projects/{project_id}/audit", response_model=list[AuditLogResponse])
async def list_audit_logs(
    project_id: UUID,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.project_id == project_id)
    )

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/audit", response_model=list[AuditLogResponse])
async def list_all_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    query = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.project_id.in_(accessible_projects))
    )

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
