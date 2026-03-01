from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.contact import Contact
from app.models.safety_training import SafetyTraining, TrainingStatus
from app.models.user import User
from app.schemas.safety_training import (
    SafetyTrainingCreate,
    SafetyTrainingResponse,
    SafetyTrainingUpdate,
)
from app.services.audit_service import create_audit_log
from app.services.notification_service import notify_project_admins
from app.utils import utcnow

router = APIRouter()

TRAINING_LOAD_OPTIONS = [
    selectinload(SafetyTraining.worker),
    selectinload(SafetyTraining.created_by),
]


def calculate_training_status(training: SafetyTraining) -> str:
    if not training.expiry_date:
        return TrainingStatus.VALID.value
    now = utcnow()
    days_until_expiry = (training.expiry_date - now).days
    if days_until_expiry < 0:
        return TrainingStatus.EXPIRED.value
    elif days_until_expiry <= 30:
        return TrainingStatus.EXPIRING_SOON.value
    else:
        return TrainingStatus.VALID.value


@router.get("/projects/{project_id}/safety-training", response_model=list[SafetyTrainingResponse])
async def list_safety_trainings(
    project_id: UUID,
    worker_id: Optional[UUID] = Query(None),
    training_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    expiring_soon: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = select(SafetyTraining).where(SafetyTraining.project_id == project_id).options(*TRAINING_LOAD_OPTIONS)
    if worker_id:
        query = query.where(SafetyTraining.worker_id == worker_id)
    if training_type:
        query = query.where(SafetyTraining.training_type == training_type)
    if status:
        query = query.where(SafetyTraining.status == status)
    if expiring_soon:
        query = query.where(SafetyTraining.status == TrainingStatus.EXPIRING_SOON.value)
    query = query.order_by(SafetyTraining.training_date.desc())
    result = await db.execute(query)
    trainings = list(result.scalars().all())
    for training in trainings:
        new_status = calculate_training_status(training)
        if new_status != training.status:
            training.status = new_status
    await db.commit()
    return trainings


@router.post("/projects/{project_id}/safety-training", response_model=SafetyTrainingResponse, status_code=201)
async def create_safety_training(
    project_id: UUID,
    training_data: SafetyTrainingCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker_result = await db.execute(select(Contact).where(Contact.id == training_data.worker_id))
    worker = worker_result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    training = SafetyTraining(
        project_id=project_id,
        worker_id=training_data.worker_id,
        training_type=training_data.training_type,
        training_date=training_data.training_date,
        expiry_date=training_data.expiry_date,
        certificate_number=training_data.certificate_number,
        instructor=training_data.instructor,
        notes=training_data.notes,
        created_by_id=current_user.id,
    )
    training.status = calculate_training_status(training)
    db.add(training)
    await db.flush()
    await db.refresh(training, attribute_names=["worker", "created_by"])
    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        resource_type="SafetyTraining",
        resource_id=training.id,
        project_id=project_id,
        details={
            "training_type": training_data.training_type,
            "worker_id": str(training_data.worker_id),
            "status": training.status,
        },
    )
    if training.status in [TrainingStatus.EXPIRED.value, TrainingStatus.EXPIRING_SOON.value]:
        await notify_project_admins(
            db=db,
            project_id=project_id,
            title=f"Safety Training {training.status.replace('_', ' ').title()}",
            message=f"Training '{training.training_type}' for {worker.contact_name} is {training.status.replace('_', ' ')}",
            notification_type="safety_training_alert",
        )
    await db.commit()
    return training


@router.get("/projects/{project_id}/safety-training/{training_id}", response_model=SafetyTrainingResponse)
async def get_safety_training(
    project_id: UUID,
    training_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(SafetyTraining)
        .where(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id)
        .options(*TRAINING_LOAD_OPTIONS)
    )
    result = await db.execute(query)
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=404, detail="Safety training not found")
    new_status = calculate_training_status(training)
    if new_status != training.status:
        training.status = new_status
        await db.commit()
    return training


@router.put("/projects/{project_id}/safety-training/{training_id}", response_model=SafetyTrainingResponse)
async def update_safety_training(
    project_id: UUID,
    training_id: UUID,
    training_data: SafetyTrainingUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(SafetyTraining)
        .where(SafetyTraining.id == training_id, SafetyTraining.project_id == project_id)
        .options(*TRAINING_LOAD_OPTIONS)
    )
    result = await db.execute(query)
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=404, detail="Safety training not found")
    update_data = training_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(training, field, value)
    if "training_date" in update_data or "expiry_date" in update_data:
        training.status = calculate_training_status(training)
    await db.flush()
    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type="SafetyTraining",
        resource_id=training.id,
        project_id=project_id,
        details={"updated_fields": list(update_data.keys())},
    )
    await db.commit()
    return training


@router.delete("/projects/{project_id}/safety-training/{training_id}", status_code=204)
async def delete_safety_training(
    project_id: UUID,
    training_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(SafetyTraining).where(
        SafetyTraining.id == training_id,
        SafetyTraining.project_id == project_id
    )
    result = await db.execute(query)
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=404, detail="Safety training not found")
    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        resource_type="SafetyTraining",
        resource_id=training.id,
        project_id=project_id,
        details={"training_type": training.training_type},
    )
    await db.delete(training)
    await db.commit()


@router.get("/projects/{project_id}/safety-training/expiring/alerts", response_model=list[SafetyTrainingResponse])
async def get_expiring_trainings(
    project_id: UUID,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    cutoff_date = utcnow() + timedelta(days=days)
    query = (
        select(SafetyTraining)
        .where(
            SafetyTraining.project_id == project_id,
            SafetyTraining.expiry_date.isnot(None),
            SafetyTraining.expiry_date <= cutoff_date,
            SafetyTraining.expiry_date >= utcnow(),
        )
        .options(*TRAINING_LOAD_OPTIONS)
        .order_by(SafetyTraining.expiry_date.asc())
    )
    result = await db.execute(query)
    trainings = list(result.scalars().all())
    for training in trainings:
        new_status = calculate_training_status(training)
        if new_status != training.status:
            training.status = new_status
    await db.commit()
    return trainings


@router.get("/projects/{project_id}/safety-training/summary/statistics")
async def get_training_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    status_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((SafetyTraining.status == TrainingStatus.VALID.value, 1), else_=0)).label("valid_count"),
            func.sum(case((SafetyTraining.status == TrainingStatus.EXPIRED.value, 1), else_=0)).label("expired_count"),
            func.sum(case((SafetyTraining.status == TrainingStatus.EXPIRING_SOON.value, 1), else_=0)).label("expiring_soon_count"),
        )
        .where(SafetyTraining.project_id == project_id)
    )
    row = status_result.first()
    type_result = await db.execute(
        select(SafetyTraining.training_type, func.count().label("count"))
        .where(SafetyTraining.project_id == project_id)
        .group_by(SafetyTraining.training_type)
    )
    by_type = {r.training_type: r.count for r in type_result.all()}
    workers_result = await db.execute(
        select(func.count(func.distinct(SafetyTraining.worker_id)))
        .where(SafetyTraining.project_id == project_id)
    )
    unique_workers = workers_result.scalar() or 0
    return {
        "total": row.total or 0,
        "validCount": row.valid_count or 0,
        "expiredCount": row.expired_count or 0,
        "expiringSoonCount": row.expiring_soon_count or 0,
        "byType": by_type,
        "uniqueWorkers": unique_workers,
    }
