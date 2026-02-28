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
from app.models.inspection import Inspection, InspectionStatus
from app.models.project import Project, ProjectMember
from app.models.risk_score import RiskScore
from app.models.risk_threshold import RiskThreshold
from app.models.user import User
from app.schemas.risk_score import (
    AreaBrief,
    DefectTrendAnalysisResponse,
    RiskScoreCreate,
    RiskScoreResponse,
    RiskScoreSummaryResponse,
    RiskScoreUpdate,
    RiskThresholdCreate,
    RiskThresholdResponse,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import create_notification
from app.services.risk_prediction_service import analyze_defect_trends, get_inspection_risk_briefing
from app.utils import utcnow

router = APIRouter()

RISK_SCORE_LOAD_OPTIONS = [
    selectinload(RiskScore.area),
    selectinload(RiskScore.calculated_by),
]


async def check_and_schedule_inspection(
    db: AsyncSession,
    project_id: UUID,
    risk_score: RiskScore,
    current_user: User,
) -> None:
    """Check if risk score exceeds threshold and auto-schedule inspection if enabled"""
    query = select(RiskThreshold).where(RiskThreshold.project_id == project_id)
    result = await db.execute(query)
    threshold = result.scalar_one_or_none()

    if not threshold or not threshold.auto_schedule_inspections:
        return

    if not risk_score.area_id:
        return

    threshold_map = {
        "low": threshold.low_threshold,
        "medium": threshold.medium_threshold,
        "high": threshold.high_threshold,
        "critical": threshold.critical_threshold,
    }

    min_score = threshold_map.get(threshold.auto_schedule_threshold, threshold.high_threshold)

    if risk_score.risk_score < min_score:
        return

    existing_query = (
        select(Inspection)
        .where(Inspection.project_id == project_id)
        .where(Inspection.status == InspectionStatus.PENDING.value)
        .where(
            Inspection.notes.ilike(f"%Auto-scheduled for area {risk_score.area_id}%")
        )
    )
    existing_result = await db.execute(existing_query)
    existing_inspection = existing_result.scalar_one_or_none()

    if existing_inspection:
        return

    from datetime import timedelta
    from app.models.inspection_template import InspectionConsultantType

    consultant_query = select(InspectionConsultantType).limit(1)
    consultant_result = await db.execute(consultant_query)
    consultant_type = consultant_result.scalar_one_or_none()

    if not consultant_type:
        return

    inspection = Inspection(
        project_id=project_id,
        consultant_type_id=consultant_type.id,
        scheduled_date=utcnow() + timedelta(days=1),
        status=InspectionStatus.PENDING.value,
        notes=f"Auto-scheduled for area {risk_score.area_id} due to high risk score ({risk_score.risk_score})",
        created_by_id=current_user.id,
    )

    db.add(inspection)
    await db.commit()
    await db.refresh(inspection)

    # Load area information for notification
    if risk_score.area_id:
        area_query = select(ConstructionArea).where(ConstructionArea.id == risk_score.area_id)
        area_result = await db.execute(area_query)
        area = area_result.scalar_one_or_none()
        area_name = area.area_name if area else f"Area {risk_score.area_id}"
    else:
        area_name = "Unknown Area"

    # Notify inspectors/project members about auto-scheduled inspection
    members_query = (
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .where(
            ProjectMember.role.in_([
                "inspector",
                "consultant",
                "project_admin",
                "project_member",
            ])
        )
    )
    members_result = await db.execute(members_query)
    members = members_result.scalars().all()

    for member in members:
        await create_notification(
            db=db,
            user_id=member.user_id,
            category="inspection",
            title="High-Risk Inspection Auto-Scheduled",
            message=f"An inspection has been automatically scheduled for {area_name} due to a high risk score of {risk_score.risk_score}. "
            f"Scheduled date: {inspection.scheduled_date.strftime('%Y-%m-%d')}",
            entity_type="inspection",
            entity_id=inspection.id,
            project_id=project_id,
        )

    await db.commit()


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

    await check_and_schedule_inspection(db, project_id, risk_score, current_user)

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


@router.get("/projects/{project_id}/risk-thresholds", response_model=RiskThresholdResponse)
async def get_risk_threshold(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get risk threshold configuration for a project"""
    await verify_project_access(project_id, current_user, db)

    query = select(RiskThreshold).where(RiskThreshold.project_id == project_id)
    result = await db.execute(query)
    threshold = result.scalar_one_or_none()

    if not threshold:
        raise HTTPException(status_code=404, detail="Risk threshold configuration not found")

    return threshold


@router.post(
    "/projects/{project_id}/risk-thresholds",
    response_model=RiskThresholdResponse,
    status_code=201,
)
async def create_or_update_risk_threshold(
    project_id: UUID,
    data: RiskThresholdCreate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update risk threshold configuration for a project"""
    await verify_project_access(project_id, current_user, db)

    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(RiskThreshold).where(RiskThreshold.project_id == project_id)
    result = await db.execute(query)
    existing_threshold = result.scalar_one_or_none()

    if existing_threshold:
        existing_threshold.low_threshold = data.low_threshold
        existing_threshold.medium_threshold = data.medium_threshold
        existing_threshold.high_threshold = data.high_threshold
        existing_threshold.critical_threshold = data.critical_threshold
        existing_threshold.auto_schedule_inspections = data.auto_schedule_inspections
        existing_threshold.auto_schedule_threshold = data.auto_schedule_threshold
        existing_threshold.updated_at = utcnow()

        await db.commit()
        await db.refresh(existing_threshold)

        await create_audit_log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            resource_type="risk_threshold",
            resource_id=existing_threshold.id,
            project_id=project_id,
            changes={"updated": get_model_dict(existing_threshold)},
        )

        return existing_threshold

    threshold = RiskThreshold(
        project_id=project_id,
        low_threshold=data.low_threshold,
        medium_threshold=data.medium_threshold,
        high_threshold=data.high_threshold,
        critical_threshold=data.critical_threshold,
        auto_schedule_inspections=data.auto_schedule_inspections,
        auto_schedule_threshold=data.auto_schedule_threshold,
        created_by_id=current_user.id,
    )

    db.add(threshold)
    await db.commit()
    await db.refresh(threshold)

    await create_audit_log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        resource_type="risk_threshold",
        resource_id=threshold.id,
        project_id=project_id,
        changes={"created": get_model_dict(threshold)},
    )

    return threshold


@router.get("/inspections/{inspection_id}/risk-briefing")
async def get_inspection_briefing(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pre-inspection risk briefing with high-risk areas and recommendations"""
    inspection_query = select(Inspection).where(Inspection.id == inspection_id)
    inspection_result = await db.execute(inspection_query)
    inspection = inspection_result.scalar_one_or_none()

    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    await verify_project_access(inspection.project_id, current_user, db)

    briefing = await get_inspection_risk_briefing(db, inspection_id)
    return briefing


@router.get("/projects/{project_id}/risk-trends", response_model=DefectTrendAnalysisResponse)
async def get_defect_trends(
    project_id: UUID,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get defect trend analysis by trade, floor, phase, and season"""
    await verify_project_access(project_id, current_user, db)

    from datetime import datetime

    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    trends = await analyze_defect_trends(db, project_id, start_dt, end_dt)
    return trends
