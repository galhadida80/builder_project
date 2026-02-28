"""Safety KPI summary endpoint for aggregated safety metrics across a project."""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.near_miss import NearMiss
from app.models.safety_incident import SafetyIncident
from app.models.safety_training import SafetyTraining, TrainingStatus
from app.models.toolbox_talk import TalkAttendee, TalkStatus, ToolboxTalk
from app.models.user import User
from app.schemas.safety_incident import SafetyKPIResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/projects/{project_id}/safety/kpi", response_model=SafetyKPIResponse)
async def get_safety_kpi_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive safety KPI summary for a project.

    Includes metrics for:
    - Safety incidents (by severity and status)
    - Near misses (by severity, anonymous reporting rate)
    - Safety training compliance (valid/expired/expiring soon)
    - Toolbox talks (completion and attendance rates)
    """
    await verify_project_access(project_id, current_user, db)

    # Get incidents summary
    incidents_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((SafetyIncident.severity == "critical", 1), else_=0)).label("critical"),
            func.sum(case((SafetyIncident.severity == "high", 1), else_=0)).label("high"),
            func.sum(case((SafetyIncident.severity == "medium", 1), else_=0)).label("medium"),
            func.sum(case((SafetyIncident.severity == "low", 1), else_=0)).label("low"),
            func.sum(case((SafetyIncident.status == "open", 1), else_=0)).label("open"),
            func.sum(case((SafetyIncident.status == "investigating", 1), else_=0)).label("investigating"),
            func.sum(case((SafetyIncident.status == "resolved", 1), else_=0)).label("resolved"),
            func.sum(case((SafetyIncident.status == "closed", 1), else_=0)).label("closed"),
        )
        .where(SafetyIncident.project_id == project_id)
    )
    incidents = incidents_result.first()

    # Get near misses summary
    near_misses_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((NearMiss.severity == "high", 1), else_=0)).label("high"),
            func.sum(case((NearMiss.severity == "medium", 1), else_=0)).label("medium"),
            func.sum(case((NearMiss.severity == "low", 1), else_=0)).label("low"),
            func.sum(case((NearMiss.is_anonymous == True, 1), else_=0)).label("anonymous"),
        )
        .where(NearMiss.project_id == project_id)
    )
    near_misses = near_misses_result.first()

    # Get training compliance summary
    training_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((SafetyTraining.status == TrainingStatus.VALID.value, 1), else_=0)).label("valid"),
            func.sum(case((SafetyTraining.status == TrainingStatus.EXPIRED.value, 1), else_=0)).label("expired"),
            func.sum(case((SafetyTraining.status == TrainingStatus.EXPIRING_SOON.value, 1), else_=0)).label("expiring_soon"),
        )
        .where(SafetyTraining.project_id == project_id)
    )
    training = training_result.first()

    # Get unique workers count
    workers_result = await db.execute(
        select(func.count(func.distinct(SafetyTraining.worker_id)))
        .where(SafetyTraining.project_id == project_id)
    )
    unique_workers = workers_result.scalar() or 0

    # Get toolbox talks summary
    talks_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((ToolboxTalk.status == TalkStatus.COMPLETED.value, 1), else_=0)).label("completed"),
        )
        .where(ToolboxTalk.project_id == project_id)
    )
    talks = talks_result.first()

    # Get toolbox talks attendance
    attendance_result = await db.execute(
        select(
            func.count().label("total_attendees"),
            func.sum(case((TalkAttendee.attended == True, 1), else_=0)).label("total_attended"),
        )
        .join(ToolboxTalk, TalkAttendee.talk_id == ToolboxTalk.id)
        .where(ToolboxTalk.project_id == project_id)
    )
    attendance = attendance_result.first()

    return SafetyKPIResponse(
        # Incidents
        total_incidents=incidents.total or 0,
        incidents_by_severity={
            "critical": incidents.critical or 0,
            "high": incidents.high or 0,
            "medium": incidents.medium or 0,
            "low": incidents.low or 0,
        },
        incidents_by_status={
            "open": incidents.open or 0,
            "investigating": incidents.investigating or 0,
            "resolved": incidents.resolved or 0,
            "closed": incidents.closed or 0,
        },
        # Near Misses
        total_near_misses=near_misses.total or 0,
        near_misses_by_severity={
            "high": near_misses.high or 0,
            "medium": near_misses.medium or 0,
            "low": near_misses.low or 0,
        },
        anonymous_near_misses=near_misses.anonymous or 0,
        # Training
        total_trainings=training.total or 0,
        valid_trainings=training.valid or 0,
        expired_trainings=training.expired or 0,
        expiring_soon_trainings=training.expiring_soon or 0,
        unique_trained_workers=unique_workers,
        # Toolbox Talks
        total_toolbox_talks=talks.total or 0,
        completed_toolbox_talks=talks.completed or 0,
        total_talk_attendees=attendance.total_attendees or 0,
        total_attended=attendance.total_attended or 0,
    )
