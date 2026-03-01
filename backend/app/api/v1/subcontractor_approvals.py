from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.approval import ApprovalRequestResponse

router = APIRouter()


@router.get("/subcontractors/my-approvals", response_model=list[ApprovalRequestResponse])
async def get_my_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all approval requests for the subcontractor across all projects"""
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.project_id.in_(user_project_ids))
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()
