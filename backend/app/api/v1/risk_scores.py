from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.area import ConstructionArea
from app.models.audit import AuditAction
from app.models.project import Project, ProjectMember
from app.models.risk_score import RiskScore
from app.models.user import User
from app.schemas.risk_score import (
    AreaBrief,
    RiskScoreCreate,
    RiskScoreResponse,
    RiskScoreSummaryResponse,
    RiskScoreUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.utils import utcnow

router = APIRouter()

RISK_SCORE_LOAD_OPTIONS = [
    selectinload(RiskScore.area),
    selectinload(RiskScore.calculated_by),
]


@router.get("/projects/{project_id}/risk-scores", response_model=list[RiskScoreResponse])
async def list_risk_scores(
    project_id: UUID,
    area_id: Optional[UUID] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all risk scores for a project"""
    await verify_project_access(project_id, current_user, db)

    query = (
        select(RiskScore)
        .options(*RISK_SCORE_LOAD_OPTIONS)
        .where(RiskScore.project_id == project_id)
        .order_by(RiskScore.risk_score.desc(), RiskScore.calculated_at.desc())
    )

    if area_id:
        query = query.where(RiskScore.area_id == area_id)
    if risk_level:
        query = query.where(RiskScore.risk_level == risk_level)

    result = await db.execute(query)
    risk_scores = result.scalars().all()

    return list(risk_scores)


@router.get("/projects/{project_id}/risk-scores/summary", response_model=RiskScoreSummaryResponse)
async def get_risk_scores_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get risk score summary statistics for a project"""
    await verify_project_access(project_id, current_user, db)

    stats_query = select(
        func.count().label("total_areas"),
        func.sum(case((RiskScore.risk_level == "low", 1), else_=0)).label("low_risk_count"),
        func.sum(case((RiskScore.risk_level == "medium", 1), else_=0)).label("medium_risk_count"),
        func.sum(case((RiskScore.risk_level == "high", 1), else_=0)).label("high_risk_count"),
        func.sum(case((RiskScore.risk_level == "critical", 1), else_=0)).label("critical_risk_count"),
        func.avg(RiskScore.risk_score).label("average_risk_score"),
    ).where(RiskScore.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.first()

    highest_risk_query = (
        select(RiskScore)
        .options(selectinload(RiskScore.area))
        .where(RiskScore.project_id == project_id)
        .order_by(RiskScore.risk_score.desc())
        .limit(1)
    )
    highest_result = await db.execute(highest_risk_query)
    highest_risk = highest_result.scalar_one_or_none()

    highest_risk_area = None
    if highest_risk and highest_risk.area:
        highest_risk_area = AreaBrief(
            id=highest_risk.area.id,
            name=highest_risk.area.name,
            area_code=highest_risk.area.area_code,
            floor_number=highest_risk.area.floor_number,
        )

    floor_query = (
        select(
            ConstructionArea.floor_number,
            func.count().label("count")
        )
        .join(RiskScore, RiskScore.area_id == ConstructionArea.id)
        .where(RiskScore.project_id == project_id)
        .group_by(ConstructionArea.floor_number)
    )
    floor_result = await db.execute(floor_query)
    by_floor = {str(row.floor_number or "unknown"): row.count for row in floor_result.all()}

    return RiskScoreSummaryResponse(
        total_areas=stats.total_areas or 0,
        low_risk_count=stats.low_risk_count or 0,
        medium_risk_count=stats.medium_risk_count or 0,
        high_risk_count=stats.high_risk_count or 0,
        critical_risk_count=stats.critical_risk_count or 0,
        average_risk_score=stats.average_risk_score or 0,
        highest_risk_area=highest_risk_area,
        by_floor=by_floor,
    )


@router.get("/projects/{project_id}/risk-scores/{risk_score_id}", response_model=RiskScoreResponse)
async def get_risk_score(
    project_id: UUID,
    risk_score_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific risk score by ID"""
    await verify_project_access(project_id, current_user, db)

    query = (
        select(RiskScore)
        .options(*RISK_SCORE_LOAD_OPTIONS)
        .where(RiskScore.id == risk_score_id, RiskScore.project_id == project_id)
    )
    result = await db.execute(query)
    risk_score = result.scalar_one_or_none()

    if not risk_score:
        raise HTTPException(status_code=404, detail="Risk score not found")

    return risk_score


@router.post(
    "/projects/{project_id}/risk-scores",
    response_model=RiskScoreResponse,
)
async def create_risk_score(
    project_id: UUID,
    data: RiskScoreCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new risk score for a project"""
    await verify_project_access(project_id, current_user, db)

    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.area_id:
        area = await db.get(ConstructionArea, data.area_id)
        if not area or area.project_id != project_id:
            raise HTTPException(status_code=404, detail="Area not found in this project")

    risk_score = RiskScore(
        project_id=project_id,
        area_id=data.area_id,
        risk_score=data.risk_score,
        risk_level=data.risk_level,
        defect_count=data.defect_count,
        severity_score=data.severity_score,
        predicted_defect_types=data.predicted_defect_types,
        contributing_factors=data.contributing_factors,
        calculation_metadata=data.calculation_metadata,
        notes=data.notes,
        calculated_at=utcnow(),
        valid_until=data.valid_until,
        calculated_by_id=data.calculated_by_id or current_user.id,
    )

    db.add(risk_score)
    await db.commit()
    await db.refresh(risk_score)

    query = select(RiskScore).options(*RISK_SCORE_LOAD_OPTIONS).where(RiskScore.id == risk_score.id)
    result = await db.execute(query)
    risk_score = result.scalar_one()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        resource_type="risk_score",
        resource_id=risk_score.id,
        project_id=project_id,
        changes={"created": get_model_dict(risk_score)},
    )

    return risk_score


@router.put(
    "/projects/{project_id}/risk-scores/{risk_score_id}",
    response_model=RiskScoreResponse,
)
async def update_risk_score(
    project_id: UUID,
    risk_score_id: UUID,
    data: RiskScoreUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing risk score"""
    await verify_project_access(project_id, current_user, db)

    query = select(RiskScore).where(RiskScore.id == risk_score_id, RiskScore.project_id == project_id)
    result = await db.execute(query)
    risk_score = result.scalar_one_or_none()

    if not risk_score:
        raise HTTPException(status_code=404, detail="Risk score not found")

    old_data = get_model_dict(risk_score)

    if data.area_id is not None:
        area = await db.get(ConstructionArea, data.area_id)
        if not area or area.project_id != project_id:
            raise HTTPException(status_code=404, detail="Area not found in this project")
        risk_score.area_id = data.area_id

    if data.risk_score is not None:
        risk_score.risk_score = data.risk_score
    if data.risk_level is not None:
        risk_score.risk_level = data.risk_level
    if data.defect_count is not None:
        risk_score.defect_count = data.defect_count
    if data.severity_score is not None:
        risk_score.severity_score = data.severity_score
    if data.predicted_defect_types is not None:
        risk_score.predicted_defect_types = data.predicted_defect_types
    if data.contributing_factors is not None:
        risk_score.contributing_factors = data.contributing_factors
    if data.calculation_metadata is not None:
        risk_score.calculation_metadata = data.calculation_metadata
    if data.notes is not None:
        risk_score.notes = data.notes
    if data.valid_until is not None:
        risk_score.valid_until = data.valid_until

    risk_score.updated_at = utcnow()

    await db.commit()
    await db.refresh(risk_score)

    query = select(RiskScore).options(*RISK_SCORE_LOAD_OPTIONS).where(RiskScore.id == risk_score.id)
    result = await db.execute(query)
    risk_score = result.scalar_one()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type="risk_score",
        resource_id=risk_score.id,
        project_id=project_id,
        changes={"old": old_data, "new": get_model_dict(risk_score)},
    )

    return risk_score


@router.delete(
    "/projects/{project_id}/risk-scores/{risk_score_id}",
)
async def delete_risk_score(
    project_id: UUID,
    risk_score_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a risk score"""
    await verify_project_access(project_id, current_user, db)

    query = select(RiskScore).where(RiskScore.id == risk_score_id, RiskScore.project_id == project_id)
    result = await db.execute(query)
    risk_score = result.scalar_one_or_none()

    if not risk_score:
        raise HTTPException(status_code=404, detail="Risk score not found")

    old_data = get_model_dict(risk_score)

    await db.delete(risk_score)
    await db.commit()

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        resource_type="risk_score",
        resource_id=risk_score_id,
        project_id=project_id,
        changes={"deleted": old_data},
    )

    return {"message": "Risk score deleted successfully"}
