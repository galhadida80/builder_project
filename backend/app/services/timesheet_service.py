import logging
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.timesheet import Timesheet
from app.models.time_entry import TimeEntry
from app.services.overtime_service import calculate_weekly_overtime
from app.utils import utcnow

logger = logging.getLogger(__name__)


async def generate_timesheet(
    db: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    start_date: date,
    end_date: date,
) -> Timesheet:
    """
    Generate or update a timesheet for a user for a given date range.

    Calculates total hours, regular hours, and overtime hours from time entries
    within the date range.

    Args:
        db: AsyncSession
        user_id: User UUID
        project_id: Project UUID
        start_date: Start date for timesheet
        end_date: End date for timesheet

    Returns:
        Timesheet object with calculated hours
    """
    # Check if timesheet already exists for this period
    result = await db.execute(
        select(Timesheet).where(
            Timesheet.user_id == user_id,
            Timesheet.project_id == project_id,
            Timesheet.start_date == start_date,
            Timesheet.end_date == end_date,
        )
    )
    timesheet = result.scalars().first()

    # Get time entries for the period
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    time_entries_result = await db.execute(
        select(TimeEntry).where(
            TimeEntry.user_id == user_id,
            TimeEntry.project_id == project_id,
            TimeEntry.clock_in_time >= start_datetime,
            TimeEntry.clock_in_time <= end_datetime,
            TimeEntry.status == "completed",
        )
    )
    time_entries = time_entries_result.scalars().all()

    # Calculate total hours from time entries
    total_hours = 0.0
    for entry in time_entries:
        if entry.clock_out_time:
            duration = entry.clock_out_time - entry.clock_in_time
            total_seconds = duration.total_seconds()
            break_seconds = (entry.break_minutes or 0) * 60
            worked_seconds = max(0, total_seconds - break_seconds)
            total_hours += worked_seconds / 3600

    # Calculate overtime breakdown using overtime service
    overtime_breakdown = calculate_weekly_overtime(list(time_entries))

    if timesheet:
        # Update existing timesheet
        timesheet.total_hours = round(total_hours, 2)
        timesheet.regular_hours = overtime_breakdown["regular_hours"]
        timesheet.overtime_hours = overtime_breakdown["total_overtime_hours"]
        logger.info(
            f"Updated timesheet {timesheet.id} for user {user_id}, "
            f"total_hours: {timesheet.total_hours}, "
            f"regular: {timesheet.regular_hours}, "
            f"overtime: {timesheet.overtime_hours}"
        )
    else:
        # Create new timesheet
        timesheet = Timesheet(
            user_id=user_id,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
            total_hours=round(total_hours, 2),
            regular_hours=overtime_breakdown["regular_hours"],
            overtime_hours=overtime_breakdown["total_overtime_hours"],
            status="draft",
        )
        db.add(timesheet)
        logger.info(
            f"Created timesheet for user {user_id}, project {project_id}, "
            f"period {start_date} to {end_date}, "
            f"total_hours: {timesheet.total_hours}"
        )

    await db.commit()
    await db.refresh(timesheet)

    return timesheet


async def submit_for_approval(
    db: AsyncSession,
    timesheet_id: UUID,
) -> Timesheet:
    """
    Submit a timesheet for approval.

    Changes status from 'draft' to 'submitted'.

    Args:
        db: AsyncSession
        timesheet_id: Timesheet UUID

    Returns:
        Updated Timesheet object

    Raises:
        ValueError: If timesheet not found or not in draft status
    """
    result = await db.execute(
        select(Timesheet).where(Timesheet.id == timesheet_id)
    )
    timesheet = result.scalars().first()

    if not timesheet:
        raise ValueError(f"Timesheet {timesheet_id} not found")

    if timesheet.status != "draft":
        raise ValueError(
            f"Timesheet {timesheet_id} cannot be submitted. "
            f"Current status: {timesheet.status}, expected: draft"
        )

    timesheet.status = "submitted"
    await db.commit()
    await db.refresh(timesheet)

    logger.info(f"Timesheet {timesheet_id} submitted for approval by user {timesheet.user_id}")

    return timesheet


async def approve_timesheet(
    db: AsyncSession,
    timesheet_id: UUID,
    approver_id: UUID,
) -> Timesheet:
    """
    Approve a timesheet.

    Changes status to 'approved' and records approver and timestamp.

    Args:
        db: AsyncSession
        timesheet_id: Timesheet UUID
        approver_id: User UUID of the approver

    Returns:
        Updated Timesheet object

    Raises:
        ValueError: If timesheet not found or not in submitted status
    """
    result = await db.execute(
        select(Timesheet).where(Timesheet.id == timesheet_id)
    )
    timesheet = result.scalars().first()

    if not timesheet:
        raise ValueError(f"Timesheet {timesheet_id} not found")

    if timesheet.status != "submitted":
        raise ValueError(
            f"Timesheet {timesheet_id} cannot be approved. "
            f"Current status: {timesheet.status}, expected: submitted"
        )

    timesheet.status = "approved"
    timesheet.approved_by_id = approver_id
    timesheet.approved_at = utcnow()

    await db.commit()
    await db.refresh(timesheet)

    logger.info(
        f"Timesheet {timesheet_id} approved by user {approver_id} "
        f"for worker {timesheet.user_id}, "
        f"total_hours: {timesheet.total_hours}"
    )

    return timesheet


async def reject_timesheet(
    db: AsyncSession,
    timesheet_id: UUID,
    approver_id: UUID,
    reason: str | None = None,
) -> Timesheet:
    """
    Reject a timesheet.

    Changes status to 'rejected' and records approver.

    Args:
        db: AsyncSession
        timesheet_id: Timesheet UUID
        approver_id: User UUID of the approver
        reason: Optional rejection reason

    Returns:
        Updated Timesheet object

    Raises:
        ValueError: If timesheet not found or not in submitted status
    """
    result = await db.execute(
        select(Timesheet).where(Timesheet.id == timesheet_id)
    )
    timesheet = result.scalars().first()

    if not timesheet:
        raise ValueError(f"Timesheet {timesheet_id} not found")

    if timesheet.status != "submitted":
        raise ValueError(
            f"Timesheet {timesheet_id} cannot be rejected. "
            f"Current status: {timesheet.status}, expected: submitted"
        )

    timesheet.status = "rejected"
    timesheet.approved_by_id = approver_id
    timesheet.approved_at = utcnow()

    await db.commit()
    await db.refresh(timesheet)

    logger.info(
        f"Timesheet {timesheet_id} rejected by user {approver_id} "
        f"for worker {timesheet.user_id}. Reason: {reason or 'Not provided'}"
    )

    return timesheet


async def get_timesheets_for_approval(
    db: AsyncSession,
    project_id: UUID,
) -> list[Timesheet]:
    """
    Get all timesheets pending approval for a project.

    Returns:
        List of Timesheet objects with status 'submitted'
    """
    result = await db.execute(
        select(Timesheet)
        .where(
            Timesheet.project_id == project_id,
            Timesheet.status == "submitted",
        )
        .order_by(Timesheet.created_at.desc())
    )
    timesheets = result.scalars().all()

    logger.debug(f"Found {len(timesheets)} timesheets pending approval for project {project_id}")

    return list(timesheets)
