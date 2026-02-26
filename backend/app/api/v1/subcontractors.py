import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.invitation import InvitationStatus, ProjectInvitation
from app.models.project import Project, ProjectMember
from app.models.subcontractor import SubcontractorProfile
from app.models.user import User
from app.schemas.subcontractor import (
    SubcontractorInviteRequest,
    SubcontractorInviteResponse,
    SubcontractorProfileCreate,
    SubcontractorProfileResponse,
    SubcontractorProfileUpdate,
)
from app.services.email_renderer import render_subcontractor_invite_email
from app.services.email_service import EmailService
from app.utils import utcnow
from app.utils.localization import get_language_from_request

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


@router.get("/projects/{project_id}/subcontractors", response_model=list[SubcontractorProfileResponse])
async def list_subcontractors(
    project_id: UUID,
    trade: str = Query(None),
    verified_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    members_result = await db.execute(
        select(ProjectMember.user_id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.role == "subcontractor",
        )
    )
    sub_user_ids = [row[0] for row in members_result.all()]
    if not sub_user_ids:
        return []

    query = (
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.user_id.in_(sub_user_ids))
    )
    if trade:
        query = query.where(SubcontractorProfile.trade == trade)
    if verified_only:
        query = query.where(SubcontractorProfile.is_verified.is_(True))

    result = await db.execute(query.order_by(SubcontractorProfile.company_name))
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/subcontractors/invite",
    response_model=SubcontractorInviteResponse,
    status_code=201,
)
async def invite_subcontractor(
    project_id: UUID,
    data: SubcontractorInviteRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.email == data.email,
            ProjectInvitation.status == InvitationStatus.PENDING.value,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Pending invitation already exists for this email")

    invitation = ProjectInvitation(
        project_id=project_id,
        email=data.email,
        role="subcontractor",
        invited_by_id=current_user.id,
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    invite_url = f"{settings.frontend_base_url}/invite?token={invitation.token}"
    language = get_language_from_request(request)

    try:
        email_service = EmailService()
        if email_service.enabled:
            invited_by_name = current_user.full_name or current_user.email
            subject, body_html = render_subcontractor_invite_email(
                project_name=project.name,
                company_name=data.company_name,
                trade=data.trade,
                invited_by=invited_by_name,
                invite_url=invite_url,
                language=language,
                message=data.message or "",
            )
            background_tasks.add_task(
                email_service.send_notification,
                to_email=data.email,
                subject=subject,
                body_html=body_html,
            )
    except Exception:
        logger.warning("Failed to send subcontractor invite email to %s", data.email, exc_info=True)

    return SubcontractorInviteResponse(
        id=invitation.id,
        email=invitation.email,
        trade=data.trade,
        company_name=data.company_name,
        token=invitation.token,
        invite_url=invite_url,
        expires_at=invitation.expires_at,
    )


@router.get("/subcontractors/invite/accept")
async def accept_subcontractor_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectInvitation).where(ProjectInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation token")

    if invitation.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Invitation is {invitation.status}")

    if invitation.expires_at < utcnow():
        invitation.status = InvitationStatus.EXPIRED.value
        await db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    project_result = await db.execute(select(Project).where(Project.id == invitation.project_id))
    project = project_result.scalar_one_or_none()

    return {
        "email": invitation.email,
        "role": invitation.role,
        "projectName": project.name if project else None,
        "projectId": str(invitation.project_id),
    }


@router.get("/subcontractors/me", response_model=SubcontractorProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Subcontractor profile not found")
    return profile


@router.post("/subcontractors/me", response_model=SubcontractorProfileResponse, status_code=201)
async def create_my_profile(
    data: SubcontractorProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(SubcontractorProfile).where(SubcontractorProfile.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Profile already exists")

    profile = SubcontractorProfile(
        user_id=current_user.id,
        company_name=data.company_name,
        trade=data.trade,
        license_number=data.license_number,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        address=data.address,
        insurance_expiry=data.insurance_expiry,
        notes=data.notes,
        certifications=data.certifications,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile, ["user"])
    return profile


@router.patch("/subcontractors/me", response_model=SubcontractorProfileResponse)
async def update_my_profile(
    data: SubcontractorProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Subcontractor profile not found")

    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("is_verified", None)
    for key, value in update_data.items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile, ["user"])
    return profile


@router.patch("/subcontractors/{profile_id}/verify", response_model=SubcontractorProfileResponse)
async def verify_subcontractor(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not getattr(current_user, "is_super_admin", False):
        raise HTTPException(status_code=403, detail="Only admins can verify subcontractors")

    result = await db.execute(
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.is_verified = not profile.is_verified
    await db.commit()
    await db.refresh(profile, ["user"])
    return profile


@router.get("/projects/{project_id}/subcontractors/portal", response_model=dict)
async def get_portal_data(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    profile_result = await db.execute(
        select(SubcontractorProfile).where(SubcontractorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()

    return {
        "has_profile": profile is not None,
        "is_verified": profile.is_verified if profile else False,
        "role": member.role if member else None,
        "company_name": profile.company_name if profile else None,
        "trade": profile.trade if profile else None,
    }
