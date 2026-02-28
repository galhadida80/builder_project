from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.budget import BudgetLineItem
from app.models.time_entry import TimeEntry
from app.models.timesheet import Timesheet
from app.models.user import User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryResponse
from app.schemas.timesheet import TimesheetCreate, TimesheetLinkBudgetRequest, TimesheetResponse
from app.services.time_tracking_service import (
    clock_in,
    clock_out,
    get_active_time_entry,
    get_time_entries_for_period,
)
from app.services.timesheet_service import (
    approve_timesheet,
    generate_timesheet,
    reject_timesheet,
    submit_for_approval,
)

router = APIRouter()


@router.post("/projects/{project_id}/time-entries/clock-in", response_model=TimeEntryResponse)
async def clock_in_endpoint(
    project_id: UUID,
    data: TimeEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clock in a worker to a project with GPS location tracking."""
    await verify_project_access(project_id, current_user, db)

    try:
        time_entry = await clock_in(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            location_lat=data.location_lat,
            location_lng=data.location_lng,
            task_id=data.task_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.refresh(time_entry, ["user"])
    return TimeEntryResponse.from_orm_with_total_hours(time_entry)


@router.post("/projects/{project_id}/time-entries/clock-out", response_model=TimeEntryResponse)
async def clock_out_endpoint(
    project_id: UUID,
    break_minutes: Optional[int] = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clock out a worker from a project."""
    await verify_project_access(project_id, current_user, db)

    try:
        time_entry = await clock_out(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            break_minutes=break_minutes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.refresh(time_entry, ["user"])
    return TimeEntryResponse.from_orm_with_total_hours(time_entry)


@router.get("/projects/{project_id}/time-entries", response_model=list[TimeEntryResponse])
async def list_time_entries(
    project_id: UUID,
    user_id: Optional[UUID] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List time entries for a project with optional filters."""
    await verify_project_access(project_id, current_user, db)

    query = (
        select(TimeEntry)
        .options(selectinload(TimeEntry.user))
        .where(TimeEntry.project_id == project_id)
    )

    if user_id:
        query = query.where(TimeEntry.user_id == user_id)

    if date_from:
        query = query.where(TimeEntry.clock_in_time >= date_from)

    if date_to:
        query = query.where(TimeEntry.clock_in_time <= date_to)

    query = query.order_by(TimeEntry.clock_in_time.desc())

    result = await db.execute(query)
    entries = result.scalars().all()

    return [TimeEntryResponse.from_orm_with_total_hours(entry) for entry in entries]


@router.get("/projects/{project_id}/time-entries/active", response_model=TimeEntryResponse)
async def get_active_entry(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the active time entry for the current user in a project."""
    await verify_project_access(project_id, current_user, db)

    time_entry = await get_active_time_entry(db, current_user.id, project_id)
    if not time_entry:
        raise HTTPException(status_code=404, detail="No active time entry found")

    await db.refresh(time_entry, ["user"])
    return TimeEntryResponse.from_orm_with_total_hours(time_entry)


@router.get("/projects/{project_id}/timesheets", response_model=list[TimesheetResponse])
async def list_timesheets(
    project_id: UUID,
    user_id: Optional[UUID] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List timesheets for a project with optional filters."""
    await verify_project_access(project_id, current_user, db)

    query = (
        select(Timesheet)
        .options(
            selectinload(Timesheet.user),
            selectinload(Timesheet.approved_by),
        )
        .where(Timesheet.project_id == project_id)
    )

    if user_id:
        query = query.where(Timesheet.user_id == user_id)

    if status:
        query = query.where(Timesheet.status == status)

    query = query.order_by(Timesheet.created_at.desc())

    result = await db.execute(query)
    timesheets = result.scalars().all()

    return timesheets


@router.post("/projects/{project_id}/timesheets", response_model=TimesheetResponse)
async def create_timesheet(
    project_id: UUID,
    data: TimesheetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a timesheet for the current user for a date range."""
    await verify_project_access(project_id, current_user, db)

    timesheet = await generate_timesheet(
        db=db,
        user_id=current_user.id,
        project_id=project_id,
        start_date=data.start_date,
        end_date=data.end_date,
    )

    await db.refresh(timesheet, ["user", "approved_by"])
    return timesheet


@router.post("/projects/{project_id}/timesheets/{timesheet_id}/submit", response_model=TimesheetResponse)
async def submit_timesheet(
    project_id: UUID,
    timesheet_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a timesheet for approval."""
    await verify_project_access(project_id, current_user, db)

    # Verify timesheet belongs to project
    result = await db.execute(
        select(Timesheet).where(
            Timesheet.id == timesheet_id,
            Timesheet.project_id == project_id,
        )
    )
    timesheet = result.scalar_one_or_none()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    # Verify user owns the timesheet
    if timesheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only submit your own timesheets")

    try:
        timesheet = await submit_for_approval(db, timesheet_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.refresh(timesheet, ["user", "approved_by"])
    return timesheet


@router.post("/projects/{project_id}/timesheets/{timesheet_id}/approve", response_model=TimesheetResponse)
async def approve_timesheet_endpoint(
    project_id: UUID,
    timesheet_id: UUID,
    member=require_permission(Permission.APPROVE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a timesheet (requires APPROVE permission)."""
    # Verify timesheet belongs to project
    result = await db.execute(
        select(Timesheet).where(
            Timesheet.id == timesheet_id,
            Timesheet.project_id == project_id,
        )
    )
    timesheet = result.scalar_one_or_none()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    try:
        timesheet = await approve_timesheet(db, timesheet_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.refresh(timesheet, ["user", "approved_by"])
    return timesheet


@router.post("/projects/{project_id}/timesheets/{timesheet_id}/reject", response_model=TimesheetResponse)
async def reject_timesheet_endpoint(
    project_id: UUID,
    timesheet_id: UUID,
    reason: Optional[str] = Query(default=None),
    member=require_permission(Permission.APPROVE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject a timesheet (requires APPROVE permission)."""
    # Verify timesheet belongs to project
    result = await db.execute(
        select(Timesheet).where(
            Timesheet.id == timesheet_id,
            Timesheet.project_id == project_id,
        )
    )
    timesheet = result.scalar_one_or_none()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    try:
        timesheet = await reject_timesheet(db, timesheet_id, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.refresh(timesheet, ["user", "approved_by"])
    return timesheet


@router.post("/projects/{project_id}/timesheets/{timesheet_id}/link-budget", response_model=TimesheetResponse)
async def link_timesheet_to_budget(
    project_id: UUID,
    timesheet_id: UUID,
    data: TimesheetLinkBudgetRequest,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link an approved timesheet to a budget line item (requires EDIT permission)."""
    # Verify timesheet belongs to project
    result = await db.execute(
        select(Timesheet).where(
            Timesheet.id == timesheet_id,
            Timesheet.project_id == project_id,
        )
    )
    timesheet = result.scalar_one_or_none()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    # Verify timesheet is approved
    if timesheet.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved timesheets can be linked to budget items"
        )

    # Verify budget item exists and belongs to the same project
    budget_result = await db.execute(
        select(BudgetLineItem).where(
            BudgetLineItem.id == data.budget_item_id,
            BudgetLineItem.project_id == project_id,
        )
    )
    budget_item = budget_result.scalar_one_or_none()
    if not budget_item:
        raise HTTPException(status_code=404, detail="Budget item not found in this project")

    # Update timesheet with budget link
    timesheet.budget_item_id = data.budget_item_id
    await db.commit()
    await db.refresh(timesheet, ["user", "approved_by", "budget_item"])

    return timesheet
