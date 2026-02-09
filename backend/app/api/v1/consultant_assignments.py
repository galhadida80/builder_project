from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.consultant_assignment import ConsultantAssignment
from app.models.project import Project
from app.models.user import User
from app.schemas.consultant_assignment import (
    ConsultantAssignmentCreate, ConsultantAssignmentUpdate, ConsultantAssignmentResponse
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user, verify_project_access

router = APIRouter()


@router.get("/consultant-assignments", response_model=list[ConsultantAssignmentResponse])
async def list_consultant_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ConsultantAssignment)
        .options(
            selectinload(ConsultantAssignment.consultant),
            selectinload(ConsultantAssignment.project).selectinload(Project.members),
            selectinload(ConsultantAssignment.consultant_type)
        )
        .order_by(ConsultantAssignment.start_date.desc())
    )
    return result.scalars().all()


@router.post("/consultant-assignments", response_model=ConsultantAssignmentResponse, status_code=201)
async def create_consultant_assignment(
    data: ConsultantAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(data.project_id, current_user, db)
    assignment = ConsultantAssignment(**data.model_dump())
    db.add(assignment)
    await db.flush()

    await create_audit_log(db, current_user, "consultant_assignment", assignment.id, AuditAction.CREATE,
                          new_values=get_model_dict(assignment))

    result = await db.execute(
        select(ConsultantAssignment)
        .options(
            selectinload(ConsultantAssignment.consultant),
            selectinload(ConsultantAssignment.project).selectinload(Project.members),
            selectinload(ConsultantAssignment.consultant_type)
        )
        .where(ConsultantAssignment.id == assignment.id)
    )
    return result.scalar_one()


@router.get("/consultant-assignments/{assignment_id}", response_model=ConsultantAssignmentResponse)
async def get_consultant_assignment(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ConsultantAssignment)
        .options(
            selectinload(ConsultantAssignment.consultant),
            selectinload(ConsultantAssignment.project).selectinload(Project.members),
            selectinload(ConsultantAssignment.consultant_type)
        )
        .where(ConsultantAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Consultant assignment not found")
    await verify_project_access(assignment.project_id, current_user, db)
    return assignment


@router.put("/consultant-assignments/{assignment_id}", response_model=ConsultantAssignmentResponse)
async def update_consultant_assignment(
    assignment_id: UUID,
    data: ConsultantAssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConsultantAssignment).where(ConsultantAssignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Consultant assignment not found")

    await verify_project_access(assignment.project_id, current_user, db)

    old_values = get_model_dict(assignment)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(assignment, key, value)

    await create_audit_log(db, current_user, "consultant_assignment", assignment.id, AuditAction.UPDATE,
                          old_values=old_values, new_values=get_model_dict(assignment))

    result = await db.execute(
        select(ConsultantAssignment)
        .options(
            selectinload(ConsultantAssignment.consultant),
            selectinload(ConsultantAssignment.project).selectinload(Project.members),
            selectinload(ConsultantAssignment.consultant_type)
        )
        .where(ConsultantAssignment.id == assignment.id)
    )
    return result.scalar_one()


@router.delete("/consultant-assignments/{assignment_id}")
async def delete_consultant_assignment(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConsultantAssignment).where(ConsultantAssignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Consultant assignment not found")

    await verify_project_access(assignment.project_id, current_user, db)

    await create_audit_log(db, current_user, "consultant_assignment", assignment.id, AuditAction.DELETE,
                          old_values=get_model_dict(assignment))

    await db.delete(assignment)
    return {"message": "Consultant assignment deleted"}
