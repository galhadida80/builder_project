import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.area import ConstructionArea
from app.models.contact import Contact
from app.models.project import Project, ProjectMember
from app.models.safety_incident import SafetyIncident
from app.models.user import User
from app.schemas.safety_incident import (
    SafetyIncidentCreate,
    SafetyIncidentResponse,
    SafetyIncidentUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import notify_project_admins
from app.utils import utcnow

logger = logging.getLogger(__name__)

router = APIRouter()

INCIDENT_LOAD_OPTIONS = [
    selectinload(SafetyIncident.area),
    selectinload(SafetyIncident.reported_by),
    selectinload(SafetyIncident.created_by),
]


async def get_next_incident_number(db: AsyncSession, project_id: UUID) -> int:
    """Get the next incident number for a project with concurrency safety"""
    # Step 1: Get the current max incident number (no locking needed for aggregate)
    result = await db.execute(
        select(func.coalesce(func.max(SafetyIncident.incident_number), 0))
        .where(SafetyIncident.project_id == project_id)
    )
    current_max = result.scalar() or 0

    # Step 2: Lock the project row to ensure concurrency safety
    project_result = await db.execute(
        select(Project).where(Project.id == project_id).with_for_update()
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return current_max + 1


@router.get("/projects/{project_id}/safety-incidents", response_model=list[SafetyIncidentResponse])
async def list_safety_incidents(
    project_id: UUID,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all safety incidents for a project with optional filters"""
    await verify_project_access(project_id, current_user, db)

    # Build base query for filtering
    base_query = select(SafetyIncident).where(SafetyIncident.project_id == project_id)
    if status:
        base_query = base_query.where(SafetyIncident.status == status)
    if severity:
        base_query = base_query.where(SafetyIncident.severity == severity)
    if search:
        search_filter = f"%{search}%"
        base_query = base_query.where(
            or_(
                SafetyIncident.title.ilike(search_filter),
                SafetyIncident.description.ilike(search_filter),
                func.cast(SafetyIncident.incident_number, String).ilike(search_filter),
            )
        )

    # Get results
    query = (
        base_query
        .options(*INCIDENT_LOAD_OPTIONS)
        .order_by(SafetyIncident.incident_number.desc())
    )
    result = await db.execute(query)
    incidents = result.scalars().all()

    return list(incidents)


@router.post("/projects/{project_id}/safety-incidents", response_model=SafetyIncidentResponse, status_code=201)
async def create_safety_incident(
    project_id: UUID,
    data: SafetyIncidentCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new safety incident for a project"""
    incident_number = await get_next_incident_number(db, project_id)

    incident = SafetyIncident(
        **data.model_dump(),
        project_id=project_id,
        incident_number=incident_number,
        created_by_id=current_user.id
    )
    db.add(incident)
    await db.flush()

    await create_audit_log(
        db, current_user, "safety_incident", incident.id, AuditAction.CREATE,
        project_id=project_id, new_values=get_model_dict(incident)
    )

    try:
        project = await db.get(Project, project_id)
        project_name = project.name if project else ""
        severity_label = incident.severity.upper()
        await notify_project_admins(
            db, project_id, "SAFETY_INCIDENT",
            f"New {severity_label} safety incident",
            f"Safety incident #{incident_number}: {incident.title}",
            entity_type="safety_incident", entity_id=incident.id,
            project_name=project_name,
        )
    except Exception:
        logger.exception("Failed to send safety incident notification")

    result = await db.execute(
        select(SafetyIncident)
        .options(*INCIDENT_LOAD_OPTIONS)
        .where(SafetyIncident.id == incident.id)
    )
    return result.scalar_one()


@router.get("/projects/{project_id}/safety-incidents/{incident_id}", response_model=SafetyIncidentResponse)
async def get_safety_incident(
    project_id: UUID,
    incident_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific safety incident by ID"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(SafetyIncident)
        .options(*INCIDENT_LOAD_OPTIONS)
        .where(SafetyIncident.id == incident_id, SafetyIncident.project_id == project_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Safety incident not found")

    return incident


@router.patch("/projects/{project_id}/safety-incidents/{incident_id}", response_model=SafetyIncidentResponse)
async def update_safety_incident(
    project_id: UUID,
    incident_id: UUID,
    data: SafetyIncidentUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing safety incident"""
    result = await db.execute(
        select(SafetyIncident)
        .where(SafetyIncident.id == incident_id, SafetyIncident.project_id == project_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Safety incident not found")

    old_values = get_model_dict(incident)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)

    incident.updated_at = utcnow()
    await db.flush()

    await create_audit_log(
        db, current_user, "safety_incident", incident.id, AuditAction.UPDATE,
        project_id=project_id, old_values=old_values, new_values=get_model_dict(incident)
    )

    result = await db.execute(
        select(SafetyIncident)
        .options(*INCIDENT_LOAD_OPTIONS)
        .where(SafetyIncident.id == incident_id)
    )
    return result.scalar_one()


@router.delete("/projects/{project_id}/safety-incidents/{incident_id}", status_code=204)
async def delete_safety_incident(
    project_id: UUID,
    incident_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a safety incident"""
    result = await db.execute(
        select(SafetyIncident)
        .where(SafetyIncident.id == incident_id, SafetyIncident.project_id == project_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Safety incident not found")

    await create_audit_log(
        db, current_user, "safety_incident", incident.id, AuditAction.DELETE,
        project_id=project_id, old_values=get_model_dict(incident)
    )

    await db.delete(incident)
    await db.flush()


@router.get("/projects/{project_id}/safety-incidents-summary")
async def get_safety_incidents_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get summary statistics for safety incidents in a project"""
    await verify_project_access(project_id, current_user, db)

    status_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((SafetyIncident.status == "open", 1), else_=0)).label("open_count"),
            func.sum(case((SafetyIncident.status == "investigating", 1), else_=0)).label("investigating_count"),
            func.sum(case((SafetyIncident.status == "resolved", 1), else_=0)).label("resolved_count"),
            func.sum(case((SafetyIncident.status == "closed", 1), else_=0)).label("closed_count"),
            func.sum(case((SafetyIncident.severity == "critical", 1), else_=0)).label("critical_count"),
            func.sum(case((SafetyIncident.severity == "high", 1), else_=0)).label("high_count"),
            func.sum(case((SafetyIncident.severity == "medium", 1), else_=0)).label("medium_count"),
            func.sum(case((SafetyIncident.severity == "low", 1), else_=0)).label("low_count"),
        )
        .where(SafetyIncident.project_id == project_id)
    )
    row = status_result.first()

    return {
        "total": row.total or 0,
        "openCount": row.open_count or 0,
        "investigatingCount": row.investigating_count or 0,
        "resolvedCount": row.resolved_count or 0,
        "closedCount": row.closed_count or 0,
        "criticalCount": row.critical_count or 0,
        "highCount": row.high_count or 0,
        "mediumCount": row.medium_count or 0,
        "lowCount": row.low_count or 0,
    }
