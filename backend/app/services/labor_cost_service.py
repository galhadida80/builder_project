import logging
from datetime import date
from decimal import Decimal
from typing import Dict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.budget import CostEntry
from app.models.time_entry import TimeEntry
from app.models.timesheet import Timesheet
from app.services.overtime_service import calculate_weekly_overtime, calculate_overtime_cost
from app.utils import utcnow

logger = logging.getLogger(__name__)


async def calculate_labor_cost(
    db: AsyncSession,
    timesheet_id: UUID,
    hourly_rates_by_user: Dict[UUID, float],
) -> Dict[str, float]:
    """
    Calculate total labor cost for a timesheet based on hourly rates.

    This function calculates the total labor cost including overtime
    based on Israeli labor law (43hr standard week, 125% first 2 hours OT, 150% beyond).

    Args:
        db: Database session
        timesheet_id: UUID of the timesheet
        hourly_rates_by_user: Dictionary mapping user_id to hourly rate

    Returns:
        Dictionary with:
        - regular_cost: Cost of regular hours
        - overtime_tier_1_cost: Cost of tier 1 overtime (125%)
        - overtime_tier_2_cost: Cost of tier 2 overtime (150%)
        - total_overtime_cost: Total cost of all overtime
        - total_cost: Total cost (regular + overtime)
        - regular_hours: Regular hours worked
        - overtime_hours: Overtime hours worked
        - total_hours: Total hours worked

    Raises:
        ValueError: If timesheet not found or hourly rate not provided for user
    """
    # Fetch timesheet with related data
    result = await db.execute(
        select(Timesheet)
        .where(Timesheet.id == timesheet_id)
        .options(selectinload(Timesheet.user))
    )
    timesheet = result.scalar_one_or_none()

    if not timesheet:
        logger.error(f"Timesheet {timesheet_id} not found")
        raise ValueError(f"Timesheet {timesheet_id} not found")

    # Get hourly rate for this user
    hourly_rate = hourly_rates_by_user.get(timesheet.user_id)
    if hourly_rate is None:
        logger.error(f"Hourly rate not provided for user {timesheet.user_id}")
        raise ValueError(f"Hourly rate not provided for user {timesheet.user_id}")

    # Fetch all time entries for this timesheet
    time_entries_result = await db.execute(
        select(TimeEntry).where(
            TimeEntry.user_id == timesheet.user_id,
            TimeEntry.project_id == timesheet.project_id,
            TimeEntry.clock_in_time >= timesheet.start_date,
            TimeEntry.clock_in_time <= timesheet.end_date,
            TimeEntry.status == "completed",
        )
    )
    time_entries = list(time_entries_result.scalars().all())

    logger.info(
        f"Calculating labor cost for timesheet {timesheet_id}, "
        f"user {timesheet.user_id}, {len(time_entries)} time entries"
    )

    # Calculate overtime breakdown using overtime service
    overtime_breakdown = calculate_weekly_overtime(time_entries)

    # Calculate costs based on overtime breakdown
    cost_breakdown = calculate_overtime_cost(hourly_rate, overtime_breakdown)

    # Add hours to the result
    result_with_hours = {
        **cost_breakdown,
        "regular_hours": overtime_breakdown["regular_hours"],
        "overtime_hours": overtime_breakdown["total_overtime_hours"],
        "total_hours": (
            overtime_breakdown["regular_hours"] + overtime_breakdown["total_overtime_hours"]
        ),
    }

    logger.info(
        f"Labor cost calculated for timesheet {timesheet_id}: "
        f"total_cost={cost_breakdown['total_cost']:.2f}, "
        f"total_hours={result_with_hours['total_hours']:.2f}"
    )

    return result_with_hours


async def sync_to_budget(
    db: AsyncSession,
    timesheet_id: UUID,
    budget_item_id: UUID,
    hourly_rates_by_user: Dict[UUID, float],
    created_by_id: UUID,
) -> CostEntry:
    """
    Sync approved timesheet to budget by creating a CostEntry.

    This function calculates the labor cost for the timesheet and creates
    a corresponding CostEntry in the budget module. This should be called
    after a timesheet is approved and linked to a budget item.

    Args:
        db: Database session
        timesheet_id: UUID of the approved timesheet
        budget_item_id: UUID of the budget line item (labor category)
        hourly_rates_by_user: Dictionary mapping user_id to hourly rate
        created_by_id: UUID of the user creating the cost entry

    Returns:
        CostEntry: The created cost entry

    Raises:
        ValueError: If timesheet not found, not approved, or calculation fails
    """
    # Fetch timesheet
    result = await db.execute(
        select(Timesheet)
        .where(Timesheet.id == timesheet_id)
        .options(selectinload(Timesheet.user))
    )
    timesheet = result.scalar_one_or_none()

    if not timesheet:
        logger.error(f"Timesheet {timesheet_id} not found")
        raise ValueError(f"Timesheet {timesheet_id} not found")

    if timesheet.status != "approved":
        logger.error(f"Timesheet {timesheet_id} is not approved (status: {timesheet.status})")
        raise ValueError(f"Timesheet {timesheet_id} must be approved before syncing to budget")

    # Calculate labor cost
    cost_data = await calculate_labor_cost(db, timesheet_id, hourly_rates_by_user)

    # Create cost entry
    cost_entry = CostEntry(
        budget_item_id=budget_item_id,
        project_id=timesheet.project_id,
        description=f"Labor cost for {timesheet.user.full_name} ({timesheet.start_date} to {timesheet.end_date})",
        amount=Decimal(str(cost_data["total_cost"])),
        entry_date=timesheet.end_date,
        vendor=None,
        reference_number=f"TIMESHEET-{timesheet_id}",
        created_by_id=created_by_id,
    )

    db.add(cost_entry)
    await db.commit()
    await db.refresh(cost_entry)

    logger.info(
        f"Created CostEntry {cost_entry.id} for timesheet {timesheet_id}, "
        f"amount={cost_entry.amount}, budget_item={budget_item_id}"
    )

    return cost_entry
