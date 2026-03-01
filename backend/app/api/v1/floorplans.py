from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.file import File
from app.models.floorplan import Floorplan, FloorplanPin
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.floorplan import (
    FloorplanCreate,
    FloorplanPinCreate,
    FloorplanPinResponse,
    FloorplanResponse,
    FloorplanUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()

FLOORPLAN_LOAD_OPTIONS = [
    selectinload(Floorplan.file),
    selectinload(Floorplan.created_by),
]
FLOORPLAN_PIN_LOAD_OPTIONS = [
    selectinload(FloorplanPin.created_by),
]


async def verify_floorplan_exists(
    db: AsyncSession, floorplan_id: UUID, project_id: UUID, request: Request = None
) -> Floorplan:
    result = await db.execute(
        select(Floorplan).where(
            Floorplan.id == floorplan_id,
            Floorplan.project_id == project_id
        )
    )
    floorplan = result.scalar_one_or_none()
    if not floorplan:
        language = get_language_from_request(request)
        error_message = translate_message('resources.floorplan_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return floorplan


@router.get("/projects/{project_id}/floorplans", response_model=list[FloorplanResponse])
async def list_floorplans(
    project_id: UUID,
    floor_number: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(Floorplan)
        .where(Floorplan.project_id == project_id)
        .options(*FLOORPLAN_LOAD_OPTIONS)
    )

    if floor_number is not None:
        query = query.where(Floorplan.floor_number == floor_number)
    if is_active is not None:
        query = query.where(Floorplan.is_active == is_active)

    query = query.order_by(Floorplan.floor_number.asc(), Floorplan.version.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post(
    "/projects/{project_id}/floorplans",
    response_model=FloorplanResponse,
    status_code=201
)
async def create_floorplan(
    project_id: UUID,
    floorplan_data: FloorplanCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    # Verify file exists if provided
    if floorplan_data.file_id:
        file_result = await db.execute(
            select(File).where(
                File.id == floorplan_data.file_id,
                File.project_id == project_id
            )
        )
        file_record = file_result.scalar_one_or_none()
        if not file_record:
            language = get_language_from_request(request)
            error_message = translate_message('resources.file_not_found', language)
            raise HTTPException(status_code=404, detail=error_message)

    floorplan = Floorplan(
        project_id=project_id,
        name=floorplan_data.name,
        floor_number=floorplan_data.floor_number,
        file_id=floorplan_data.file_id,
        version=floorplan_data.version,
        created_by_id=current_user.id,
    )
    db.add(floorplan)
    await db.flush()
    await create_audit_log(
        db, current_user, "floorplan", floorplan.id, AuditAction.CREATE,
        project_id=project_id,
        new_values={"name": floorplan_data.name, "floor_number": floorplan_data.floor_number}
    )
    await db.commit()
    await db.refresh(floorplan, ["file", "created_by"])
    return floorplan

@router.get(
    "/projects/{project_id}/floorplans/{floorplan_id}",
    response_model=FloorplanResponse
)
async def get_floorplan(
    project_id: UUID,
    floorplan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Floorplan)
        .where(Floorplan.id == floorplan_id, Floorplan.project_id == project_id)
        .options(*FLOORPLAN_LOAD_OPTIONS)
    )
    floorplan = result.scalar_one_or_none()
    if not floorplan:
        language = get_language_from_request(request)
        error_message = translate_message('resources.floorplan_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return floorplan

@router.put(
    "/projects/{project_id}/floorplans/{floorplan_id}",
    response_model=FloorplanResponse
)
async def update_floorplan(
    project_id: UUID,
    floorplan_id: UUID,
    floorplan_data: FloorplanUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Floorplan)
        .where(Floorplan.id == floorplan_id, Floorplan.project_id == project_id)
        .options(*FLOORPLAN_LOAD_OPTIONS)
    )
    floorplan = result.scalar_one_or_none()
    if not floorplan:
        language = get_language_from_request(request)
        error_message = translate_message('resources.floorplan_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    # Verify file exists if being updated
    if floorplan_data.file_id is not None:
        file_result = await db.execute(
            select(File).where(
                File.id == floorplan_data.file_id,
                File.project_id == project_id
            )
        )
        file_record = file_result.scalar_one_or_none()
        if not file_record:
            language = get_language_from_request(request)
            error_message = translate_message('resources.file_not_found', language)
            raise HTTPException(status_code=404, detail=error_message)

    old_values = get_model_dict(floorplan)
    # Update fields
    update_data = floorplan_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(floorplan, field, value)
    await create_audit_log(
        db, current_user, "floorplan", floorplan.id, AuditAction.UPDATE,
        project_id=project_id,
        old_values=old_values,
        new_values=update_data
    )
    await db.commit()
    await db.refresh(floorplan, ["file", "created_by"])
    return floorplan

@router.delete("/projects/{project_id}/floorplans/{floorplan_id}")
async def delete_floorplan(
    project_id: UUID,
    floorplan_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Floorplan).where(
            Floorplan.id == floorplan_id,
            Floorplan.project_id == project_id
        )
    )
    floorplan = result.scalar_one_or_none()
    if not floorplan:
        language = get_language_from_request(request)
        error_message = translate_message('resources.floorplan_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(
        db, current_user, "floorplan", floorplan.id, AuditAction.DELETE,
        project_id=project_id,
        old_values=get_model_dict(floorplan)
    )
    await db.delete(floorplan)
    await db.commit()
    return {"message": "Floorplan deleted"}

@router.get(
    "/projects/{project_id}/floorplans/{floorplan_id}/pins",
    response_model=list[FloorplanPinResponse]
)
async def list_floorplan_pins(
    project_id: UUID,
    floorplan_id: UUID,
    entity_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    await verify_floorplan_exists(db, floorplan_id, project_id, request)

    query = (
        select(FloorplanPin)
        .where(FloorplanPin.floorplan_id == floorplan_id)
        .options(*FLOORPLAN_PIN_LOAD_OPTIONS)
    )
    if entity_type:
        query = query.where(FloorplanPin.entity_type == entity_type)

    query = query.order_by(FloorplanPin.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post(
    "/projects/{project_id}/floorplans/{floorplan_id}/pins",
    response_model=FloorplanPinResponse,
    status_code=201
)
async def create_floorplan_pin(
    project_id: UUID,
    floorplan_id: UUID,
    pin_data: FloorplanPinCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_floorplan_exists(db, floorplan_id, project_id, request)

    pin = FloorplanPin(
        floorplan_id=floorplan_id,
        entity_type=pin_data.entity_type,
        entity_id=pin_data.entity_id,
        x_position=pin_data.x_position,
        y_position=pin_data.y_position,
        created_by_id=current_user.id,
    )

    db.add(pin)
    await db.flush()

    await create_audit_log(
        db, current_user, "floorplan_pin", pin.id, AuditAction.CREATE,
        project_id=project_id,
        new_values={
            "floorplan_id": str(floorplan_id),
            "entity_type": pin_data.entity_type,
            "entity_id": str(pin_data.entity_id)
        }
    )

    await db.commit()
    await db.refresh(pin, ["created_by"])
    return pin
