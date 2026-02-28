import logging
from typing import Dict, List

from app.models.time_entry import TimeEntry

logger = logging.getLogger(__name__)

# Israeli labor law constants
STANDARD_DAILY_HOURS = 8.0
STANDARD_WEEKLY_HOURS = 43.0
OVERTIME_TIER_1_MULTIPLIER = 1.25  # First 2 hours beyond standard
OVERTIME_TIER_2_MULTIPLIER = 1.50  # Beyond 2 hours
OVERTIME_TIER_1_THRESHOLD = 2.0    # Hours at tier 1 before tier 2 kicks in


def calculate_overtime(
    hours_worked: float,
    daily: bool = True,
) -> Dict[str, float]:
    """
    Calculate overtime hours and multipliers based on Israeli labor law.

    Israeli labor law (Hours of Work and Rest Law):
    - Standard workday: 8 hours
    - Standard workweek: 43 hours
    - First 2 hours beyond standard: 125% (1.25x)
    - Beyond 2 hours: 150% (1.5x)

    Args:
        hours_worked: Total hours worked
        daily: If True, calculate daily overtime (vs 8 hours).
               If False, calculate weekly overtime (vs 43 hours).

    Returns:
        Dictionary with:
        - regular_hours: Hours at regular rate
        - overtime_tier_1_hours: Overtime hours at 125%
        - overtime_tier_2_hours: Overtime hours at 150%
        - total_overtime_hours: Total overtime hours
        - overtime_multiplier: Weighted average multiplier
    """
    standard_hours = STANDARD_DAILY_HOURS if daily else STANDARD_WEEKLY_HOURS

    # Calculate overtime hours
    overtime_hours = max(0, hours_worked - standard_hours)
    regular_hours = min(hours_worked, standard_hours)

    # Split overtime into tiers
    overtime_tier_1_hours = min(overtime_hours, OVERTIME_TIER_1_THRESHOLD)
    overtime_tier_2_hours = max(0, overtime_hours - OVERTIME_TIER_1_THRESHOLD)

    # Calculate weighted average overtime multiplier
    if overtime_hours > 0:
        weighted_multiplier = (
            (overtime_tier_1_hours * OVERTIME_TIER_1_MULTIPLIER) +
            (overtime_tier_2_hours * OVERTIME_TIER_2_MULTIPLIER)
        ) / overtime_hours
    else:
        weighted_multiplier = 1.0

    result = {
        "regular_hours": round(regular_hours, 2),
        "overtime_tier_1_hours": round(overtime_tier_1_hours, 2),
        "overtime_tier_2_hours": round(overtime_tier_2_hours, 2),
        "total_overtime_hours": round(overtime_hours, 2),
        "overtime_multiplier": round(weighted_multiplier, 2),
    }

    logger.debug(
        f"Overtime calculation for {hours_worked:.2f} hours ({'daily' if daily else 'weekly'}): "
        f"{result}"
    )

    return result


def calculate_weekly_overtime(time_entries: List[TimeEntry]) -> Dict[str, float]:
    """
    Calculate weekly overtime based on a list of time entries.

    Sums up all hours from the time entries and calculates overtime
    based on weekly standard hours (43 hours per Israeli labor law).

    Args:
        time_entries: List of TimeEntry objects for the week

    Returns:
        Dictionary with overtime breakdown (same structure as calculate_overtime)
    """
    total_hours = 0.0

    for entry in time_entries:
        if entry.clock_out_time:
            duration = entry.clock_out_time - entry.clock_in_time
            total_seconds = duration.total_seconds()
            break_seconds = (entry.break_minutes or 0) * 60
            worked_seconds = max(0, total_seconds - break_seconds)
            total_hours += worked_seconds / 3600

    logger.debug(f"Calculating weekly overtime for {len(time_entries)} entries, total hours: {total_hours:.2f}")

    return calculate_overtime(total_hours, daily=False)


def get_overtime_multiplier(hours_beyond_standard: float) -> float:
    """
    Get the overtime multiplier for hours beyond standard working hours.

    Israeli labor law:
    - First 2 hours: 125% (1.25x)
    - Beyond 2 hours: 150% (1.5x)

    This function returns the multiplier for a specific hour beyond standard.
    For example:
    - Hour 1 beyond standard (0-1): 1.25x
    - Hour 2 beyond standard (1-2): 1.25x
    - Hour 3 beyond standard (2-3): 1.50x

    Args:
        hours_beyond_standard: Number of hours beyond standard working hours

    Returns:
        Overtime multiplier (1.25 or 1.50)
    """
    if hours_beyond_standard <= 0:
        return 1.0
    elif hours_beyond_standard <= OVERTIME_TIER_1_THRESHOLD:
        return OVERTIME_TIER_1_MULTIPLIER
    else:
        return OVERTIME_TIER_2_MULTIPLIER


def calculate_daily_overtime_by_entry(time_entry: TimeEntry) -> Dict[str, float]:
    """
    Calculate overtime for a single time entry based on daily hours.

    Args:
        time_entry: TimeEntry object

    Returns:
        Dictionary with overtime breakdown
    """
    if not time_entry.clock_out_time:
        logger.warning(f"Time entry {time_entry.id} has no clock_out_time, cannot calculate overtime")
        return {
            "regular_hours": 0.0,
            "overtime_tier_1_hours": 0.0,
            "overtime_tier_2_hours": 0.0,
            "total_overtime_hours": 0.0,
            "overtime_multiplier": 1.0,
        }

    duration = time_entry.clock_out_time - time_entry.clock_in_time
    total_seconds = duration.total_seconds()
    break_seconds = (time_entry.break_minutes or 0) * 60
    worked_seconds = max(0, total_seconds - break_seconds)
    hours_worked = worked_seconds / 3600

    return calculate_overtime(hours_worked, daily=True)


def calculate_overtime_cost(
    regular_hourly_rate: float,
    overtime_breakdown: Dict[str, float],
) -> Dict[str, float]:
    """
    Calculate the total cost of overtime based on hourly rate and overtime breakdown.

    Args:
        regular_hourly_rate: Base hourly rate
        overtime_breakdown: Result from calculate_overtime or calculate_weekly_overtime

    Returns:
        Dictionary with:
        - regular_cost: Cost of regular hours
        - overtime_tier_1_cost: Cost of tier 1 overtime (125%)
        - overtime_tier_2_cost: Cost of tier 2 overtime (150%)
        - total_overtime_cost: Total cost of all overtime
        - total_cost: Total cost (regular + overtime)
    """
    regular_hours = overtime_breakdown["regular_hours"]
    overtime_tier_1_hours = overtime_breakdown["overtime_tier_1_hours"]
    overtime_tier_2_hours = overtime_breakdown["overtime_tier_2_hours"]

    regular_cost = regular_hours * regular_hourly_rate
    overtime_tier_1_cost = overtime_tier_1_hours * regular_hourly_rate * OVERTIME_TIER_1_MULTIPLIER
    overtime_tier_2_cost = overtime_tier_2_hours * regular_hourly_rate * OVERTIME_TIER_2_MULTIPLIER
    total_overtime_cost = overtime_tier_1_cost + overtime_tier_2_cost
    total_cost = regular_cost + total_overtime_cost

    return {
        "regular_cost": round(regular_cost, 2),
        "overtime_tier_1_cost": round(overtime_tier_1_cost, 2),
        "overtime_tier_2_cost": round(overtime_tier_2_cost, 2),
        "total_overtime_cost": round(total_overtime_cost, 2),
        "total_cost": round(total_cost, 2),
    }
