import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.schedule_risk import ScheduleRiskAnalysis
from app.models.task import Task
from app.models.user import User
from app.schemas.schedule_risk import (
    CriticalPathResponse,
    CriticalPathTask,
    ProjectRiskSummary,
    ScheduleRiskResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
)
from app.services.schedule_risk_service import (
    calculate_confidence_score,
    calculate_critical_path,
    calculate_historical_variance,
    generate_mitigation_suggestions,
    simulate_scenario,
)
from app.utils import utcnow

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/projects/{project_id}/schedule-risk", response_model=ProjectRiskSummary)
async def get_project_schedule_risk(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overall schedule risk summary for a project"""
    await verify_project_access(project_id, current_user, db)

    # Get total task count
    task_count_result = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id)
    )
    total_tasks = task_count_result.scalar() or 0

    # Calculate critical path
    critical_path_data = await calculate_critical_path(db, project_id)
    critical_path_length = len(critical_path_data.get("task_ids", []))

    # Calculate confidence score
    confidence_data = await calculate_confidence_score(db, project_id)
    overall_confidence = confidence_data.get("confidence_score", 0.0)

    # Get or create risk analysis records for at-risk tasks
    # First, check for existing recent analyses (within last 24 hours)
    recent_analyses_result = await db.execute(
        select(ScheduleRiskAnalysis)
        .where(
            ScheduleRiskAnalysis.project_id == project_id,
            ScheduleRiskAnalysis.analyzed_at >= utcnow() - __import__("datetime").timedelta(hours=24),
        )
        .order_by(ScheduleRiskAnalysis.confidence_score.asc())
        .limit(10)
    )
    recent_analyses = recent_analyses_result.scalars().all()

    # Count at-risk tasks (confidence < 0.7 or risk_level high/critical)
    at_risk_count = 0
    for analysis in recent_analyses:
        if analysis.confidence_score < 0.7 or analysis.risk_level in ["high", "critical"]:
            at_risk_count += 1

    # Get last analyzed timestamp
    last_analyzed_result = await db.execute(
        select(func.max(ScheduleRiskAnalysis.analyzed_at))
        .where(ScheduleRiskAnalysis.project_id == project_id)
    )
    last_analyzed_at = last_analyzed_result.scalar()

    return ProjectRiskSummary(
        project_id=project_id,
        overall_confidence_score=overall_confidence,
        total_tasks=total_tasks,
        at_risk_tasks=at_risk_count,
        critical_path_length=critical_path_length,
        last_analyzed_at=last_analyzed_at,
        top_risks=[ScheduleRiskResponse.model_validate(analysis) for analysis in recent_analyses[:5]],
    )


@router.get("/projects/{project_id}/tasks/{task_id}/risk", response_model=ScheduleRiskResponse)
async def get_task_schedule_risk(
    project_id: UUID,
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get schedule risk analysis for a specific task"""
    await verify_project_access(project_id, current_user, db)

    # Verify task belongs to project
    task_result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Look for existing analysis (within last 24 hours)
    analysis_result = await db.execute(
        select(ScheduleRiskAnalysis)
        .where(
            ScheduleRiskAnalysis.task_id == task_id,
            ScheduleRiskAnalysis.analyzed_at >= utcnow() - __import__("datetime").timedelta(hours=24),
        )
        .order_by(ScheduleRiskAnalysis.analyzed_at.desc())
    )
    existing_analysis = analysis_result.scalar_one_or_none()

    if existing_analysis:
        return ScheduleRiskResponse.model_validate(existing_analysis)

    # Generate new analysis
    try:
        # Get historical variance data
        variance_data = await calculate_historical_variance(db, project_id)

        # Get critical path to see if task is on it
        critical_path_data = await calculate_critical_path(db, project_id)
        is_on_critical_path = task_id in critical_path_data.get("task_ids", [])

        # Calculate confidence score
        confidence_data = await calculate_confidence_score(db, project_id)

        # Determine risk level based on confidence and critical path
        confidence_score = confidence_data.get("confidence_score", 0.8)
        if is_on_critical_path and confidence_score < 0.5:
            risk_level = "critical"
        elif is_on_critical_path or confidence_score < 0.5:
            risk_level = "high"
        elif confidence_score < 0.7:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Estimate delay based on historical variance
        avg_delay_factor = variance_data.get("avg_delay_factor", 1.0)
        estimated_hours = task.estimated_hours or 8.0
        predicted_delay_days = (estimated_hours / 8.0) * max(0, avg_delay_factor - 1.0)

        # Generate mitigation suggestions
        mitigation_data = generate_mitigation_suggestions(
            critical_path_data, variance_data, confidence_data
        )

        # Create new analysis record
        new_analysis = ScheduleRiskAnalysis(
            project_id=project_id,
            task_id=task_id,
            confidence_score=confidence_score,
            predicted_delay_days=predicted_delay_days if predicted_delay_days > 0 else None,
            risk_level=risk_level,
            factors={
                "is_on_critical_path": is_on_critical_path,
                "historical_delay_factor": avg_delay_factor,
                "sample_size": variance_data.get("total_completed_tasks", 0),
            },
            mitigation_suggestions={"suggestions": mitigation_data} if mitigation_data else None,
            analyzed_at=utcnow(),
        )

        db.add(new_analysis)
        await db.flush()

        return ScheduleRiskResponse.model_validate(new_analysis)

    except Exception as e:
        logger.exception(f"Failed to generate risk analysis for task {task_id}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")


@router.get("/projects/{project_id}/critical-path", response_model=CriticalPathResponse)
async def get_project_critical_path(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get critical path analysis for a project"""
    await verify_project_access(project_id, current_user, db)

    # Calculate critical path
    critical_path_data = await calculate_critical_path(db, project_id)

    # Convert task data to response format
    critical_tasks = []
    for task_info in critical_path_data.get("critical_tasks", []):
        critical_tasks.append(
            CriticalPathTask(
                task_id=task_info["task_id"],
                task_title=task_info["title"],
                start_date=task_info.get("start_date"),
                due_date=task_info.get("due_date"),
                duration_days=task_info["duration"],
                slack_days=task_info.get("slack", 0.0),
            )
        )

    # Calculate project dates from critical path
    project_start_date = None
    project_end_date = None
    if critical_tasks:
        start_dates = [t.start_date for t in critical_tasks if t.start_date]
        end_dates = [t.due_date for t in critical_tasks if t.due_date]
        if start_dates:
            project_start_date = min(start_dates)
        if end_dates:
            project_end_date = max(end_dates)

    return CriticalPathResponse(
        project_id=project_id,
        critical_path_tasks=critical_tasks,
        total_duration_days=critical_path_data.get("total_duration", 0.0),
        project_start_date=project_start_date,
        project_end_date=project_end_date,
    )


@router.post("/projects/{project_id}/schedule-risk/what-if", response_model=WhatIfScenarioResponse)
async def run_what_if_scenario(
    project_id: UUID,
    scenario: WhatIfScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run a what-if scenario to see impact of task delays"""
    await verify_project_access(project_id, current_user, db)

    # Verify task belongs to project
    task_result = await db.execute(
        select(Task).where(Task.id == scenario.task_id, Task.project_id == project_id)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        # Run scenario simulation
        scenario_result = await simulate_scenario(
            db=db,
            project_id=project_id,
            scenario_type="delay",
            affected_task_ids=[scenario.task_id],
            delay_days=scenario.delay_days,
        )

        # Parse results and build response
        from app.schemas.schedule_risk import AffectedTask

        affected_tasks = []
        for affected in scenario_result.get("affected_tasks", []):
            affected_tasks.append(
                AffectedTask(
                    task_id=affected["task_id"],
                    task_title=affected["title"],
                    original_due_date=affected.get("original_due_date"),
                    new_due_date=affected.get("new_due_date"),
                    delay_impact_days=affected.get("delay_days", 0.0),
                )
            )

        return WhatIfScenarioResponse(
            scenario_task_id=scenario.task_id,
            scenario_delay_days=scenario.delay_days,
            affected_tasks=affected_tasks,
            original_project_end_date=scenario_result.get("baseline", {}).get("end_date"),
            new_project_end_date=scenario_result.get("scenario", {}).get("end_date"),
            total_project_delay_days=scenario_result.get("scenario", {}).get("delay_days", 0.0),
        )

    except Exception as e:
        logger.exception(f"Failed to run what-if scenario for task {scenario.task_id}")
        raise HTTPException(status_code=500, detail=f"Scenario simulation failed: {str(e)}")
