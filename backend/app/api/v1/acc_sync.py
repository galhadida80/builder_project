import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.acc_sync_schemas import (
    AccConflictsResponse,
    AccConflictDetail,
    AccSyncResponse,
    AccSyncStatusResponse,
    ConflictResolveRequest,
    ConflictResolveResponse,
)
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.bim import AutodeskConnection
from app.models.project import ProjectMember
from app.models.rfi import RFI
from app.models.user import User
from app.services.acc_rfi_sync_service import ACCRFISyncService
from app.services.acc_sync_tasks import run_acc_sync_task

logger = logging.getLogger(__name__)

router = APIRouter(tags=["acc-sync"])


@router.post(
    "/projects/{project_id}/acc/sync",
    response_model=AccSyncResponse,
    status_code=202
)
async def trigger_acc_sync(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger manual sync of RFIs from ACC to BuilderOps.
    Returns 202 Accepted - sync runs in background.
    """
    result = await db.execute(
        select(RFI.acc_container_id, RFI.created_by_id)
        .where(
            RFI.project_id == project_id,
            RFI.acc_container_id.isnot(None),
            RFI.created_by_id.isnot(None)
        )
        .limit(1)
    )
    row = result.first()

    if not row:
        result = await db.execute(
            select(AutodeskConnection)
            .join(ProjectMember, ProjectMember.user_id == AutodeskConnection.user_id)
            .where(ProjectMember.project_id == project_id)
            .limit(1)
        )
        connection = result.scalar_one_or_none()

        if not connection:
            raise HTTPException(
                status_code=400,
                detail="No ACC connection found for this project. Please connect to ACC first."
            )

        raise HTTPException(
            status_code=400,
            detail="No ACC container_id found. Please sync at least one RFI from ACC manually first."
        )

    container_id = row[0]
    user_id = row[1] or current_user.id

    background_tasks.add_task(
        run_acc_sync_task,
        project_id=project_id,
        user_id=user_id,
        container_id=container_id
    )

    logger.info(f"Triggered ACC sync for project {project_id}")

    return AccSyncResponse(
        message="ACC sync started in background",
        project_id=project_id,
        status="processing"
    )


@router.get(
    "/projects/{project_id}/acc/sync/status",
    response_model=AccSyncStatusResponse
)
async def get_acc_sync_status(
    project_id: uuid.UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ACC sync health status for a project"""
    result = await db.execute(
        select(func.count(RFI.id).label("total"))
        .where(RFI.project_id == project_id)
    )
    total_rfis = result.scalar() or 0

    result = await db.execute(
        select(func.count(RFI.id).label("synced"))
        .where(
            RFI.project_id == project_id,
            RFI.acc_issue_id.isnot(None)
        )
    )
    synced_rfis = result.scalar() or 0

    result = await db.execute(
        select(func.count(RFI.id).label("conflicts"))
        .where(
            RFI.project_id == project_id,
            RFI.sync_status == "conflict"
        )
    )
    conflict_count = result.scalar() or 0

    result = await db.execute(
        select(func.max(RFI.last_synced_at))
        .where(
            RFI.project_id == project_id,
            RFI.last_synced_at.isnot(None)
        )
    )
    last_sync_at = result.scalar()

    result = await db.execute(
        select(AutodeskConnection)
        .join(ProjectMember, ProjectMember.user_id == AutodeskConnection.user_id)
        .where(ProjectMember.project_id == project_id)
        .limit(1)
    )
    has_acc_connection = result.scalar_one_or_none() is not None

    if conflict_count > 0:
        sync_health = "error"
        details = f"{conflict_count} RFIs have sync conflicts"
    elif not has_acc_connection:
        sync_health = "warning"
        details = "No ACC connection found"
    elif synced_rfis == 0:
        sync_health = "warning"
        details = "No RFIs synced from ACC yet"
    else:
        sync_health = "ok"
        details = None

    return AccSyncStatusResponse(
        project_id=project_id,
        last_sync_at=last_sync_at.isoformat() if last_sync_at else None,
        sync_health=sync_health,
        total_rfis=total_rfis,
        synced_rfis=synced_rfis,
        conflict_count=conflict_count,
        has_acc_connection=has_acc_connection,
        details=details
    )


@router.get(
    "/projects/{project_id}/acc/conflicts",
    response_model=AccConflictsResponse
)
async def get_acc_conflicts(
    project_id: uuid.UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all RFIs with sync conflicts"""
    result = await db.execute(
        select(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.sync_status == "conflict"
        )
        .order_by(RFI.updated_at.desc())
    )
    conflict_rfis = result.scalars().all()

    conflicts = []
    for rfi in conflict_rfis:
        if not rfi.acc_metadata or not isinstance(rfi.acc_metadata, dict):
            continue

        latest_conflict = rfi.acc_metadata.get("latest_conflict")
        if not latest_conflict:
            continue

        conflicts.append(AccConflictDetail(
            rfi_id=rfi.id,
            rfi_number=rfi.rfi_number,
            subject=rfi.subject,
            local_updated_at=latest_conflict.get("local_updated_at", ""),
            acc_updated_at=latest_conflict.get("acc_updated_at", ""),
            last_synced_at=latest_conflict.get("last_synced_at", ""),
            conflicting_fields=latest_conflict.get("conflicting_fields", [])
        ))

    return AccConflictsResponse(
        project_id=project_id,
        total_conflicts=len(conflicts),
        conflicts=conflicts
    )


@router.post(
    "/projects/{project_id}/acc/conflicts/{rfi_id}/resolve",
    response_model=ConflictResolveResponse
)
async def resolve_acc_conflict(
    project_id: uuid.UUID,
    rfi_id: uuid.UUID,
    request: ConflictResolveRequest,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resolve a sync conflict for an RFI"""
    result = await db.execute(
        select(RFI)
        .where(
            RFI.id == rfi_id,
            RFI.project_id == project_id
        )
    )
    rfi = result.scalar_one_or_none()

    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    if rfi.sync_status != "conflict":
        raise HTTPException(
            status_code=400,
            detail=f"RFI is not in conflict state (current status: {rfi.sync_status})"
        )

    service = ACCRFISyncService(db)

    try:
        resolution = await service.resolve_conflict(
            rfi=rfi,
            strategy=request.strategy
        )
        await db.commit()

        logger.info(
            f"Resolved conflict for RFI {rfi.rfi_number} using strategy {request.strategy}"
        )

        return ConflictResolveResponse(
            rfi_id=rfi.id,
            chosen_version=resolution["chosen_version"],
            reason=resolution["reason"],
            conflicting_fields=resolution["conflicting_fields"],
            strategy=resolution["strategy"],
            resolved_at=resolution["resolved_at"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to resolve conflict for RFI {rfi_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve conflict")
