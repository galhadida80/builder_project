from __future__ import annotations

from datetime import timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, check_permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.audit import AuditAction
from app.models.contact import Contact
from app.models.equipment import ApprovalStatus, Equipment
from app.models.material import Material
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.approval import ApprovalRequestResponse, ApprovalStepResponse, PendingReminderResponse
from app.services.audit_service import create_audit_log
from app.services.notification_service import notify_contact, notify_user
from app.utils.localization import get_language_from_request, translate_message
from app.utils import utcnow

router = APIRouter()


class ApprovalAction(BaseModel):
    action: str
    comments: Optional[str] = None


class ApprovalComments(BaseModel):
    comments: Optional[str] = None


async def verify_contact_assignment(
    step: ApprovalStep, current_user: User, db: AsyncSession, request: Request = None
):
    if current_user.is_super_admin:
        return
    if not step.contact_id:
        return
    result = await db.execute(
        select(Contact).where(Contact.id == step.contact_id)
    )
    contact = result.scalar_one_or_none()
    if not contact or not contact.user_id:
        return
    if contact.user_id != current_user.id:
        language = get_language_from_request(request) if request else "en"
        error_message = translate_message("not_assigned_approver", language)
        raise HTTPException(status_code=403, detail=error_message)


@router.get("/approvals", response_model=list[ApprovalRequestResponse])
async def list_all_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.project_id.in_(accessible_projects))
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/approvals", response_model=list[ApprovalRequestResponse])
async def list_approvals(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.project_id == project_id)
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/approvals/pending-reminders", response_model=list[PendingReminderResponse])
async def get_pending_reminders(
    project_id: UUID,
    days: int = Query(3, ge=1, le=30, description="Minimum days pending to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    cutoff = utcnow() - timedelta(days=days)
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(
            ApprovalRequest.project_id == project_id,
            ApprovalRequest.current_status.in_([
                ApprovalStatus.SUBMITTED.value,
                ApprovalStatus.UNDER_REVIEW.value
            ]),
            ApprovalRequest.created_at <= cutoff
        )
        .order_by(ApprovalRequest.created_at.asc())
    )
    approvals = result.scalars().all()
    now = utcnow()
    return [
        PendingReminderResponse(
            id=approval.id,
            project_id=approval.project_id,
            entity_type=approval.entity_type,
            entity_id=approval.entity_id,
            current_status=approval.current_status,
            created_at=approval.created_at,
            days_pending=(now - approval.created_at).days,
            created_by=approval.created_by,
            steps=approval.steps
        )
        for approval in approvals
    ]


@router.get("/projects/{project_id}/approvals/{approval_id}", response_model=ApprovalRequestResponse)
async def get_approval(
    project_id: UUID,
    approval_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.id == approval_id, ApprovalRequest.project_id == project_id)
    )
    approval = result.scalar_one_or_none()
    if not approval:
        language = get_language_from_request(request)
        error_message = translate_message('resources.approval_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return approval


@router.post("/projects/{project_id}/approvals/{approval_id}/steps/{step_id}/action", response_model=ApprovalStepResponse)
async def process_approval_step(
    project_id: UUID,
    approval_id: UUID,
    step_id: UUID,
    data: ApprovalAction,
    member: ProjectMember = require_permission(Permission.APPROVE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(ApprovalStep)
        .options(selectinload(ApprovalStep.approval_request))
        .where(ApprovalStep.id == step_id)
    )
    step = result.scalar_one_or_none()
    if not step:
        language = get_language_from_request(request)
        error_message = translate_message('resources.resource_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    approval_request = step.approval_request
    if not approval_request or approval_request.id != approval_id or approval_request.project_id != project_id:
        raise HTTPException(status_code=404, detail="Approval step not found in this project")

    if step.status != "pending":
        language = get_language_from_request(request)
        error_message = translate_message('validation.validation_error', language)
        raise HTTPException(status_code=400, detail=error_message)

    await verify_contact_assignment(step, current_user, db, request)

    if data.action == "approve":
        step.status = "approved"
        step.approved_by_id = current_user.id
        step.approved_at = utcnow()
        step.comments = data.comments

        next_step_result = await db.execute(
            select(ApprovalStep)
            .where(
                ApprovalStep.approval_request_id == approval_id,
                ApprovalStep.step_order == step.step_order + 1
            )
        )
        next_step = next_step_result.scalar_one_or_none()

        if next_step:
            approval_request.current_step = next_step.step_order
            approval_request.current_status = ApprovalStatus.UNDER_REVIEW.value
            if next_step.contact_id:
                contact_result = await db.execute(select(Contact).where(Contact.id == next_step.contact_id))
                next_contact = contact_result.scalar_one_or_none()
                if next_contact:
                    await notify_contact(
                        db, next_contact, "approval",
                        f"{approval_request.entity_type.title()} ready for your review",
                        f"A {approval_request.entity_type} approval is ready for your review.",
                        entity_type=approval_request.entity_type, entity_id=approval_request.entity_id,
                        project_id=project_id,
                    )
        else:
            approval_request.current_status = ApprovalStatus.APPROVED.value
            await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.APPROVED.value)
            await notify_approval_creator(
                db, approval_request, project_id,
                f"Your {approval_request.entity_type} has been approved",
                f"Your {approval_request.entity_type} submission has been fully approved.",
            )

    elif data.action == "reject":
        step.status = "rejected"
        step.approved_by_id = current_user.id
        step.approved_at = utcnow()
        step.comments = data.comments
        approval_request.current_status = ApprovalStatus.REJECTED.value
        await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.REJECTED.value)
        comment_text = f" Comments: {data.comments}" if data.comments else ""
        await notify_approval_creator(
            db, approval_request, project_id,
            f"Your {approval_request.entity_type} has been rejected",
            f"Your {approval_request.entity_type} submission has been rejected.{comment_text}",
        )

    elif data.action == "revision":
        step.status = "revision_requested"
        step.approved_by_id = current_user.id
        step.approved_at = utcnow()
        step.comments = data.comments
        approval_request.current_status = ApprovalStatus.REVISION_REQUESTED.value
        await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.REVISION_REQUESTED.value)
        comment_text = f" Comments: {data.comments}" if data.comments else ""
        await notify_approval_creator(
            db, approval_request, project_id,
            f"Revisions requested for your {approval_request.entity_type}",
            f"Revisions have been requested for your {approval_request.entity_type} submission.{comment_text}",
        )

    else:
        language = get_language_from_request(request)
        error_message = translate_message('validation.invalid_input', language)
        raise HTTPException(status_code=400, detail=error_message)

    await create_audit_log(
        db, current_user, "approval_step", step.id, AuditAction.STATUS_CHANGE,
        project_id=project_id,
        old_values={"status": "pending"},
        new_values={"status": step.status, "action": data.action, "comments": data.comments}
    )

    await db.commit()
    await db.refresh(step, ["approved_by"])
    return step


async def notify_approval_creator(
    db: AsyncSession, approval_request: ApprovalRequest, project_id: UUID, title: str, message: str
) -> None:
    if not approval_request.created_by_id:
        return
    result = await db.execute(select(User).where(User.id == approval_request.created_by_id))
    creator = result.scalar_one_or_none()
    if creator:
        await notify_user(
            db, creator.id, "approval", title, message,
            entity_type=approval_request.entity_type, entity_id=approval_request.entity_id,
            email=creator.email, language=creator.language or "en",
            project_id=project_id,
        )


async def update_entity_status(db: AsyncSession, entity_type: str, entity_id: UUID, status: str):
    if entity_type == "equipment":
        result = await db.execute(select(Equipment).where(Equipment.id == entity_id))
        entity = result.scalar_one_or_none()
    elif entity_type == "material":
        result = await db.execute(select(Material).where(Material.id == entity_id))
        entity = result.scalar_one_or_none()
    else:
        return

    if entity:
        entity.status = status


@router.post("/approvals/{approval_id}/approve", response_model=ApprovalRequestResponse)
async def approve_request(
    approval_id: UUID,
    data: ApprovalComments = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.id == approval_id)
    )
    approval_request = result.scalar_one_or_none()
    if not approval_request:
        language = get_language_from_request(request)
        error_message = translate_message('resources.approval_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await verify_project_access(approval_request.project_id, current_user, db)
    await check_permission(Permission.APPROVE, approval_request.project_id, current_user.id, db)

    pending_step_result = await db.execute(
        select(ApprovalStep)
        .where(
            ApprovalStep.approval_request_id == approval_id,
            ApprovalStep.status == "pending"
        )
        .order_by(ApprovalStep.step_order)
        .limit(1)
    )
    step = pending_step_result.scalar_one_or_none()
    if not step:
        language = get_language_from_request(request)
        raise HTTPException(status_code=400, detail="No pending steps")

    await verify_contact_assignment(step, current_user, db, request)

    step.status = "approved"
    step.approved_by_id = current_user.id
    step.approved_at = utcnow()
    if data:
        step.comments = data.comments

    next_step_result = await db.execute(
        select(ApprovalStep)
        .where(
            ApprovalStep.approval_request_id == approval_id,
            ApprovalStep.step_order == step.step_order + 1
        )
    )
    next_step = next_step_result.scalar_one_or_none()

    if next_step:
        approval_request.current_step = next_step.step_order
        approval_request.current_status = ApprovalStatus.UNDER_REVIEW.value
        if next_step.contact_id:
            contact_result = await db.execute(select(Contact).where(Contact.id == next_step.contact_id))
            next_contact = contact_result.scalar_one_or_none()
            if next_contact:
                await notify_contact(
                    db, next_contact, "approval",
                    f"{approval_request.entity_type.title()} ready for your review",
                    f"A {approval_request.entity_type} approval is ready for your review.",
                    entity_type=approval_request.entity_type, entity_id=approval_request.entity_id,
                    project_id=approval_request.project_id,
                )
    else:
        approval_request.current_status = ApprovalStatus.APPROVED.value
        await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.APPROVED.value)
        await notify_approval_creator(
            db, approval_request, approval_request.project_id,
            f"Your {approval_request.entity_type} has been approved",
            f"Your {approval_request.entity_type} submission has been fully approved.",
        )

    await db.commit()
    await db.refresh(approval_request, ["created_by", "steps"])
    return approval_request


@router.post("/approvals/{approval_id}/reject", response_model=ApprovalRequestResponse)
async def reject_request(
    approval_id: UUID,
    data: ApprovalComments = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.id == approval_id)
    )
    approval_request = result.scalar_one_or_none()
    if not approval_request:
        language = get_language_from_request(request)
        error_message = translate_message('resources.approval_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await verify_project_access(approval_request.project_id, current_user, db)
    await check_permission(Permission.APPROVE, approval_request.project_id, current_user.id, db)

    pending_step_result = await db.execute(
        select(ApprovalStep)
        .where(
            ApprovalStep.approval_request_id == approval_id,
            ApprovalStep.status == "pending"
        )
        .order_by(ApprovalStep.step_order)
        .limit(1)
    )
    step = pending_step_result.scalar_one_or_none()
    if not step:
        language = get_language_from_request(request)
        raise HTTPException(status_code=400, detail="No pending steps")

    await verify_contact_assignment(step, current_user, db, request)

    step.status = "rejected"
    step.approved_by_id = current_user.id
    step.approved_at = utcnow()
    if data:
        step.comments = data.comments
    approval_request.current_status = ApprovalStatus.REJECTED.value
    await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.REJECTED.value)
    comment_text = f" Comments: {data.comments}" if data and data.comments else ""
    await notify_approval_creator(
        db, approval_request, approval_request.project_id,
        f"Your {approval_request.entity_type} has been rejected",
        f"Your {approval_request.entity_type} submission has been rejected.{comment_text}",
    )

    await db.commit()
    await db.refresh(approval_request, ["created_by", "steps"])
    return approval_request


@router.get("/my-approvals", response_model=list[ApprovalRequestResponse])
async def list_my_pending_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )

    my_contact_ids = select(Contact.id).where(Contact.user_id == current_user.id)

    query = (
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .join(ApprovalStep)
        .where(
            ApprovalRequest.project_id.in_(accessible_projects),
            ApprovalStep.status == "pending",
            ApprovalRequest.current_status.in_([ApprovalStatus.SUBMITTED.value, ApprovalStatus.UNDER_REVIEW.value]),
        )
    )

    if not current_user.is_super_admin:
        query = query.where(
            or_(
                ApprovalStep.contact_id.is_(None),
                ApprovalStep.contact_id.in_(my_contact_ids),
            )
        )

    result = await db.execute(query.order_by(ApprovalRequest.created_at.desc()))
    return result.scalars().unique().all()
