import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.time_entry import TimeEntry
from app.utils import utcnow

logger = logging.getLogger(__name__)


async def get_active_time_entry(
    db: AsyncSession, user_id: UUID, project_id: UUID
) -> TimeEntry | None:
    """Get the active time entry for a user in a project."""
    result = await db.execute(
        select(TimeEntry)
        .where(
            TimeEntry.user_id == user_id,
            TimeEntry.project_id == project_id,
            TimeEntry.status == "active",
        )
        .order_by(TimeEntry.clock_in_time.desc())
    )
    return result.scalars().first()


async def clock_in(
    db: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    location_lat: float | None = None,
    location_lng: float | None = None,
    task_id: UUID | None = None,
) -> TimeEntry:
    """
    Clock in a user for a project.

    Creates a new active TimeEntry. If the user already has an active entry
    for this project, raises ValueError.
    """
    # Check if user already has an active time entry for this project
    existing_entry = await get_active_time_entry(db, user_id, project_id)
    if existing_entry:
        raise ValueError(
            f"User {user_id} already has an active time entry for project {project_id}. "
            f"Please clock out before clocking in again."
        )

    # Create new time entry
    time_entry = TimeEntry(
        user_id=user_id,
        project_id=project_id,
        task_id=task_id,
        clock_in_time=utcnow(),
        location_lat=location_lat,
        location_lng=location_lng,
        status="active",
        break_minutes=0,
    )

    db.add(time_entry)
    await db.commit()
    await db.refresh(time_entry)

    logger.info(f"User {user_id} clocked in for project {project_id} at {time_entry.clock_in_time}")
    return time_entry


async def clock_out(
    db: AsyncSession,
    user_id: UUID,
    project_id: UUID,
    break_minutes: int | None = None,
) -> TimeEntry:
    """
    Clock out a user from a project.

    Updates the active TimeEntry with clock_out_time and sets status to completed.
    If no active entry exists, raises ValueError.
    """
    # Get the active time entry
    time_entry = await get_active_time_entry(db, user_id, project_id)
    if not time_entry:
        raise ValueError(
            f"User {user_id} has no active time entry for project {project_id}. "
            f"Please clock in first."
        )

    # Update the time entry
    time_entry.clock_out_time = utcnow()
    time_entry.status = "completed"
    if break_minutes is not None:
        time_entry.break_minutes = break_minutes

    await db.commit()
    await db.refresh(time_entry)

    # Calculate duration for logging
    duration = time_entry.clock_out_time - time_entry.clock_in_time
    hours = duration.total_seconds() / 3600
    logger.info(
        f"User {user_id} clocked out from project {project_id} "
        f"after {hours:.2f} hours (break: {time_entry.break_minutes or 0} minutes)"
    )

    return time_entry


async def get_time_entries_for_period(
    db: AsyncSession,
    project_id: UUID,
    date_from: datetime,
    date_to: datetime,
    user_id: UUID | None = None,
) -> list[TimeEntry]:
    """Get time entries for a project within a date range."""
    query = select(TimeEntry).where(
        TimeEntry.project_id == project_id,
        TimeEntry.clock_in_time >= date_from,
        TimeEntry.clock_in_time <= date_to,
    )

    if user_id:
        query = query.where(TimeEntry.user_id == user_id)

    query = query.order_by(TimeEntry.clock_in_time.desc())

    result = await db.execute(query)
    return result.scalars().all()


async def calculate_total_hours(
    db: AsyncSession,
    project_id: UUID,
    date_from: datetime,
    date_to: datetime,
    user_id: UUID | None = None,
) -> dict:
    """
    Calculate total hours worked for a project in a date range.

    Returns a dictionary with:
    - total_hours: Total hours worked (excluding breaks)
    - total_entries: Number of time entries
    - active_entries: Number of still-active entries
    - completed_entries: Number of completed entries
    """
    entries = await get_time_entries_for_period(
        db, project_id, date_from, date_to, user_id
    )

    total_hours = 0.0
    active_count = 0
    completed_count = 0

    for entry in entries:
        if entry.status == "active":
            active_count += 1
        else:
            completed_count += 1

        if entry.clock_out_time:
            duration = entry.clock_out_time - entry.clock_in_time
            total_seconds = duration.total_seconds()
            break_seconds = (entry.break_minutes or 0) * 60
            worked_seconds = max(0, total_seconds - break_seconds)
            total_hours += worked_seconds / 3600

    return {
        "total_hours": round(total_hours, 2),
        "total_entries": len(entries),
        "active_entries": active_count,
        "completed_entries": completed_count,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }
