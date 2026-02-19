from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.area import AreaChecklistAssignment, ConstructionArea
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.area import (
    AreaChecklistAssignmentCreate,
    AreaChecklistAssignmentResponse,
    AreaResponse,
    BulkAreaCreate,
    BulkAreaCreateResponse,
)
from app.services.area_structure_service import (
    compute_area_checklist_progress,
    create_checklists_for_area,
    process_bulk_area_tree,
)

router = APIRouter()


@router.post("/projects/{project_id}/areas/bulk", response_model=BulkAreaCreateResponse)
async def bulk_create_areas(
    project_id: UUID,
    data: BulkAreaCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    areas, checklist_count = await process_bulk_area_tree(
        db, project_id, data.areas, None, current_user.id, data.auto_assign_checklists
    )

    for area in areas:
        await db.refresh(area, ["children", "progress_updates"])

    root_areas = [a for a in areas if a.parent_id is None]
    return BulkAreaCreateResponse(
        created_count=len(areas),
        checklist_instances_created=checklist_count,
        areas=root_areas,
    )


@router.get("/projects/{project_id}/area-checklist-assignments", response_model=list[AreaChecklistAssignmentResponse])
async def list_assignments(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(AreaChecklistAssignment)
        .where(AreaChecklistAssignment.project_id == project_id)
        .order_by(AreaChecklistAssignment.area_type, AreaChecklistAssignment.created_at)
    )
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/area-checklist-assignments",
    response_model=AreaChecklistAssignmentResponse,
    status_code=201,
)
async def create_assignment(
    project_id: UUID,
    data: AreaChecklistAssignmentCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(AreaChecklistAssignment).where(
            AreaChecklistAssignment.project_id == project_id,
            AreaChecklistAssignment.area_type == data.area_type,
            AreaChecklistAssignment.template_id == data.template_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Assignment already exists for this area type and template",
        )

    assignment = AreaChecklistAssignment(
        project_id=project_id,
        area_type=data.area_type,
        template_id=data.template_id,
        auto_create=data.auto_create,
        created_by_id=current_user.id,
    )
    db.add(assignment)
    await db.flush()
    return assignment


@router.delete("/projects/{project_id}/area-checklist-assignments/{assignment_id}")
async def delete_assignment(
    project_id: UUID,
    assignment_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AreaChecklistAssignment).where(
            AreaChecklistAssignment.id == assignment_id,
            AreaChecklistAssignment.project_id == project_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(assignment)
    return {"message": "Assignment deleted"}


@router.post("/projects/{project_id}/areas/{area_id}/create-checklists")
async def trigger_create_checklists(
    project_id: UUID,
    area_id: UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ConstructionArea).where(
            ConstructionArea.id == area_id, ConstructionArea.project_id == project_id
        )
    )
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    count = await create_checklists_for_area(db, project_id, area, current_user.id)

    children_result = await db.execute(
        select(ConstructionArea).where(
            ConstructionArea.parent_id == area_id, ConstructionArea.project_id == project_id
        )
    )
    for child in children_result.scalars().all():
        count += await create_checklists_for_area(db, project_id, child, current_user.id)

    return {"checklists_created": count}


@router.get("/projects/{project_id}/areas/{area_id}/checklist-summary")
async def get_area_checklist_summary(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ConstructionArea).where(
            ConstructionArea.id == area_id, ConstructionArea.project_id == project_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Area not found")

    return await compute_area_checklist_progress(db, area_id)
