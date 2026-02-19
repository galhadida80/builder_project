import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.invitation import InvitationStatus, ProjectInvitation
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.invitation import InvitationCreate, InvitationResponse
from app.services.email_renderer import render_invitation_email
from app.services.email_service import EmailService
from app.utils.localization import get_language_from_request
from app.utils import utcnow

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


def build_invite_url(token: str) -> str:
    return f"{settings.frontend_base_url}/invite?token={token}"


def invitation_to_response(inv: ProjectInvitation) -> InvitationResponse:
    return InvitationResponse(
        id=inv.id,
        project_id=inv.project_id,
        email=inv.email,
        role=inv.role,
        token=inv.token,
        status=inv.status,
        invite_url=build_invite_url(inv.token),
        invited_by_id=inv.invited_by_id,
        expires_at=inv.expires_at,
        created_at=inv.created_at,
    )


@router.post("/projects/{project_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    project_id: UUID,
    data: InvitationCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    member: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
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
        role=data.role,
        invited_by_id=current_user.id,
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    invite_url = build_invite_url(invitation.token)
    language = get_language_from_request(request)
    try:
        email_service = EmailService()
        if email_service.enabled:
            invited_by_name = current_user.full_name or current_user.email
            subject, body_html = render_invitation_email(
                project_name=project.name,
                role=data.role,
                invited_by=invited_by_name,
                invite_url=invite_url,
                language=language,
            )
            background_tasks.add_task(
                email_service.send_notification,
                to_email=data.email,
                subject=subject,
                body_html=body_html,
            )
    except Exception:
        logger.warning("Failed to send invitation email to %s", data.email, exc_info=True)

    return invitation_to_response(invitation)


@router.get("/projects/{project_id}/invitations", response_model=list[InvitationResponse])
async def list_invitations(
    project_id: UUID,
    member: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectInvitation)
        .where(ProjectInvitation.project_id == project_id)
        .order_by(ProjectInvitation.created_at.desc())
    )
    return [invitation_to_response(inv) for inv in result.scalars().all()]


@router.delete("/projects/{project_id}/invitations/{invitation_id}")
async def revoke_invitation(
    project_id: UUID,
    invitation_id: UUID,
    member: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.project_id == project_id,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Can only revoke pending invitations")

    invitation.status = InvitationStatus.REVOKED.value
    await db.commit()
    return {"message": "Invitation revoked"}


@router.get("/invitations/validate")
async def validate_invitation(token: str, db: AsyncSession = Depends(get_db)):
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


@router.post("/invitations/accept")
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
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

    if current_user.email.lower() != invitation.email.lower():
        raise HTTPException(status_code=400, detail="This invitation was sent to a different email address")

    existing_member = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == invitation.project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    if existing_member.scalar_one_or_none():
        invitation.status = InvitationStatus.ACCEPTED.value
        invitation.accepted_at = utcnow()
        await db.commit()
        return {"message": "Already a member of this project", "projectId": str(invitation.project_id)}

    member = ProjectMember(
        project_id=invitation.project_id,
        user_id=current_user.id,
        role=invitation.role,
    )
    db.add(member)
    invitation.status = InvitationStatus.ACCEPTED.value
    invitation.accepted_at = utcnow()
    await db.commit()
    return {"message": "Invitation accepted", "projectId": str(invitation.project_id)}
