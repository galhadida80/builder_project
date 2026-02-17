from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.meeting import Meeting
from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.rfi import RFI
from app.models.user import User
from app.schemas.organization import (
    OrgCreate,
    OrgMemberCreate,
    OrgMemberResponse,
    OrgMemberUpdate,
    OrgResponse,
    OrgUpdate,
)

router = APIRouter()


async def verify_org_access(
    org_id: UUID, user: User, db: AsyncSession, require_admin: bool = False
) -> OrganizationMember | None:
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        if user.is_super_admin:
            return None
        raise HTTPException(status_code=403, detail="Not an organization member")
    if require_admin and member.role != "org_admin" and not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Organization admin required")
    return member


@router.get("/organizations", response_model=list[OrgResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member_count_subq = (
        select(func.count(OrganizationMember.id))
        .where(OrganizationMember.organization_id == Organization.id)
        .correlate(Organization)
        .scalar_subquery()
    )

    if current_user.is_super_admin:
        query = (
            select(Organization, member_count_subq.label("member_count"))
            .order_by(Organization.name)
        )
    else:
        query = (
            select(Organization, member_count_subq.label("member_count"))
            .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
            .where(OrganizationMember.user_id == current_user.id)
            .order_by(Organization.name)
        )

    result = await db.execute(query)
    rows = result.all()
    return [
        OrgResponse(
            id=org.id,
            name=org.name,
            code=org.code,
            description=org.description,
            logo_url=org.logo_url,
            settings=org.settings,
            created_at=org.created_at,
            updated_at=org.updated_at,
            member_count=count or 0,
        )
        for org, count in rows
    ]


@router.post("/organizations", response_model=OrgResponse, status_code=201)
async def create_organization(
    data: OrgCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(Organization).where(Organization.code == data.code.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Organization code already exists")

    org = Organization(
        name=data.name,
        code=data.code.upper(),
        description=data.description,
        logo_url=data.logo_url,
    )
    db.add(org)
    await db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="org_admin",
    )
    db.add(member)
    await db.flush()

    return OrgResponse(
        id=org.id,
        name=org.name,
        code=org.code,
        description=org.description,
        logo_url=org.logo_url,
        settings=org.settings,
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=1,
    )


@router.get("/organizations/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db)

    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    count_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.organization_id == org_id
        )
    )
    member_count = count_result.scalar() or 0

    return OrgResponse(
        id=org.id,
        name=org.name,
        code=org.code,
        description=org.description,
        logo_url=org.logo_url,
        settings=org.settings,
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=member_count,
    )


@router.put("/organizations/{org_id}", response_model=OrgResponse)
async def update_organization(
    org_id: UUID,
    data: OrgUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db, require_admin=True)

    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if data.name is not None:
        org.name = data.name
    if data.code is not None:
        new_code = data.code.upper()
        if new_code != org.code:
            dup = await db.execute(
                select(Organization).where(Organization.code == new_code, Organization.id != org_id)
            )
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Organization code already exists")
            org.code = new_code
    if data.description is not None:
        org.description = data.description
    if data.logo_url is not None:
        org.logo_url = data.logo_url

    await db.flush()

    count_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.organization_id == org_id
        )
    )
    member_count = count_result.scalar() or 0

    return OrgResponse(
        id=org.id,
        name=org.name,
        code=org.code,
        description=org.description,
        logo_url=org.logo_url,
        settings=org.settings,
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=member_count,
    )


@router.get("/organizations/{org_id}/members", response_model=list[OrgMemberResponse])
async def list_organization_members(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db)

    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.added_at)
    )
    members = result.scalars().all()
    return [
        OrgMemberResponse(
            id=m.id,
            organization_id=m.organization_id,
            user_id=m.user_id,
            role=m.role,
            added_at=m.added_at,
            user=m.user,
        )
        for m in members
    ]


@router.post("/organizations/{org_id}/members", response_model=OrgMemberResponse, status_code=201)
async def add_organization_member(
    org_id: UUID,
    data: OrgMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db, require_admin=True)

    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")

    user_result = await db.execute(select(User).where(User.id == data.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member of this organization")

    member = OrganizationMember(
        organization_id=org_id,
        user_id=data.user_id,
        role=data.role,
    )
    db.add(member)
    await db.flush()

    load_result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.id == member.id)
    )
    member = load_result.scalar_one()

    return OrgMemberResponse(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        role=member.role,
        added_at=member.added_at,
        user=member.user,
    )


@router.put("/organizations/{org_id}/members/{member_id}", response_model=OrgMemberResponse)
async def update_organization_member(
    org_id: UUID,
    member_id: UUID,
    data: OrgMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db, require_admin=True)

    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = data.role
    await db.flush()

    return OrgMemberResponse(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        role=member.role,
        added_at=member.added_at,
        user=member.user,
    )


@router.delete("/organizations/{org_id}/members/{member_id}")
async def remove_organization_member(
    org_id: UUID,
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db, require_admin=True)

    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    admin_count_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.role == "org_admin",
        )
    )
    admin_count = admin_count_result.scalar() or 0
    if member.role == "org_admin" and admin_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last organization admin")

    await db.delete(member)
    return {"message": "Member removed"}


@router.get("/organizations/{org_id}/projects", response_model=list[dict])
async def list_organization_projects(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db)

    result = await db.execute(
        select(Project).where(Project.organization_id == org_id).order_by(Project.name)
    )
    projects = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "code": p.code,
            "description": p.description,
            "status": p.status,
            "startDate": p.start_date.isoformat() if p.start_date else None,
            "estimatedEndDate": p.estimated_end_date.isoformat() if p.estimated_end_date else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]


@router.get("/organizations/{org_id}/analytics")
async def get_organization_analytics(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_org_access(org_id, current_user, db)

    org_projects = select(Project.id).where(Project.organization_id == org_id).scalar_subquery()

    project_count_result = await db.execute(
        select(func.count(Project.id)).where(Project.organization_id == org_id)
    )
    total_projects = project_count_result.scalar() or 0

    equipment_count_result = await db.execute(
        select(func.count(Equipment.id)).where(Equipment.project_id.in_(org_projects))
    )
    total_equipment = equipment_count_result.scalar() or 0

    material_count_result = await db.execute(
        select(func.count(Material.id)).where(Material.project_id.in_(org_projects))
    )
    total_materials = material_count_result.scalar() or 0

    meeting_count_result = await db.execute(
        select(func.count(Meeting.id)).where(Meeting.project_id.in_(org_projects))
    )
    total_meetings = meeting_count_result.scalar() or 0

    rfi_count_result = await db.execute(
        select(func.count(RFI.id)).where(RFI.project_id.in_(org_projects))
    )
    total_rfis = rfi_count_result.scalar() or 0

    member_count_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.organization_id == org_id
        )
    )
    total_members = member_count_result.scalar() or 0

    return {
        "organizationId": str(org_id),
        "totalProjects": total_projects,
        "totalEquipment": total_equipment,
        "totalMaterials": total_materials,
        "totalMeetings": total_meetings,
        "totalRfis": total_rfis,
        "totalMembers": total_members,
    }
