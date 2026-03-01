from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.permission_audit import PermissionAudit
from app.models.project import ProjectMember
from app.models.user import User

router = APIRouter()


@router.get("/projects/{project_id}/permissions/audit")
async def get_permission_audit_log(
    project_id: UUID,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    target_user_id: Optional[UUID] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = 0,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get permission audit log for a project with filtering options"""
    await verify_project_access(project_id, current_user, db)

    query = (
        select(PermissionAudit)
        .options(selectinload(PermissionAudit.user))
        .options(selectinload(PermissionAudit.target_user))
        .where(PermissionAudit.project_id == project_id)
    )

    if action:
        query = query.where(PermissionAudit.action == action)
    if user_id:
        query = query.where(PermissionAudit.user_id == user_id)
    if target_user_id:
        query = query.where(PermissionAudit.target_user_id == target_user_id)
    if entity_type:
        query = query.where(PermissionAudit.entity_type == entity_type)
    if entity_id:
        query = query.where(PermissionAudit.entity_id == entity_id)
    if start_date:
        query = query.where(PermissionAudit.created_at >= start_date.replace(tzinfo=None))
    if end_date:
        query = query.where(PermissionAudit.created_at <= end_date.replace(tzinfo=None))

    query = query.order_by(PermissionAudit.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    audit_logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "action": log.action,
            "user": {
                "id": str(log.user.id) if log.user else None,
                "name": log.user.full_name if log.user else None,
                "email": log.user.email if log.user else None
            },
            "targetUser": {
                "id": str(log.target_user.id),
                "name": log.target_user.full_name,
                "email": log.target_user.email
            } if log.target_user else None,
            "entityType": log.entity_type,
            "entityId": str(log.entity_id) if log.entity_id else None,
            "oldValues": log.old_values,
            "newValues": log.new_values,
            "ipAddress": log.ip_address,
            "userAgent": log.user_agent,
            "createdAt": log.created_at.isoformat()
        }
        for log in audit_logs
    ]


@router.get("/projects/{project_id}/permissions/audit/export")
async def export_permission_audit_logs(
    project_id: UUID,
    export_format: str = Query("csv", alias="format", pattern="^(csv|json)$"),
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    target_user_id: Optional[UUID] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Export permission audit logs in CSV or JSON format"""
    await verify_project_access(project_id, current_user, db)

    query = (
        select(PermissionAudit)
        .options(selectinload(PermissionAudit.user))
        .options(selectinload(PermissionAudit.target_user))
        .where(PermissionAudit.project_id == project_id)
    )

    if action:
        query = query.where(PermissionAudit.action == action)
    if user_id:
        query = query.where(PermissionAudit.user_id == user_id)
    if target_user_id:
        query = query.where(PermissionAudit.target_user_id == target_user_id)
    if entity_type:
        query = query.where(PermissionAudit.entity_type == entity_type)
    if start_date:
        query = query.where(PermissionAudit.created_at >= start_date.replace(tzinfo=None))
    if end_date:
        query = query.where(PermissionAudit.created_at <= end_date.replace(tzinfo=None))

    query = query.order_by(PermissionAudit.created_at.desc())
    result = await db.execute(query)
    logs = result.scalars().all()

    if export_format == "json":
        rows = [
            {
                "id": str(log.id),
                "project_id": str(log.project_id) if log.project_id else None,
                "user_id": str(log.user_id) if log.user_id else None,
                "user_email": log.user.email if log.user else None,
                "target_user_id": str(log.target_user_id) if log.target_user_id else None,
                "target_user_email": log.target_user.email if log.target_user else None,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
        json_content = json.dumps(rows, indent=2, default=str)
        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=permission_audit_{project_id}.json"}
        )

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow([
        "id", "project_id", "user_id", "user_email", "target_user_id", "target_user_email",
        "action", "entity_type", "entity_id", "old_values", "new_values",
        "ip_address", "user_agent", "created_at"
    ])
    for log in logs:
        writer.writerow([
            str(log.id),
            str(log.project_id) if log.project_id else "",
            str(log.user_id) if log.user_id else "",
            log.user.email if log.user else "",
            str(log.target_user_id) if log.target_user_id else "",
            log.target_user.email if log.target_user else "",
            log.action,
            log.entity_type,
            str(log.entity_id) if log.entity_id else "",
            json.dumps(log.old_values) if log.old_values else "",
            json.dumps(log.new_values) if log.new_values else "",
            log.ip_address or "",
            log.user_agent or "",
            log.created_at.isoformat() if log.created_at else "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=permission_audit_{project_id}.csv"}
    )
