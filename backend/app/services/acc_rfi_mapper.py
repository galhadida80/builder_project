import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rfi import RFI
from app.utils import utcnow

logger = logging.getLogger(__name__)


class ACCRFIMapper:
    """Maps ACC Issue data to BuilderOps RFI model."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def map_acc_issue_to_rfi(
        self,
        acc_issue: dict[str, Any],
        project_id: uuid.UUID,
        user_mapper
    ) -> dict[str, Any]:
        """
        Transform ACC issue JSON to RFI model fields.

        Returns dict with:
        - subject, question, category, priority, status
        - location, due_date, to_email, assigned_to_id
        - rfi_number, created_by_id
        """
        rfi_number = await self._generate_rfi_number(acc_issue)

        subject = acc_issue.get("title", "ACC RFI")
        question = acc_issue.get("description", "")

        category = self._map_category(
            acc_issue.get("issueType", {}).get("title", "")
        )
        priority = self._map_priority(acc_issue.get("priority", ""))
        status = self._map_status(acc_issue.get("status", ""))

        created_by_email = acc_issue.get("createdBy", {}).get("email", "")
        created_by_id = await user_mapper.map_acc_user_to_builderops_user(
            created_by_email,
            project_id
        )

        assigned_to_email = acc_issue.get("assignedTo", {}).get("email")
        assigned_to_id = None
        if assigned_to_email:
            assigned_to_id = await user_mapper.map_acc_user_to_builderops_user(
                assigned_to_email,
                project_id
            )

        to_email = assigned_to_email or created_by_email or "noreply@autodesk.com"
        to_name = acc_issue.get("assignedTo", {}).get("name")

        due_date = self._parse_due_date(acc_issue.get("dueDate"))
        location = acc_issue.get("location", {}).get("name")
        attachments = self._map_attachments(acc_issue.get("attachments", []))

        return {
            "rfi_number": rfi_number,
            "subject": subject,
            "question": question,
            "category": category,
            "priority": priority,
            "status": status,
            "created_by_id": created_by_id,
            "assigned_to_id": assigned_to_id,
            "to_email": to_email,
            "to_name": to_name,
            "cc_emails": [],
            "due_date": due_date,
            "location": location,
            "attachments": attachments
        }

    async def _generate_rfi_number(self, acc_issue: dict[str, Any]) -> str:
        """Generate unique RFI number from ACC issue."""
        acc_issue_number = acc_issue.get("displayId", acc_issue.get("id", ""))
        rfi_number = f"RFI-ACC-{acc_issue_number}"

        result = await self.db.execute(
            select(RFI.rfi_number).where(RFI.rfi_number == rfi_number)
        )
        if result.scalar_one_or_none():
            year = utcnow().year
            prefix = f"RFI-ACC-{year}-"
            result = await self.db.execute(
                select(func.max(RFI.rfi_number)).where(
                    RFI.rfi_number.like(f"{prefix}%")
                )
            )
            max_number = result.scalar()
            if max_number:
                import re
                match = re.search(r"(\d+)$", max_number)
                seq = int(match.group(1)) + 1 if match else 1
            else:
                seq = 1
            rfi_number = f"{prefix}{seq:05d}"

        return rfi_number

    def _map_category(self, acc_type: str) -> str:
        """Map ACC issue type to RFI category."""
        category_mapping = {
            "design": "design",
            "structural": "structural",
            "mep": "mep",
            "architectural": "architectural",
            "specification": "specifications",
            "schedule": "schedule",
            "cost": "cost"
        }
        return category_mapping.get(acc_type.lower(), "other")

    def _map_priority(self, acc_priority: str) -> str:
        """Map ACC priority to RFI priority."""
        priority_mapping = {
            "low": "low",
            "normal": "medium",
            "high": "high",
            "critical": "urgent"
        }
        return priority_mapping.get(acc_priority.lower(), "medium")

    def _map_status(self, acc_status: str) -> str:
        """Map ACC status to RFI status."""
        from app.models.rfi import RFIStatus

        status_mapping = {
            "draft": RFIStatus.DRAFT.value,
            "open": RFIStatus.OPEN.value,
            "in_review": RFIStatus.WAITING_RESPONSE.value,
            "answered": RFIStatus.ANSWERED.value,
            "closed": RFIStatus.CLOSED.value,
            "void": RFIStatus.CANCELLED.value
        }
        return status_mapping.get(acc_status.lower(), RFIStatus.OPEN.value)

    def _parse_due_date(self, due_date_str: str | None) -> datetime | None:
        """Parse ACC due date string to datetime."""
        if not due_date_str:
            return None

        try:
            return datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        except Exception:
            return None

    def _map_attachments(self, acc_attachments: list) -> list[dict[str, Any]]:
        """Map ACC attachments to RFI attachment format."""
        attachments = []
        for attachment in acc_attachments:
            attachments.append({
                "name": attachment.get("name"),
                "url": attachment.get("url"),
                "size": attachment.get("size"),
                "type": attachment.get("type")
            })
        return attachments
