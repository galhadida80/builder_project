from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberCreate, ProjectMemberResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(ProjectMember.user_id == current_user.id)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(**data.model_dump(), created_by_id=current_user.id)
    db.add(project)
    await db.flush()

    member = ProjectMember(project_id=project.id, user_id=current_user.id, role="project_admin")
    db.add(member)

    await create_audit_log(db, current_user, "project", project.id, AuditAction.CREATE,
                          project_id=project.id, new_values=get_model_dict(project))

    await db.refresh(project, ["members"])
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
    )
    project = result.scalar_one_or_none()
    if not project:
        language = get_language_from_request(request)
        error_message = translate_message('resources.project_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        language = get_language_from_request(request)
        error_message = translate_message('resources.project_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    old_values = get_model_dict(project)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)

    await create_audit_log(db, current_user, "project", project.id, AuditAction.UPDATE,
                          project_id=project.id, old_values=old_values, new_values=get_model_dict(project))

    await db.refresh(project, ["members"])
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        language = get_language_from_request(request)
        error_message = translate_message('resources.project_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "project", project.id, AuditAction.DELETE,
                          project_id=project.id, old_values=get_model_dict(project))

    await db.delete(project)
    return {"message": "Project deleted"}


@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: UUID,
    data: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = ProjectMember(project_id=project_id, user_id=data.user_id, role=data.role)
    db.add(member)
    await db.flush()
    await db.refresh(member, ["user"])
    return member


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        language = get_language_from_request(request)
        error_message = translate_message('resources.resource_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await db.delete(member)
    return {"message": "Member removed"}
