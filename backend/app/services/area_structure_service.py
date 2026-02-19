import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import AreaChecklistAssignment, ConstructionArea
from app.models.checklist import ChecklistInstance, ChecklistItemResponse


DEFAULT_HIERARCHY = {
    "building": [None],
    "floor": ["building"],
    "unit": ["floor"],
    "zone": ["building", "floor", None],
    "custom": None,
}


async def validate_area_hierarchy(
    db: AsyncSession, parent_id: uuid.UUID | None, area_level: str | None, project_id: uuid.UUID
) -> str | None:
    """Returns error message if hierarchy is invalid, None if valid."""
    if not area_level or area_level == "custom":
        return None

    allowed_parents = DEFAULT_HIERARCHY.get(area_level)
    if allowed_parents is None:
        return None

    if parent_id is None:
        if None not in allowed_parents:
            return f"Area level '{area_level}' cannot be a root-level area"
        return None

    result = await db.execute(
        select(ConstructionArea.area_level).where(
            ConstructionArea.id == parent_id, ConstructionArea.project_id == project_id
        )
    )
    parent_level = result.scalar_one_or_none()
    if parent_level not in allowed_parents:
        return f"Area level '{area_level}' cannot be nested under '{parent_level}'"
    return None


async def process_bulk_area_tree(
    db: AsyncSession,
    project_id: uuid.UUID,
    nodes: list,
    parent_id: uuid.UUID | None,
    created_by_id: uuid.UUID | None,
    auto_assign: bool,
    order_start: int = 0,
) -> tuple[list[ConstructionArea], int]:
    """Recursively creates areas from node tree. Returns (areas, checklist_count)."""
    created_areas = []
    checklist_count = 0

    for idx, node in enumerate(nodes):
        area_code = node.area_code
        if not area_code:
            prefix = (node.area_type or node.name[:3]).upper()[:5]
            area_code = f"{prefix}-{order_start + idx + 1:03d}"

        area = ConstructionArea(
            project_id=project_id,
            parent_id=parent_id,
            name=node.name,
            area_type=node.area_type,
            area_level=node.area_level,
            floor_number=node.floor_number,
            area_code=area_code,
            total_units=node.total_units,
            order=order_start + idx,
            status="not_started",
        )
        db.add(area)
        await db.flush()
        created_areas.append(area)

        if auto_assign and node.area_type:
            instances = await create_checklists_for_area(db, project_id, area, created_by_id)
            checklist_count += instances

        if node.children:
            child_areas, child_checklists = await process_bulk_area_tree(
                db, project_id, node.children, area.id, created_by_id, auto_assign
            )
            created_areas.extend(child_areas)
            checklist_count += child_checklists

    return created_areas, checklist_count


async def create_checklists_for_area(
    db: AsyncSession, project_id: uuid.UUID, area: ConstructionArea, created_by_id: uuid.UUID | None
) -> int:
    """Create checklist instances for an area based on assignments. Returns count created."""
    result = await db.execute(
        select(AreaChecklistAssignment).where(
            AreaChecklistAssignment.project_id == project_id,
            AreaChecklistAssignment.area_type == area.area_type,
            AreaChecklistAssignment.auto_create.is_(True),
        )
    )
    assignments = result.scalars().all()
    count = 0

    for assignment in assignments:
        existing = await db.execute(
            select(ChecklistInstance.id).where(
                ChecklistInstance.project_id == project_id,
                ChecklistInstance.area_id == area.id,
                ChecklistInstance.template_id == assignment.template_id,
            )
        )
        if existing.scalar_one_or_none():
            continue

        path = area.name
        instance = ChecklistInstance(
            template_id=assignment.template_id,
            project_id=project_id,
            area_id=area.id,
            unit_identifier=path,
            created_by_id=created_by_id,
        )
        db.add(instance)
        count += 1

    if count > 0:
        await db.flush()
    return count


async def compute_area_checklist_progress(
    db: AsyncSession, area_id: uuid.UUID
) -> dict:
    """Compute checklist completion stats for an area and its children."""
    area_ids = await collect_descendant_ids(db, area_id)
    area_ids.append(area_id)

    instance_result = await db.execute(
        select(
            func.count(ChecklistInstance.id),
            func.count(ChecklistInstance.id).filter(ChecklistInstance.status == "completed"),
        ).where(ChecklistInstance.area_id.in_(area_ids))
    )
    row = instance_result.one()
    total_instances = row[0]
    completed_instances = row[1]

    response_result = await db.execute(
        select(
            func.count(ChecklistItemResponse.id),
            func.count(ChecklistItemResponse.id).filter(
                ChecklistItemResponse.status.in_(["approved", "not_applicable"])
            ),
        )
        .join(ChecklistInstance, ChecklistItemResponse.instance_id == ChecklistInstance.id)
        .where(ChecklistInstance.area_id.in_(area_ids))
    )
    resp_row = response_result.one()

    return {
        "total_instances": total_instances,
        "completed_instances": completed_instances,
        "total_items": resp_row[0],
        "completed_items": resp_row[1],
        "completion_percentage": round(resp_row[1] / resp_row[0] * 100, 1) if resp_row[0] > 0 else 0,
    }


async def collect_descendant_ids(db: AsyncSession, parent_id: uuid.UUID) -> list[uuid.UUID]:
    """Collect all descendant area IDs recursively."""
    result = await db.execute(
        select(ConstructionArea.id).where(ConstructionArea.parent_id == parent_id)
    )
    child_ids = list(result.scalars().all())
    all_ids = list(child_ids)
    for child_id in child_ids:
        all_ids.extend(await collect_descendant_ids(db, child_id))
    return all_ids
