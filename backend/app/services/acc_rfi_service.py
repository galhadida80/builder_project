import logging
import uuid
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.acc_sync import AccProjectLink, RfiSyncLog
from app.models.rfi import RFI
from app.services.aps_service import APSService
from app.services.rfi_service import RFIService
from app.utils import utcnow

logger = logging.getLogger(__name__)

ACC_RFI_BASE = "https://developer.api.autodesk.com/construction/rfis/v2"

PRIORITY_MAP = {"low": "low", "medium": "normal", "high": "high", "urgent": "critical"}
PRIORITY_MAP_REVERSE = {"low": "low", "normal": "medium", "high": "high", "critical": "urgent"}

STATUS_MAP = {
    "draft": "draft",
    "open": "open",
    "waiting_response": "open",
    "answered": "answered",
    "closed": "closed",
    "cancelled": "void",
}
STATUS_MAP_REVERSE = {
    "draft": "draft",
    "open": "open",
    "answered": "answered",
    "closed": "closed",
    "void": "cancelled",
}


def map_rfi_to_acc_format(rfi: RFI) -> dict[str, Any]:
    return {
        "title": rfi.subject,
        "question": rfi.question,
        "status": STATUS_MAP.get(rfi.status, "open"),
        "priority": PRIORITY_MAP.get(rfi.priority, "normal"),
        "location": rfi.location,
        "dueDate": rfi.due_date.isoformat() if rfi.due_date else None,
        "customIdentifier": rfi.rfi_number,
    }


def map_acc_rfi_to_builderops(acc_rfi: dict[str, Any]) -> dict[str, Any]:
    return {
        "subject": acc_rfi.get("title", "Untitled RFI"),
        "question": acc_rfi.get("question", ""),
        "status": STATUS_MAP_REVERSE.get(acc_rfi.get("status", "open"), "open"),
        "priority": PRIORITY_MAP_REVERSE.get(acc_rfi.get("priority", "normal"), "medium"),
        "location": acc_rfi.get("location"),
        "due_date": acc_rfi.get("dueDate"),
        "category": "other",
    }


async def get_acc_token(db: AsyncSession) -> str:
    settings = get_settings()
    aps = APSService(settings)
    return await aps.get_2legged_token()


async def push_rfi_to_acc(db: AsyncSession, rfi: RFI, project_id: uuid.UUID) -> bool:
    link_result = await db.execute(
        select(AccProjectLink).where(
            AccProjectLink.project_id == project_id,
            AccProjectLink.enabled.is_(True),
        )
    )
    link = link_result.scalar_one_or_none()
    if not link:
        logger.warning("No ACC project link for project %s", project_id)
        return False

    try:
        token = await get_acc_token(db)
        payload = map_rfi_to_acc_format(rfi)
        async with httpx.AsyncClient(timeout=30.0) as client:
            if rfi.acc_rfi_id:
                resp = await client.patch(
                    f"{ACC_RFI_BASE}/projects/{link.acc_project_id}/rfis/{rfi.acc_rfi_id}",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                )
            else:
                resp = await client.post(
                    f"{ACC_RFI_BASE}/projects/{link.acc_project_id}/rfis",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                )
            resp.raise_for_status()
            data = resp.json()

        if not rfi.acc_rfi_id:
            rfi.acc_rfi_id = data.get("id")
        rfi.sync_status = "synced"
        rfi.last_synced_at = utcnow()
        rfi.sync_error = None

        log = RfiSyncLog(rfi_id=rfi.id, direction="outbound", status="success", details={"acc_rfi_id": rfi.acc_rfi_id})
        db.add(log)
        await db.flush()
        return True

    except Exception as exc:
        logger.error("Failed to push RFI %s to ACC: %s", rfi.id, exc)
        rfi.sync_status = "failed"
        rfi.sync_error = str(exc)[:500]
        log = RfiSyncLog(rfi_id=rfi.id, direction="outbound", status="failed", details={"error": str(exc)[:500]})
        db.add(log)
        await db.flush()
        return False


async def pull_rfis_from_acc(
    db: AsyncSession, project_id: uuid.UUID
) -> dict[str, Any]:
    link_result = await db.execute(
        select(AccProjectLink).where(
            AccProjectLink.project_id == project_id,
            AccProjectLink.enabled.is_(True),
        )
    )
    link = link_result.scalar_one_or_none()
    if not link:
        return {"created": 0, "updated": 0, "errors": ["No ACC project link found"]}

    created = 0
    updated = 0
    errors: list[str] = []

    try:
        token = await get_acc_token(db)
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(
                f"{ACC_RFI_BASE}/projects/{link.acc_project_id}/rfis",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            acc_rfis = resp.json().get("results", [])

    except Exception as exc:
        logger.error("Failed to pull RFIs from ACC for project %s: %s", project_id, exc)
        return {"created": 0, "updated": 0, "errors": [str(exc)[:500]]}

    rfi_service = RFIService(db)
    for acc_rfi in acc_rfis:
        acc_id = acc_rfi.get("id")
        if not acc_id:
            continue
        try:
            existing_result = await db.execute(
                select(RFI).where(RFI.acc_rfi_id == acc_id)
            )
            existing = existing_result.scalar_one_or_none()
            mapped = map_acc_rfi_to_builderops(acc_rfi)

            if existing:
                for key, val in mapped.items():
                    if val is not None:
                        setattr(existing, key, val)
                existing.last_synced_at = utcnow()
                existing.sync_status = "synced"
                updated += 1
            else:
                rfi_number = await rfi_service.generate_rfi_number()
                to_email = resolve_acc_user_email(acc_rfi)
                new_rfi = RFI(
                    project_id=project_id,
                    rfi_number=rfi_number,
                    subject=mapped["subject"],
                    question=mapped["question"] or "Imported from ACC",
                    category=mapped["category"],
                    priority=mapped["priority"],
                    status=mapped["status"],
                    to_email=to_email,
                    location=mapped.get("location"),
                    due_date=mapped.get("due_date"),
                    acc_rfi_id=acc_id,
                    sync_status="synced",
                    last_synced_at=utcnow(),
                    acc_origin=True,
                    created_by_id=await get_first_admin_id(db, project_id),
                )
                db.add(new_rfi)
                created += 1

            log = RfiSyncLog(
                rfi_id=existing.id if existing else new_rfi.id,
                direction="inbound",
                status="success",
                details={"acc_rfi_id": acc_id},
            )
            db.add(log)

        except Exception as exc:
            errors.append(f"RFI {acc_id}: {str(exc)[:200]}")
            logger.error("Failed to process ACC RFI %s: %s", acc_id, exc)

    await db.flush()
    return {"created": created, "updated": updated, "errors": errors}


def resolve_acc_user_email(acc_rfi: dict[str, Any]) -> str:
    assignees = acc_rfi.get("assignedTo", [])
    if assignees and isinstance(assignees, list):
        first = assignees[0]
        if isinstance(first, dict) and first.get("email"):
            return first["email"]
    return "acc-import@builderops.dev"


async def get_first_admin_id(db: AsyncSession, project_id: uuid.UUID) -> uuid.UUID:
    from app.models.project import ProjectMember
    result = await db.execute(
        select(ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id, ProjectMember.role == "project_admin")
        .limit(1)
    )
    admin_id = result.scalar_one_or_none()
    if admin_id:
        return admin_id
    result2 = await db.execute(
        select(ProjectMember.user_id).where(ProjectMember.project_id == project_id).limit(1)
    )
    return result2.scalar_one()
