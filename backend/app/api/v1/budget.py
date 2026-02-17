from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.budget import BudgetLineItem, CostEntry, ChangeOrder
from app.models.user import User
from app.schemas.budget import (
    BudgetLineItemCreate,
    BudgetLineItemResponse,
    BudgetLineItemUpdate,
    BudgetSummaryResponse,
    ChangeOrderCreate,
    ChangeOrderResponse,
    ChangeOrderUpdate,
    CostEntryCreate,
    CostEntryResponse,
)

router = APIRouter()


@router.get("/projects/{project_id}/budget", response_model=list[BudgetLineItemResponse])
async def list_budget_items(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(BudgetLineItem)
        .options(selectinload(BudgetLineItem.cost_entries))
        .where(BudgetLineItem.project_id == project_id)
        .order_by(BudgetLineItem.sort_order, BudgetLineItem.created_at)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    responses = []
    for item in items:
        actual = sum(entry.amount for entry in item.cost_entries)
        remaining = item.budgeted_amount - actual
        response = BudgetLineItemResponse(
            id=item.id,
            project_id=item.project_id,
            name=item.name,
            category=item.category,
            description=item.description,
            budgeted_amount=item.budgeted_amount,
            sort_order=item.sort_order,
            actual_amount=actual,
            remaining_amount=remaining,
            created_by_id=item.created_by_id,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        responses.append(response)
    return responses


@router.post("/projects/{project_id}/budget", response_model=BudgetLineItemResponse)
async def create_budget_item(
    project_id: UUID,
    data: BudgetLineItemCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = BudgetLineItem(
        **data.model_dump(),
        project_id=project_id,
        created_by_id=current_user.id,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return BudgetLineItemResponse(
        id=item.id,
        project_id=item.project_id,
        name=item.name,
        category=item.category,
        description=item.description,
        budgeted_amount=item.budgeted_amount,
        sort_order=item.sort_order,
        actual_amount=Decimal("0"),
        remaining_amount=item.budgeted_amount,
        created_by_id=item.created_by_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.put("/projects/{project_id}/budget/{item_id}", response_model=BudgetLineItemResponse)
async def update_budget_item(
    project_id: UUID,
    item_id: UUID,
    data: BudgetLineItemUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BudgetLineItem)
        .options(selectinload(BudgetLineItem.cost_entries))
        .where(BudgetLineItem.id == item_id, BudgetLineItem.project_id == project_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.flush()
    await db.refresh(item)

    actual = sum(entry.amount for entry in item.cost_entries)
    remaining = item.budgeted_amount - actual
    return BudgetLineItemResponse(
        id=item.id,
        project_id=item.project_id,
        name=item.name,
        category=item.category,
        description=item.description,
        budgeted_amount=item.budgeted_amount,
        sort_order=item.sort_order,
        actual_amount=actual,
        remaining_amount=remaining,
        created_by_id=item.created_by_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.delete("/projects/{project_id}/budget/{item_id}")
async def delete_budget_item(
    project_id: UUID,
    item_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BudgetLineItem)
        .where(BudgetLineItem.id == item_id, BudgetLineItem.project_id == project_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found")
    await db.delete(item)
    return {"message": "Budget item deleted"}


@router.get("/projects/{project_id}/budget/summary", response_model=BudgetSummaryResponse)
async def get_budget_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    budget_result = await db.execute(
        select(
            func.coalesce(func.sum(BudgetLineItem.budgeted_amount), 0).label("total_budgeted"),
            func.count().label("line_item_count"),
        )
        .where(BudgetLineItem.project_id == project_id)
    )
    budget_row = budget_result.first()

    cost_result = await db.execute(
        select(
            func.coalesce(func.sum(CostEntry.amount), 0).label("total_actual"),
            func.count().label("cost_entry_count"),
        )
        .where(CostEntry.project_id == project_id)
    )
    cost_row = cost_result.first()

    co_result = await db.execute(
        select(
            func.coalesce(func.sum(ChangeOrder.amount), 0).label("total_co"),
        )
        .where(ChangeOrder.project_id == project_id)
    )
    co_total = co_result.scalar() or Decimal("0")

    approved_co_result = await db.execute(
        select(
            func.coalesce(func.sum(ChangeOrder.amount), 0).label("approved_co"),
        )
        .where(ChangeOrder.project_id == project_id, ChangeOrder.status == "approved")
    )
    approved_co = approved_co_result.scalar() or Decimal("0")

    total_budgeted = budget_row.total_budgeted
    total_actual = cost_row.total_actual
    total_variance = total_budgeted - total_actual

    return BudgetSummaryResponse(
        total_budgeted=total_budgeted,
        total_actual=total_actual,
        total_variance=total_variance,
        total_change_orders=co_total,
        approved_change_orders=approved_co,
        line_item_count=budget_row.line_item_count,
        cost_entry_count=cost_row.cost_entry_count,
    )


@router.post("/projects/{project_id}/budget/{item_id}/costs", response_model=CostEntryResponse)
async def create_cost_entry(
    project_id: UUID,
    item_id: UUID,
    data: CostEntryCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BudgetLineItem)
        .where(BudgetLineItem.id == item_id, BudgetLineItem.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Budget item not found")

    entry = CostEntry(
        **data.model_dump(),
        budget_item_id=item_id,
        project_id=project_id,
        created_by_id=current_user.id,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.get("/projects/{project_id}/budget/{item_id}/costs", response_model=list[CostEntryResponse])
async def list_cost_entries(
    project_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BudgetLineItem)
        .where(BudgetLineItem.id == item_id, BudgetLineItem.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Budget item not found")

    query = (
        select(CostEntry)
        .where(CostEntry.budget_item_id == item_id)
        .order_by(CostEntry.entry_date.desc(), CostEntry.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/projects/{project_id}/budget/costs/{cost_id}")
async def delete_cost_entry(
    project_id: UUID,
    cost_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CostEntry)
        .where(CostEntry.id == cost_id, CostEntry.project_id == project_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Cost entry not found")
    await db.delete(entry)
    return {"message": "Cost entry deleted"}


async def get_next_change_order_number(db: AsyncSession, project_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(ChangeOrder.change_order_number), 0))
        .where(ChangeOrder.project_id == project_id)
    )
    return (result.scalar() or 0) + 1


@router.get("/projects/{project_id}/change-orders", response_model=list[ChangeOrderResponse])
async def list_change_orders(
    project_id: UUID,
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(ChangeOrder)
        .where(ChangeOrder.project_id == project_id)
    )
    if status:
        query = query.where(ChangeOrder.status == status)
    query = query.order_by(ChangeOrder.change_order_number.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/projects/{project_id}/change-orders", response_model=ChangeOrderResponse)
async def create_change_order(
    project_id: UUID,
    data: ChangeOrderCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    co_number = await get_next_change_order_number(db, project_id)
    change_order = ChangeOrder(
        **data.model_dump(),
        project_id=project_id,
        change_order_number=co_number,
        requested_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(change_order)
    await db.flush()
    await db.refresh(change_order)
    return change_order


@router.put("/projects/{project_id}/change-orders/{co_id}", response_model=ChangeOrderResponse)
async def update_change_order(
    project_id: UUID,
    co_id: UUID,
    data: ChangeOrderUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChangeOrder)
        .where(ChangeOrder.id == co_id, ChangeOrder.project_id == project_id)
    )
    change_order = result.scalar_one_or_none()
    if not change_order:
        raise HTTPException(status_code=404, detail="Change order not found")

    old_status = change_order.status
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(change_order, key, value)

    if data.status == "approved" and old_status != "approved":
        change_order.approved_by_id = current_user.id
        change_order.approved_date = date.today()

    await db.flush()
    await db.refresh(change_order)
    return change_order


@router.delete("/projects/{project_id}/change-orders/{co_id}")
async def delete_change_order(
    project_id: UUID,
    co_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChangeOrder)
        .where(ChangeOrder.id == co_id, ChangeOrder.project_id == project_id)
    )
    change_order = result.scalar_one_or_none()
    if not change_order:
        raise HTTPException(status_code=404, detail="Change order not found")
    await db.delete(change_order)
    return {"message": "Change order deleted"}
