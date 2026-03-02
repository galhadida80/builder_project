from __future__ import annotations

import asyncio
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.contact import Contact
from app.models.defect import Defect, DefectAssignee
from app.models.equipment import ApprovalStatus
from app.models.meeting import Meeting, MeetingAttendee
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI
from app.models.task import Task
from app.schemas.inbox import (
    InboxApprovalItem,
    InboxCountsResponse,
    InboxDefectItem,
    InboxItem,
    InboxMeetingItem,
    InboxResponse,
    InboxRFIItem,
    InboxTaskItem,
)


def accessible_projects_subquery(user_id: UUID):
    return select(ProjectMember.project_id).where(ProjectMember.user_id == user_id)


async def fetch_inbox_approvals(
    db: AsyncSession, user_id: UUID, project_id: Optional[UUID] = None, limit: int = 50
) -> list[InboxApprovalItem]:
    accessible = accessible_projects_subquery(user_id)
    my_contact_ids = select(Contact.id).where(Contact.user_id == user_id)

    query = (
        select(
            ApprovalRequest.id,
            ApprovalRequest.project_id,
            Project.name.label("project_name"),
            ApprovalRequest.entity_type,
            ApprovalRequest.entity_id,
            ApprovalRequest.current_status,
            ApprovalRequest.created_at,
        )
        .join(ApprovalStep, ApprovalStep.approval_request_id == ApprovalRequest.id)
        .join(Project, Project.id == ApprovalRequest.project_id)
        .where(
            ApprovalRequest.project_id.in_(accessible),
            ApprovalStep.status == "pending",
            ApprovalRequest.current_status.in_([
                ApprovalStatus.SUBMITTED.value,
                ApprovalStatus.UNDER_REVIEW.value,
            ]),
            ApprovalStep.contact_id.in_(my_contact_ids),
        )
    )
    if project_id:
        query = query.where(ApprovalRequest.project_id == project_id)

    query = query.order_by(ApprovalRequest.created_at.desc()).limit(limit)
    result = await db.execute(query)
    rows = result.unique().all()

    return [
        InboxApprovalItem(
            id=r.id,
            project_id=r.project_id,
            project_name=r.project_name,
            entity_kind=r.entity_type,
            entity_id=r.entity_id,
            current_status=r.current_status,
            created_at=r.created_at,
        )
        for r in rows
    ]


async def fetch_inbox_tasks(
    db: AsyncSession, user_id: UUID, project_id: Optional[UUID] = None, limit: int = 50
) -> list[InboxTaskItem]:
    accessible = accessible_projects_subquery(user_id)

    query = (
        select(
            Task.id,
            Task.project_id,
            Project.name.label("project_name"),
            Task.title,
            Task.status,
            Task.priority,
            Task.due_date,
        )
        .join(Project, Project.id == Task.project_id)
        .where(
            Task.project_id.in_(accessible),
            Task.assignee_id == user_id,
            Task.status.notin_(["completed", "cancelled"]),
        )
    )
    if project_id:
        query = query.where(Task.project_id == project_id)

    query = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).limit(limit)
    result = await db.execute(query)

    return [
        InboxTaskItem(
            id=r.id,
            project_id=r.project_id,
            project_name=r.project_name,
            title=r.title,
            status=r.status,
            priority=r.priority,
            due_date=r.due_date,
        )
        for r in result.all()
    ]


async def fetch_inbox_rfis(
    db: AsyncSession, user_id: UUID, project_id: Optional[UUID] = None, limit: int = 50
) -> list[InboxRFIItem]:
    accessible = accessible_projects_subquery(user_id)

    query = (
        select(
            RFI.id,
            RFI.project_id,
            Project.name.label("project_name"),
            RFI.subject,
            RFI.rfi_number,
            RFI.priority,
            RFI.status,
            RFI.due_date,
        )
        .join(Project, Project.id == RFI.project_id)
        .where(
            RFI.project_id.in_(accessible),
            RFI.assigned_to_id == user_id,
            RFI.status.in_(["open", "waiting_response"]),
        )
    )
    if project_id:
        query = query.where(RFI.project_id == project_id)

    query = query.order_by(RFI.due_date.asc().nullslast(), RFI.created_at.desc()).limit(limit)
    result = await db.execute(query)

    return [
        InboxRFIItem(
            id=r.id,
            project_id=r.project_id,
            project_name=r.project_name,
            subject=r.subject,
            rfi_number=r.rfi_number,
            priority=r.priority,
            status=r.status,
            due_date=r.due_date,
        )
        for r in result.all()
    ]


async def fetch_inbox_meetings(
    db: AsyncSession, user_id: UUID, project_id: Optional[UUID] = None, limit: int = 50
) -> list[InboxMeetingItem]:
    accessible = accessible_projects_subquery(user_id)

    query = (
        select(
            Meeting.id,
            Meeting.project_id,
            Project.name.label("project_name"),
            Meeting.title,
            Meeting.scheduled_date,
            Meeting.location,
            Meeting.meeting_type,
        )
        .join(MeetingAttendee, MeetingAttendee.meeting_id == Meeting.id)
        .join(Project, Project.id == Meeting.project_id)
        .where(
            Meeting.project_id.in_(accessible),
            MeetingAttendee.user_id == user_id,
            MeetingAttendee.attendance_status == "pending",
            Meeting.scheduled_date >= datetime.utcnow(),
        )
    )
    if project_id:
        query = query.where(Meeting.project_id == project_id)

    query = query.order_by(Meeting.scheduled_date.asc()).limit(limit)
    result = await db.execute(query)

    return [
        InboxMeetingItem(
            id=r.id,
            project_id=r.project_id,
            project_name=r.project_name,
            title=r.title,
            scheduled_date=r.scheduled_date,
            location=r.location,
            meeting_type=r.meeting_type,
        )
        for r in result.all()
    ]


async def fetch_inbox_defects(
    db: AsyncSession, user_id: UUID, project_id: Optional[UUID] = None, limit: int = 50
) -> list[InboxDefectItem]:
    accessible = accessible_projects_subquery(user_id)
    my_contact_ids = select(Contact.id).where(Contact.user_id == user_id)

    query = (
        select(
            Defect.id,
            Defect.project_id,
            Project.name.label("project_name"),
            Defect.description,
            Defect.defect_number,
            Defect.severity,
            Defect.category,
        )
        .join(DefectAssignee, DefectAssignee.defect_id == Defect.id)
        .join(Project, Project.id == Defect.project_id)
        .where(
            Defect.project_id.in_(accessible),
            DefectAssignee.contact_id.in_(my_contact_ids),
            Defect.status == "open",
        )
    )
    if project_id:
        query = query.where(Defect.project_id == project_id)

    query = query.order_by(Defect.created_at.desc()).limit(limit)
    result = await db.execute(query)

    return [
        InboxDefectItem(
            id=r.id,
            project_id=r.project_id,
            project_name=r.project_name,
            description=r.description,
            defect_number=r.defect_number,
            severity=r.severity,
            category=r.category,
        )
        for r in result.all()
    ]


def sort_inbox_items(items: list[InboxItem]) -> list[InboxItem]:
    today = date.today()

    def sort_key(item: InboxItem) -> tuple:
        item_date = None
        if hasattr(item, "due_date") and item.due_date:
            item_date = item.due_date if isinstance(item.due_date, date) else item.due_date
        elif hasattr(item, "scheduled_date") and item.scheduled_date:
            d = item.scheduled_date
            item_date = d.date() if isinstance(d, datetime) else d

        if item_date is None:
            return (2, date.max)
        if item_date < today:
            return (0, item_date)
        if item_date == today:
            return (1, item_date)
        return (2, item_date)

    return sorted(items, key=sort_key)


async def get_inbox(
    db: AsyncSession, user_id: UUID, project_id: Optional[UUID] = None, limit: int = 50
) -> InboxResponse:
    approvals, tasks, rfis, meetings, defects = await asyncio.gather(
        fetch_inbox_approvals(db, user_id, project_id, limit),
        fetch_inbox_tasks(db, user_id, project_id, limit),
        fetch_inbox_rfis(db, user_id, project_id, limit),
        fetch_inbox_meetings(db, user_id, project_id, limit),
        fetch_inbox_defects(db, user_id, project_id, limit),
    )

    all_items: list[InboxItem] = [*approvals, *tasks, *rfis, *meetings, *defects]
    sorted_items = sort_inbox_items(all_items)

    counts = InboxCountsResponse(
        total=len(sorted_items),
        approval_count=len(approvals),
        task_count=len(tasks),
        rfi_count=len(rfis),
        meeting_count=len(meetings),
        defect_count=len(defects),
    )

    return InboxResponse(counts=counts, items=sorted_items[:limit])
