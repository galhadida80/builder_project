import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permit import Permit, PermitStatus, PermitType
from app.models.task import Task

logger = logging.getLogger(__name__)

REQUIRED_PERMIT_TYPES = [
    PermitType.BUILDING_PERMIT.value,
]

APPROVED_STATUSES = [
    PermitStatus.APPROVED.value,
    PermitStatus.CONDITIONAL.value,
]


async def check_milestone_permit_requirements(
    db: AsyncSession,
    task: Task,
    required_types: Optional[list[str]] = None
) -> list[str]:
    """
    Check if a milestone task has all required permits approved.

    Args:
        db: Database session
        task: The task to check (should have is_milestone=True)
        required_types: Optional list of required permit types.
                       Defaults to REQUIRED_PERMIT_TYPES if not provided.

    Returns:
        List of missing permit types (empty list if all requirements met)
    """
    if not task.is_milestone:
        return []

    types_to_check = required_types or REQUIRED_PERMIT_TYPES

    result = await db.execute(
        select(Permit).where(
            Permit.project_id == task.project_id,
            Permit.permit_type.in_(types_to_check),
            Permit.status.in_(APPROVED_STATUSES)
        )
    )
    approved_permits = result.scalars().all()

    approved_types = {p.permit_type for p in approved_permits}
    missing_types = [pt for pt in types_to_check if pt not in approved_types]

    if missing_types:
        logger.info(
            f"Task {task.id} missing required permits: {missing_types}"
        )

    return missing_types


async def get_project_permit_status(
    db: AsyncSession,
    project_id: uuid.UUID
) -> dict[str, list[Permit]]:
    """
    Get all permits for a project grouped by status.

    Args:
        db: Database session
        project_id: Project UUID

    Returns:
        Dictionary mapping status to list of permits
    """
    result = await db.execute(
        select(Permit).where(Permit.project_id == project_id)
    )
    permits = result.scalars().all()

    status_map: dict[str, list[Permit]] = {}
    for permit in permits:
        if permit.status not in status_map:
            status_map[permit.status] = []
        status_map[permit.status].append(permit)

    return status_map


async def get_missing_permit_types(
    db: AsyncSession,
    project_id: uuid.UUID,
    required_types: Optional[list[str]] = None
) -> list[str]:
    """
    Get list of required permit types that are missing or not approved.

    Args:
        db: Database session
        project_id: Project UUID
        required_types: Optional list of required permit types.
                       Defaults to REQUIRED_PERMIT_TYPES if not provided.

    Returns:
        List of missing permit types
    """
    types_to_check = required_types or REQUIRED_PERMIT_TYPES

    result = await db.execute(
        select(Permit).where(
            Permit.project_id == project_id,
            Permit.permit_type.in_(types_to_check),
            Permit.status.in_(APPROVED_STATUSES)
        )
    )
    approved_permits = result.scalars().all()

    approved_types = {p.permit_type for p in approved_permits}
    missing_types = [pt for pt in types_to_check if pt not in approved_types]

    return missing_types
