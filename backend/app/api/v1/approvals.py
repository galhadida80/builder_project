from __future__ import annotations
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.db.session import get_db
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.equipment import Equipment, ApprovalStatus
from app.models.material import Material
from app.models.user import User
from app.schemas.approval import ApprovalRequestResponse, ApprovalStepResponse
from app.services.audit_service import create_audit_log
from app.models.audit import AuditAction
from app.core.security import get_current_user
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


class ApprovalAction(BaseModel):
    action: str
    comments: Optional[str] = None


class ApprovalComments(BaseModel):
    comments: Optional[str] = None


@router.get("/approvals", response_model=list[ApprovalRequestResponse])
async def list_all_approvals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/approvals", response_model=list[ApprovalRequestResponse])
async def list_approvals(project_id: UUID, db: AsyncSession = Depends(get_db)):
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


@router.get("/projects/{project_id}/approvals/{approval_id}", response_model=ApprovalRequestResponse)
async def get_approval(project_id: UUID, approval_id: UUID, db: AsyncSession = Depends(get_db), request: Request = None):
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

    if step.status != "pending":
        language = get_language_from_request(request)
        error_message = translate_message('validation.validation_error', language)
        raise HTTPException(status_code=400, detail=error_message)

    approval_request = step.approval_request

    if data.action == "approve":
        step.status = "approved"
        step.approved_by_id = current_user.id
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
        else:
            approval_request.current_status = ApprovalStatus.APPROVED.value
            await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.APPROVED.value)

    elif data.action == "reject":
        step.status = "rejected"
        step.approved_by_id = current_user.id
        step.comments = data.comments
        approval_request.current_status = ApprovalStatus.REJECTED.value
        await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.REJECTED.value)

    elif data.action == "revision":
        step.status = "revision_requested"
        step.approved_by_id = current_user.id
        step.comments = data.comments
        approval_request.current_status = ApprovalStatus.REVISION_REQUESTED.value
        await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.REVISION_REQUESTED.value)

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

    await db.refresh(step, ["approved_by"])
    return step


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

    step.status = "approved"
    step.approved_by_id = current_user.id
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
    else:
        approval_request.current_status = ApprovalStatus.APPROVED.value
        await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.APPROVED.value)

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

    step.status = "rejected"
    step.approved_by_id = current_user.id
    if data:
        step.comments = data.comments
    approval_request.current_status = ApprovalStatus.REJECTED.value
    await update_entity_status(db, approval_request.entity_type, approval_request.entity_id, ApprovalStatus.REJECTED.value)

    await db.commit()
    await db.refresh(approval_request, ["created_by", "steps"])
    return approval_request


@router.get("/my-approvals", response_model=list[ApprovalRequestResponse])
async def list_my_pending_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .join(ApprovalStep)
        .where(
            ApprovalStep.status == "pending",
            ApprovalRequest.current_status.in_([ApprovalStatus.SUBMITTED.value, ApprovalStatus.UNDER_REVIEW.value])
        )
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().unique().all()
