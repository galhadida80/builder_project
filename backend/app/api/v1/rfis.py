import uuid
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.permissions import Permission, check_permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.rfi import RFI, RFIEmailLog, RFIResponse as RFIResponseModel
from app.models.user import User
from app.schemas.rfi import (
    PaginatedRFIResponse,
    RFICreate,
    RFIDeadlineResponse,
    RFIEmailLogSchema,
    RFIListResponse,
    RFIResponse,
    RFIResponseCreate,
    RFIResponseSchema,
    RFIStatusUpdate,
    RFISummaryResponse,
    RFIUpdate,
)
from app.services.email_service import EmailService
from app.services.rfi_service import RFIService
from app.utils.localization import get_language_from_request
from app.utils import utcnow

router = APIRouter(tags=["rfis"])


@router.get("/projects/{project_id}/rfis", response_model=PaginatedRFIResponse)
async def get_project_rfis(
    project_id: uuid.UUID,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    service = RFIService(db)
    rfis, total = await service.get_rfis_by_project(
        project_id=project_id,
        status=status,
        priority=priority,
        search=search,
        page=page,
        page_size=page_size
    )

    rfi_ids = [rfi.id for rfi in rfis]
    count_result = await db.execute(
        select(RFIResponseModel.rfi_id, func.count(RFIResponseModel.id).label("cnt"))
        .where(RFIResponseModel.rfi_id.in_(rfi_ids))
        .group_by(RFIResponseModel.rfi_id)
    )
    response_counts = {row.rfi_id: row.cnt for row in count_result.all()}

    rfi_responses = []
    for rfi in rfis:
        rfi_responses.append(RFIListResponse(
            id=rfi.id,
            project_id=rfi.project_id,
            rfi_number=rfi.rfi_number,
            subject=rfi.subject,
            to_email=rfi.to_email,
            to_name=rfi.to_name,
            category=rfi.category,
            priority=rfi.priority,
            status=rfi.status,
            due_date=rfi.due_date,
            created_at=rfi.created_at,
            sent_at=rfi.sent_at,
            responded_at=rfi.responded_at,
            response_count=response_counts.get(rfi.id, 0),
            related_equipment_id=rfi.related_equipment_id,
            related_material_id=rfi.related_material_id
        ))

    total_pages = (total + page_size - 1) // page_size

    return PaginatedRFIResponse(
        items=rfi_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/projects/{project_id}/rfis", response_model=RFIResponse, status_code=201)
async def create_rfi(
    project_id: uuid.UUID,
    rfi_data: RFICreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = RFIService(db)
    rfi = await service.create_rfi(
        project_id=project_id,
        created_by_id=current_user.id,
        to_email=rfi_data.to_email,
        subject=rfi_data.subject,
        question=rfi_data.question,
        to_name=rfi_data.to_name,
        cc_emails=rfi_data.cc_emails,
        category=rfi_data.category,
        priority=rfi_data.priority,
        due_date=rfi_data.due_date,
        location=rfi_data.location,
        drawing_reference=rfi_data.drawing_reference,
        specification_reference=rfi_data.specification_reference,
        attachments=rfi_data.attachments,
        assigned_to_id=rfi_data.assigned_to_id,
        related_equipment_id=rfi_data.related_equipment_id,
        related_material_id=rfi_data.related_material_id
    )
    return await service.get_rfi(rfi.id)


@router.get("/projects/{project_id}/rfis/summary", response_model=RFISummaryResponse)
async def get_rfi_summary(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    service = RFIService(db)
    return await service.get_rfi_summary(project_id)


@router.get("/projects/{project_id}/rfis/overdue", response_model=list[RFIDeadlineResponse])
async def get_overdue_rfis(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    now = utcnow()
    result = await db.execute(
        select(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.due_date < now,
            RFI.due_date.isnot(None),
            RFI.status.in_(["draft", "open", "waiting_response"])
        )
        .order_by(RFI.due_date.asc())
    )
    rfis = result.scalars().all()
    return [
        RFIDeadlineResponse(
            id=rfi.id,
            project_id=rfi.project_id,
            rfi_number=rfi.rfi_number,
            subject=rfi.subject,
            to_email=rfi.to_email,
            to_name=rfi.to_name,
            category=rfi.category,
            priority=rfi.priority,
            status=rfi.status,
            due_date=rfi.due_date,
            days_overdue=(now - rfi.due_date).days if rfi.due_date else 0,
            created_at=rfi.created_at,
            sent_at=rfi.sent_at
        )
        for rfi in rfis
    ]


@router.get("/projects/{project_id}/rfis/upcoming-deadlines", response_model=list[RFIDeadlineResponse])
async def get_upcoming_deadline_rfis(
    project_id: uuid.UUID,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    now = utcnow()
    deadline = now + timedelta(days=days)
    result = await db.execute(
        select(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.due_date >= now,
            RFI.due_date <= deadline,
            RFI.due_date.isnot(None),
            RFI.status.in_(["draft", "open", "waiting_response"])
        )
        .order_by(RFI.due_date.asc())
    )
    rfis = result.scalars().all()
    return [
        RFIDeadlineResponse(
            id=rfi.id,
            project_id=rfi.project_id,
            rfi_number=rfi.rfi_number,
            subject=rfi.subject,
            to_email=rfi.to_email,
            to_name=rfi.to_name,
            category=rfi.category,
            priority=rfi.priority,
            status=rfi.status,
            due_date=rfi.due_date,
            days_until_due=(rfi.due_date - now).days if rfi.due_date else 0,
            created_at=rfi.created_at,
            sent_at=rfi.sent_at
        )
        for rfi in rfis
    ]


@router.get("/rfis/{rfi_id}", response_model=RFIResponse)
async def get_rfi(
    rfi_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = RFIService(db)
    rfi = await service.get_rfi(rfi_id)
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    await verify_project_access(rfi.project_id, current_user, db)
    return rfi


@router.patch("/rfis/{rfi_id}", response_model=RFIResponse)
async def update_rfi(
    rfi_id: uuid.UUID,
    rfi_data: RFIUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()

    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    await check_permission(Permission.EDIT, rfi.project_id, current_user.id, db)

    update_data = rfi_data.model_dump(exclude_unset=True)
    if rfi.status != "draft":
        allowed_fields = {"priority", "category", "due_date"}
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}

    for field, value in update_data.items():
        setattr(rfi, field, value)

    await db.commit()

    service = RFIService(db)
    return await service.get_rfi(rfi_id)


@router.post("/rfis/{rfi_id}/send", response_model=RFIResponse)
async def send_rfi(
    rfi_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    await check_permission(Permission.EDIT, rfi.project_id, current_user.id, db)

    language = get_language_from_request(request)
    service = RFIService(db)
    try:
        rfi = await service.send_rfi(rfi_id, language=language)
        return await service.get_rfi(rfi.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {str(e)}")


@router.patch("/rfis/{rfi_id}/status", response_model=RFIResponse)
async def update_rfi_status(
    rfi_id: uuid.UUID,
    status_data: RFIStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    await check_permission(Permission.EDIT, rfi.project_id, current_user.id, db)

    service = RFIService(db)
    try:
        await service.update_status(rfi_id, status_data.status)
        return await service.get_rfi(rfi_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rfis/{rfi_id}/responses", response_model=RFIResponseSchema, status_code=201)
async def add_rfi_response(
    rfi_id: uuid.UUID,
    response_data: RFIResponseCreate,
    request: Request,
    send_email: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    await check_permission(Permission.CREATE, rfi.project_id, current_user.id, db)

    service = RFIService(db)
    try:
        language = get_language_from_request(request)
        response = await service.add_internal_response(
            rfi_id=rfi_id,
            user_id=current_user.id,
            response_text=response_data.response_text,
            attachments=response_data.attachments,
            send_email=send_email,
            language=language,
            is_internal=response_data.is_internal,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/rfis/{rfi_id}/responses", response_model=list[RFIResponseSchema])
async def get_rfi_responses(
    rfi_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = RFIService(db)
    rfi = await service.get_rfi(rfi_id)
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    await verify_project_access(rfi.project_id, current_user, db)
    return rfi.responses


@router.get("/rfis/{rfi_id}/email-log", response_model=list[RFIEmailLogSchema])
async def get_rfi_email_log(
    rfi_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rfi_result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = rfi_result.scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    await verify_project_access(rfi.project_id, current_user, db)

    result = await db.execute(
        select(RFIEmailLog)
        .where(RFIEmailLog.rfi_id == rfi_id)
        .order_by(RFIEmailLog.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/rfis/{rfi_id}", status_code=204)
async def delete_rfi(
    rfi_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(RFI).where(RFI.id == rfi_id))
    rfi = result.scalar_one_or_none()

    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")

    await check_permission(Permission.DELETE, rfi.project_id, current_user.id, db)

    if rfi.status not in ['draft', 'cancelled']:
        raise HTTPException(
            status_code=400,
            detail="Only draft or cancelled RFIs can be deleted"
        )

    await db.delete(rfi)
    await db.commit()


@router.get("/dev/emails")
async def get_dev_emails(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    settings = get_settings()
    if settings.environment != "development":
        raise HTTPException(status_code=403, detail="Only available in development")

    email_service = EmailService()

    if hasattr(email_service.provider, 'get_sent_emails'):
        return {"emails": email_service.provider.get_sent_emails(limit)}

    return {"emails": [], "message": "Not using fake email service"}
