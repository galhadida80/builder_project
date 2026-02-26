from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.contact import Contact
from app.models.contact_group import ContactGroup, ContactGroupMember
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.contact_group import (
    AddMembersRequest,
    ContactGroupCreate,
    ContactGroupListResponse,
    ContactGroupResponse,
    ContactGroupUpdate,
)

router = APIRouter()


async def validate_contacts_belong_to_project(db: AsyncSession, project_id: UUID, contact_ids: list[UUID]) -> None:
    if not contact_ids:
        return
    result = await db.execute(
        select(func.count(Contact.id)).where(
            Contact.id.in_(contact_ids),
            Contact.project_id == project_id,
        )
    )
    count = result.scalar()
    if count != len(set(contact_ids)):
        raise HTTPException(status_code=400, detail="Some contacts do not belong to this project")


@router.get("/projects/{project_id}/contact-groups", response_model=list[ContactGroupListResponse])
async def list_contact_groups(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(
            ContactGroup,
            func.count(ContactGroupMember.id).label("member_count"),
        )
        .outerjoin(ContactGroupMember)
        .where(ContactGroup.project_id == project_id)
        .group_by(ContactGroup.id)
        .order_by(ContactGroup.name)
    )
    rows = result.all()
    return [
        ContactGroupListResponse(
            id=group.id,
            project_id=group.project_id,
            name=group.name,
            description=group.description,
            member_count=count,
            created_at=group.created_at,
            updated_at=group.updated_at,
        )
        for group, count in rows
    ]


@router.post("/projects/{project_id}/contact-groups", response_model=ContactGroupResponse, status_code=201)
async def create_contact_group(
    project_id: UUID,
    data: ContactGroupCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await validate_contacts_belong_to_project(db, project_id, data.contact_ids)

    group = ContactGroup(
        project_id=project_id,
        name=data.name,
        description=data.description,
    )
    db.add(group)
    await db.flush()

    for contact_id in set(data.contact_ids):
        db.add(ContactGroupMember(group_id=group.id, contact_id=contact_id))
    await db.flush()

    return await get_group_detail(db, group.id)


@router.get("/projects/{project_id}/contact-groups/{group_id}", response_model=ContactGroupResponse)
async def get_contact_group(
    project_id: UUID,
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    group = await get_group_detail(db, group_id)
    if not group or group.project_id != project_id:
        raise HTTPException(status_code=404, detail="Contact group not found")
    return group


@router.put("/projects/{project_id}/contact-groups/{group_id}", response_model=ContactGroupResponse)
async def update_contact_group(
    project_id: UUID,
    group_id: UUID,
    data: ContactGroupUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ContactGroup).where(ContactGroup.id == group_id, ContactGroup.project_id == project_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Contact group not found")

    if data.name is not None:
        group.name = data.name
    if data.description is not None:
        group.description = data.description

    if data.contact_ids is not None:
        await validate_contacts_belong_to_project(db, project_id, data.contact_ids)
        await db.execute(
            ContactGroupMember.__table__.delete().where(ContactGroupMember.group_id == group_id)
        )
        for contact_id in set(data.contact_ids):
            db.add(ContactGroupMember(group_id=group.id, contact_id=contact_id))

    await db.flush()
    return await get_group_detail(db, group.id)


@router.delete("/projects/{project_id}/contact-groups/{group_id}")
async def delete_contact_group(
    project_id: UUID,
    group_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ContactGroup).where(ContactGroup.id == group_id, ContactGroup.project_id == project_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Contact group not found")
    await db.delete(group)
    await db.commit()
    return {"message": "Contact group deleted"}


@router.post("/projects/{project_id}/contact-groups/{group_id}/members", response_model=ContactGroupResponse)
async def add_members(
    project_id: UUID,
    group_id: UUID,
    data: AddMembersRequest,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ContactGroup).where(ContactGroup.id == group_id, ContactGroup.project_id == project_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Contact group not found")

    await validate_contacts_belong_to_project(db, project_id, data.contact_ids)

    existing = await db.execute(
        select(ContactGroupMember.contact_id).where(ContactGroupMember.group_id == group_id)
    )
    existing_ids = {row[0] for row in existing.all()}

    for contact_id in set(data.contact_ids) - existing_ids:
        db.add(ContactGroupMember(group_id=group.id, contact_id=contact_id))
    await db.flush()

    return await get_group_detail(db, group.id)


@router.delete("/projects/{project_id}/contact-groups/{group_id}/members/{contact_id}")
async def remove_member(
    project_id: UUID,
    group_id: UUID,
    contact_id: UUID,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ContactGroupMember).where(
            ContactGroupMember.group_id == group_id,
            ContactGroupMember.contact_id == contact_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in group")
    await db.delete(member)
    await db.commit()
    return {"message": "Member removed"}


async def get_group_detail(db: AsyncSession, group_id: UUID) -> ContactGroup | None:
    result = await db.execute(
        select(ContactGroup)
        .options(selectinload(ContactGroup.members).selectinload(ContactGroupMember.contact))
        .where(ContactGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        return None
    group.contacts = [m.contact for m in group.members]
    return group
