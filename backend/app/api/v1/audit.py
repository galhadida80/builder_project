from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
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
    limit: int = Query(100, ge=1, le=1000),
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
        query = query.where(AuditLog.created_at >= start_date.replace(tzinfo=None))
    if end_date:
        query = query.where(AuditLog.created_at <= end_date.replace(tzinfo=None))

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/projects/{project_id}/audit/export")
async def export_audit_logs(
    project_id: UUID,
    export_format: str = Query("csv", alias="format", pattern="^(csv|json)$"),
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
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
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date.replace(tzinfo=None))
    if end_date:
        query = query.where(AuditLog.created_at <= end_date.replace(tzinfo=None))

    query = query.order_by(AuditLog.created_at.desc())
    result = await db.execute(query)
    logs = result.scalars().all()

    if export_format == "json":
        rows = [
            {
                "id": str(log.id),
                "project_id": str(log.project_id) if log.project_id else None,
                "user_id": str(log.user_id) if log.user_id else None,
                "user_email": log.user.email if log.user else None,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id),
                "action": log.action,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
        json_content = json.dumps(rows, indent=2, default=str)
        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=audit_log_{project_id}.json"}
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "project_id", "user_id", "user_email", "entity_type",
        "entity_id", "action", "old_values", "new_values", "ip_address", "created_at"
    ])
    for log in logs:
        writer.writerow([
            str(log.id),
            str(log.project_id) if log.project_id else "",
            str(log.user_id) if log.user_id else "",
            log.user.email if log.user else "",
            log.entity_type,
            str(log.entity_id),
            log.action,
            json.dumps(log.old_values) if log.old_values else "",
            json.dumps(log.new_values) if log.new_values else "",
            log.ip_address or "",
            log.created_at.isoformat() if log.created_at else "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit_log_{project_id}.csv"}
    )


@router.get("/audit", response_model=list[AuditLogResponse])
async def list_all_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=1000),
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
        query = query.where(AuditLog.created_at >= start_date.replace(tzinfo=None))
    if end_date:
        query = query.where(AuditLog.created_at <= end_date.replace(tzinfo=None))

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
