from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity_version import EntityVersion


async def create_version(
    db: AsyncSession,
    project_id: UUID,
    entity_type: str,
    entity_id: UUID,
    old_values: dict,
    new_values: dict,
    changed_by_id: UUID,
) -> EntityVersion | None:
    changes = {}
    skip_keys = ('updated_at', 'created_at', 'id', 'project_id', 'created_by_id')
    for key in new_values:
        old_val = old_values.get(key)
        new_val = new_values.get(key)
        if old_val != new_val and key not in skip_keys:
            changes[key] = {"old": serialize_value(old_val), "new": serialize_value(new_val)}

    if not changes:
        return None

    count_result = await db.execute(
        select(func.count(EntityVersion.id)).where(
            EntityVersion.entity_type == entity_type,
            EntityVersion.entity_id == entity_id,
        )
    )
    version_number = (count_result.scalar() or 0) + 1

    version = EntityVersion(
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        version_number=version_number,
        changes=changes,
        changed_by_id=changed_by_id,
    )
    db.add(version)
    return version


def serialize_value(value):
    if value is None:
        return None
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        return value
    return str(value)
