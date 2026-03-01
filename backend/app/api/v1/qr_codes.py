from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.project import Project, ProjectMember
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.schemas.qr_code import (
    BulkQRCodePDFRequest,
    BulkQRCodeRequest,
    PaginatedScanHistoryResponse,
    QRCodeGenerateRequest,
    QRCodeResponse,
    ScanHistoryCreate,
    ScanHistoryResponse,
)
from app.services.qr_code_service import QRCodeService
from app.utils import utcnow
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/qr-codes/generate", response_model=QRCodeResponse)
async def generate_qr_code(
    entity_type: str = Query(...),
    entity_id: UUID = Query(...),
    format: str = Query("png", pattern="^(png|svg)$"),
    size: int = Query(300, ge=100, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a QR code for an entity (equipment, material, or area)."""
    qr_service = QRCodeService(db)
    qr_code_data = qr_service.generate_qr_code(entity_type, entity_id, format, size)

    return QRCodeResponse(
        entity_type=entity_type,
        entity_id=entity_id,
        qr_code_data=qr_code_data,
        format=format,
        size=size,
    )


@router.post("/qr-codes/generate", response_model=QRCodeResponse)
async def generate_qr_code_post(
    data: QRCodeGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a QR code for an entity (POST version)."""
    qr_service = QRCodeService(db)
    qr_code_data = qr_service.generate_qr_code(
        data.entity_type, data.entity_id, data.format, data.size
    )

    return QRCodeResponse(
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        qr_code_data=qr_code_data,
        format=data.format,
        size=data.size,
    )


@router.post("/qr-codes/bulk", response_model=list[QRCodeResponse])
async def generate_bulk_qr_codes(
    data: BulkQRCodeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate QR codes for multiple entities."""
    qr_service = QRCodeService(db)
    results = await qr_service.generate_bulk_qr_codes(data.items, data.format, data.size)

    return [
        QRCodeResponse(
            entity_type=result["entity_type"],
            entity_id=UUID(result["entity_id"]),
            qr_code_data=result["qr_code_data"],
            format=result["format"],
            size=result["size"],
        )
        for result in results
    ]


@router.post("/qr-codes/bulk-pdf")
async def generate_bulk_qr_pdf(
    data: BulkQRCodePDFRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a printable PDF sheet with QR code labels."""
    await verify_project_access(data.project_id, current_user, db)

    result = await db.execute(
        select(Project).where(Project.id == data.project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    qr_service = QRCodeService(db)
    pdf_bytes = await qr_service.generate_bulk_qr_pdf(
        data.items, project, data.language
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="qr-code-labels.pdf"'},
    )


@router.post("/projects/{project_id}/qr-codes/scan", response_model=ScanHistoryResponse)
async def log_scan(
    project_id: UUID,
    data: ScanHistoryCreate,
    member: ProjectMember = require_permission(Permission.VIEW),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Log a QR code scan event."""
    entity_type = data.entity_type.lower()
    entity_found = False

    if entity_type == "equipment":
        result = await db.execute(
            select(Equipment).where(
                Equipment.id == data.entity_id, Equipment.project_id == project_id
            )
        )
        entity_found = result.scalar_one_or_none() is not None
    elif entity_type == "material":
        result = await db.execute(
            select(Material).where(
                Material.id == data.entity_id, Material.project_id == project_id
            )
        )
        entity_found = result.scalar_one_or_none() is not None

    if not entity_found:
        language = get_language_from_request(request)
        error_message = translate_message("resources.entity_not_found", language)
        raise HTTPException(status_code=404, detail=error_message)

    scan = ScanHistory(
        project_id=project_id,
        user_id=current_user.id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        scanned_at=utcnow(),
    )
    db.add(scan)
    await db.flush()

    await db.refresh(scan, ["user"])
    return scan


@router.get(
    "/projects/{project_id}/qr-codes/scan-history",
    response_model=PaginatedScanHistoryResponse,
)
async def list_scan_history(
    project_id: UUID,
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get scan history for a project with optional filtering."""
    await verify_project_access(project_id, current_user, db)

    base_filter = ScanHistory.project_id == project_id
    if entity_type:
        base_filter = base_filter & (ScanHistory.entity_type == entity_type)
    if entity_id:
        base_filter = base_filter & (ScanHistory.entity_id == entity_id)

    count_result = await db.execute(select(func.count(ScanHistory.id)).where(base_filter))
    total = count_result.scalar()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(ScanHistory)
        .options(selectinload(ScanHistory.user))
        .where(base_filter)
        .order_by(ScanHistory.scanned_at.desc())
        .limit(page_size)
        .offset(offset)
    )
    scans = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedScanHistoryResponse(
        items=scans, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


@router.get("/qr-codes/scan-history", response_model=list[ScanHistoryResponse])
async def list_all_scan_history(
    project_id: Optional[UUID] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List scan history across all accessible projects (flat endpoint)."""
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    query = (
        select(ScanHistory)
        .options(selectinload(ScanHistory.user))
        .where(ScanHistory.project_id.in_(user_project_ids))
    )

    if project_id:
        query = query.where(ScanHistory.project_id == project_id)
    if entity_type:
        query = query.where(ScanHistory.entity_type == entity_type)

    result = await db.execute(
        query.order_by(ScanHistory.scanned_at.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()
