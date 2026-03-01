import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.acc_sync import AccProjectLink
from app.models.rfi import RFI
from app.models.user import User
from app.schemas.acc_sync import (
    AccProjectLinkCreate,
    AccProjectLinkResponse,
    AccProjectLinkStatus,
    PushAllResponse,
    RfiSyncStatusResponse,
)
from app.services.acc_rfi_service import push_rfi_to_acc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/acc-sync", tags=["acc_sync"])


@router.post("/link", response_model=AccProjectLinkResponse)
async def link_acc_project(
    project_id: uuid.UUID,
    body: AccProjectLinkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    existing = await db.execute(
        select(AccProjectLink).where(AccProjectLink.project_id == project_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Project already linked to ACC")

    link = AccProjectLink(
        project_id=project_id,
        acc_project_id=body.acc_project_id,
        acc_hub_id=body.acc_hub_id,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/link")
async def unlink_acc_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    result = await db.execute(
        select(AccProjectLink).where(AccProjectLink.project_id == project_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="No ACC link found")
    await db.delete(link)
    await db.commit()
    return {"detail": "ACC project unlinked"}


@router.get("/status", response_model=AccProjectLinkStatus)
async def get_link_status(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    result = await db.execute(
        select(AccProjectLink).where(AccProjectLink.project_id == project_id)
    )
    link = result.scalar_one_or_none()
    return AccProjectLinkStatus(linked=link is not None, link=link)


@router.post("/rfis/{rfi_id}/sync", response_model=RfiSyncStatusResponse)
async def sync_rfi_to_acc(
    project_id: uuid.UUID,
    rfi_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    result = await db.execute(
        select(RFI).where(RFI.id == rfi_id, RFI.project_id == project_id)
    )
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    rfi.sync_status = "syncing"
    await db.flush()
    await push_rfi_to_acc(db, rfi, project_id)
    await db.commit()
    await db.refresh(rfi)
    return RfiSyncStatusResponse(
        rfi_id=rfi.id,
        acc_rfi_id=rfi.acc_rfi_id,
        sync_status=rfi.sync_status,
        last_synced_at=rfi.last_synced_at,
        sync_error=rfi.sync_error,
    )


@router.post("/push-all", response_model=PushAllResponse)
async def push_all_rfis(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_project_access(db, project_id, user)
    rfis_result = await db.execute(
        select(RFI).where(
            RFI.project_id == project_id,
            RFI.status.in_(["open", "waiting_response", "answered"]),
        )
    )
    rfis = rfis_result.scalars().all()
    pushed = 0
    failed = 0
    errors: list[str] = []
    for rfi in rfis:
        success = await push_rfi_to_acc(db, rfi, project_id)
        if success:
            pushed += 1
        else:
            failed += 1
            errors.append(f"RFI {rfi.rfi_number}: {rfi.sync_error or 'Unknown error'}")
    await db.commit()
    return PushAllResponse(pushed=pushed, failed=failed, errors=errors)
