import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.config import get_settings
from app.db.session import get_db
from app.models.acc_sync import AccProjectLink, AccUserMapping, RfiSyncLog
from app.models.rfi import RFI
from app.models.user import User
from app.schemas.acc_sync import (
    AccUserMappingCreate,
    AccUserMappingResponse,
    PullResponse,
    SyncHealthResponse,
    SyncLogResponse,
)
from app.services.acc_rfi_service import pull_rfis_from_acc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/acc-sync", tags=["acc_sync_inbound"])


@router.post("/pull", response_model=PullResponse)
async def pull_rfis(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    result = await pull_rfis_from_acc(db, project_id)
    await db.commit()
    return PullResponse(**result)


@router.post("/webhook")
async def acc_webhook(
    project_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    token = request.headers.get("x-adsk-signature", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing webhook signature")

    body = await request.json()
    event_type = body.get("hook", {}).get("event", "")
    if event_type in ("dm.rfi.created", "dm.rfi.updated"):
        result = await pull_rfis_from_acc(db, project_id)
        await db.commit()
        logger.info("Webhook pull for project %s: %s", project_id, result)
    return {"received": True}


@router.get("/user-mappings", response_model=list[AccUserMappingResponse])
async def list_user_mappings(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    result = await db.execute(
        select(AccUserMapping).where(AccUserMapping.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/user-mappings", response_model=AccUserMappingResponse)
async def create_user_mapping(
    project_id: uuid.UUID,
    body: AccUserMappingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    mapping = AccUserMapping(
        project_id=project_id,
        acc_user_id=body.acc_user_id,
        builderops_user_id=body.builderops_user_id,
    )
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return mapping


@router.get("/health", response_model=SyncHealthResponse)
async def sync_health(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    link_result = await db.execute(
        select(AccProjectLink).where(AccProjectLink.project_id == project_id)
    )
    link = link_result.scalar_one_or_none()
    if not link:
        return SyncHealthResponse(
            linked=False, enabled=False,
            total_rfis=0, synced_count=0, failed_count=0, pending_count=0,
        )

    total = await db.scalar(
        select(func.count(RFI.id)).where(RFI.project_id == project_id)
    )
    synced = await db.scalar(
        select(func.count(RFI.id)).where(
            RFI.project_id == project_id, RFI.sync_status == "synced"
        )
    )
    failed = await db.scalar(
        select(func.count(RFI.id)).where(
            RFI.project_id == project_id, RFI.sync_status == "failed"
        )
    )
    last_log = await db.execute(
        select(RfiSyncLog.created_at)
        .join(RFI, RfiSyncLog.rfi_id == RFI.id)
        .where(RFI.project_id == project_id)
        .order_by(RfiSyncLog.created_at.desc())
        .limit(1)
    )
    last_sync = last_log.scalar_one_or_none()

    return SyncHealthResponse(
        linked=True,
        enabled=link.enabled,
        total_rfis=total or 0,
        synced_count=synced or 0,
        failed_count=failed or 0,
        pending_count=(total or 0) - (synced or 0) - (failed or 0),
        last_sync=last_sync,
    )


@router.get("/logs", response_model=list[SyncLogResponse])
async def list_sync_logs(
    project_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    result = await db.execute(
        select(RfiSyncLog)
        .join(RFI, RfiSyncLog.rfi_id == RFI.id)
        .where(RFI.project_id == project_id)
        .order_by(RfiSyncLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
