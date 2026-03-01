from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.rfi import RFI, RFIResponse as RFIResponseModel
from app.models.user import User
from app.schemas.rfi import PaginatedRFIResponse, RFIListResponse

router = APIRouter()


@router.get("/subcontractors/my-rfis", response_model=PaginatedRFIResponse)
async def get_my_rfis(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all RFIs for the subcontractor across all projects"""
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )

    query = select(RFI).where(RFI.project_id.in_(user_project_ids))

    if status:
        query = query.where(RFI.status == status)
    if priority:
        query = query.where(RFI.priority == priority)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (RFI.subject.ilike(search_pattern)) |
            (RFI.question.ilike(search_pattern)) |
            (RFI.rfi_number.ilike(search_pattern))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(RFI.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rfis = result.scalars().all()

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
