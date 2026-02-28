import io
import csv
import json
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.area import ConstructionArea
from app.models.budget import BudgetLineItem, CostEntry
from app.models.contact import Contact
from app.models.defect import Defect
from app.models.equipment_submission import EquipmentSubmission
from app.models.file import File
from app.models.inspection import Finding, Inspection
from app.models.material_template import MaterialApprovalSubmission
from app.models.meeting import Meeting
from app.models.project import Project
from app.models.rfi import RFI
from app.models.task import Task
from app.utils import utcnow


class ExportService:
    """Service for exporting project data in various formats."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def export_project_json(self, project_id: UUID) -> dict[str, Any]:
        """Export complete project data as JSON structure."""
        result = await self.db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(
                selectinload(Project.areas),
                selectinload(Project.contacts),
            )
        )
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Aggregate all project data
        equipment_data = await self._get_equipment_data(project_id)
        materials_data = await self._get_materials_data(project_id)
        inspections_data = await self._get_inspections_data(project_id)
        rfis_data = await self._get_rfis_data(project_id)
        tasks_data = await self._get_tasks_data(project_id)
        budgets_data = await self._get_budgets_data(project_id)
        meetings_data = await self._get_meetings_data(project_id)
        defects_data = await self._get_defects_data(project_id)
        files_data = await self._get_files_data(project_id)

        return {
            "schema_version": "1.0",
            "export_date": utcnow().isoformat(),
            "project": {
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "project_code": project.project_code,
                "status": project.status,
                "start_date": project.start_date.isoformat() if project.start_date else None,
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "created_at": project.created_at.isoformat() if project.created_at else None,
            },
            "areas": [self._serialize_area(area) for area in project.areas],
            "contacts": [self._serialize_contact(contact) for contact in project.contacts],
            "equipment": equipment_data,
            "materials": materials_data,
            "inspections": inspections_data,
            "rfis": rfis_data,
            "tasks": tasks_data,
            "budgets": budgets_data,
            "meetings": meetings_data,
            "defects": defects_data,
            "files": files_data,
        }

    async def export_equipment_csv(self, project_id: UUID) -> str:
        """Export equipment submissions as CSV."""
        equipment_data = await self._get_equipment_data(project_id)
        if not equipment_data:
            return ""

        flat_data = []
        for item in equipment_data:
            flat_data.append({
                "id": item["id"],
                "name": item["name"],
                "manufacturer": item.get("manufacturer", ""),
                "model": item.get("model", ""),
                "status": item["status"],
                "area_code": item.get("area_code", ""),
                "created_at": item.get("created_at", ""),
                "updated_at": item.get("updated_at", ""),
            })

        return self._generate_csv(flat_data)

    async def export_materials_csv(self, project_id: UUID) -> str:
        """Export material approval submissions as CSV."""
        materials_data = await self._get_materials_data(project_id)
        if not materials_data:
            return ""

        flat_data = []
        for item in materials_data:
            flat_data.append({
                "id": item["id"],
                "name": item["name"],
                "manufacturer": item.get("manufacturer", ""),
                "status": item["status"],
                "area_code": item.get("area_code", ""),
                "created_at": item.get("created_at", ""),
                "updated_at": item.get("updated_at", ""),
            })

        return self._generate_csv(flat_data)

    async def export_inspections_csv(self, project_id: UUID) -> str:
        """Export inspections as CSV."""
        inspections_data = await self._get_inspections_data(project_id)
        if not inspections_data:
            return ""

        flat_data = []
        for item in inspections_data:
            flat_data.append({
                "id": item["id"],
                "inspection_number": item.get("inspection_number", ""),
                "status": item["status"],
                "scheduled_date": item.get("scheduled_date", ""),
                "completed_date": item.get("completed_date", ""),
                "consultant_type": item.get("consultant_type", ""),
                "findings_count": len(item.get("findings", [])),
            })

        return self._generate_csv(flat_data)

    async def export_rfis_csv(self, project_id: UUID) -> str:
        """Export RFIs as CSV."""
        rfis_data = await self._get_rfis_data(project_id)
        if not rfis_data:
            return ""

        flat_data = []
        for item in rfis_data:
            flat_data.append({
                "id": item["id"],
                "rfi_number": item.get("rfi_number", ""),
                "subject": item.get("subject", ""),
                "question": item.get("question", ""),
                "status": item["status"],
                "priority": item.get("priority", ""),
                "created_at": item.get("created_at", ""),
                "due_date": item.get("due_date", ""),
            })

        return self._generate_csv(flat_data)

    async def export_tasks_csv(self, project_id: UUID) -> str:
        """Export tasks as CSV."""
        tasks_data = await self._get_tasks_data(project_id)
        if not tasks_data:
            return ""

        flat_data = []
        for item in tasks_data:
            flat_data.append({
                "id": item["id"],
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "status": item.get("status", ""),
                "priority": item.get("priority", ""),
                "due_date": item.get("due_date", ""),
                "created_at": item.get("created_at", ""),
            })

        return self._generate_csv(flat_data)

    async def export_budgets_csv(self, project_id: UUID) -> str:
        """Export budget line items as CSV."""
        budgets_data = await self._get_budgets_data(project_id)
        if not budgets_data:
            return ""

        flat_data = []
        for item in budgets_data:
            flat_data.append({
                "id": item["id"],
                "name": item.get("name", ""),
                "category": item.get("category", ""),
                "description": item.get("description", ""),
                "budgeted_amount": item.get("budgeted_amount", 0),
                "total_costs": sum(
                    entry.get("amount", 0) for entry in item.get("cost_entries", [])
                ),
            })

        return self._generate_csv(flat_data)

    async def create_export_archive(self, project_id: UUID, storage_path: str) -> int:
        """Create ZIP archive with all project files."""
        from app.services.storage_service import get_storage_backend

        storage = get_storage_backend()

        # Create in-memory ZIP file
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Get all project files
            result = await self.db.execute(
                select(File).where(File.project_id == project_id)
            )
            files = result.scalars().all()

            for file_obj in files:
                if file_obj.storage_path:
                    try:
                        # Download file content from storage
                        file_content = await storage.get_file_content(file_obj.storage_path)
                        # Add to ZIP with proper path structure
                        archive_path = f"files/{file_obj.file_name}"
                        zip_file.writestr(archive_path, file_content)
                    except Exception:
                        # Skip files that can't be retrieved
                        continue

        zip_buffer.seek(0)
        zip_bytes = zip_buffer.read()

        # Save ZIP to storage
        file_size = await storage.save_bytes(zip_bytes, storage_path, "application/zip")

        return file_size

    # Helper methods for data aggregation

    async def _get_equipment_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all equipment submissions for a project."""
        result = await self.db.execute(
            select(EquipmentSubmission)
            .where(EquipmentSubmission.project_id == project_id)
        )
        equipment = result.scalars().all()

        return [
            {
                "id": str(eq.id),
                "name": eq.name,
                "manufacturer": eq.manufacturer,
                "model": eq.model,
                "status": eq.status,
                "area_code": eq.area_code,
                "created_at": eq.created_at.isoformat() if eq.created_at else None,
                "updated_at": eq.updated_at.isoformat() if eq.updated_at else None,
            }
            for eq in equipment
        ]

    async def _get_materials_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all material submissions for a project."""
        result = await self.db.execute(
            select(MaterialApprovalSubmission)
            .where(MaterialApprovalSubmission.project_id == project_id)
        )
        materials = result.scalars().all()

        return [
            {
                "id": str(mat.id),
                "name": mat.name,
                "manufacturer": mat.manufacturer,
                "status": mat.status,
                "area_code": mat.area_code,
                "created_at": mat.created_at.isoformat() if mat.created_at else None,
                "updated_at": mat.updated_at.isoformat() if mat.updated_at else None,
            }
            for mat in materials
        ]

    async def _get_inspections_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all inspections with findings for a project."""
        result = await self.db.execute(
            select(Inspection)
            .where(Inspection.project_id == project_id)
            .options(selectinload(Inspection.findings))
        )
        inspections = result.scalars().all()

        return [
            {
                "id": str(insp.id),
                "inspection_number": insp.inspection_number,
                "status": insp.status,
                "scheduled_date": insp.scheduled_date.isoformat() if insp.scheduled_date else None,
                "completed_date": insp.completed_date.isoformat() if insp.completed_date else None,
                "consultant_type": str(insp.consultant_type_id) if insp.consultant_type_id else None,
                "findings": [
                    {
                        "id": str(f.id),
                        "title": f.title,
                        "severity": f.severity,
                        "status": f.status,
                        "location": f.location,
                    }
                    for f in insp.findings
                ],
            }
            for insp in inspections
        ]

    async def _get_rfis_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all RFIs for a project."""
        result = await self.db.execute(
            select(RFI).where(RFI.project_id == project_id)
        )
        rfis = result.scalars().all()

        return [
            {
                "id": str(rfi.id),
                "rfi_number": rfi.rfi_number,
                "subject": rfi.subject,
                "question": rfi.question,
                "status": rfi.status,
                "priority": rfi.priority,
                "created_at": rfi.created_at.isoformat() if rfi.created_at else None,
                "due_date": rfi.due_date.isoformat() if rfi.due_date else None,
            }
            for rfi in rfis
        ]

    async def _get_tasks_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all tasks for a project."""
        result = await self.db.execute(
            select(Task).where(Task.project_id == project_id)
        )
        tasks = result.scalars().all()

        return [
            {
                "id": str(task.id),
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "created_at": task.created_at.isoformat() if task.created_at else None,
            }
            for task in tasks
        ]

    async def _get_budgets_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all budget line items with cost entries for a project."""
        result = await self.db.execute(
            select(BudgetLineItem)
            .where(BudgetLineItem.project_id == project_id)
            .options(selectinload(BudgetLineItem.cost_entries))
        )
        budget_items = result.scalars().all()

        return [
            {
                "id": str(item.id),
                "name": item.name,
                "category": item.category,
                "description": item.description,
                "budgeted_amount": float(item.budgeted_amount) if item.budgeted_amount else 0,
                "cost_entries": [
                    {
                        "id": str(entry.id),
                        "description": entry.description,
                        "amount": float(entry.amount) if entry.amount else 0,
                        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
                        "vendor": entry.vendor,
                    }
                    for entry in item.cost_entries
                ],
            }
            for item in budget_items
        ]

    async def _get_meetings_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all meetings for a project."""
        result = await self.db.execute(
            select(Meeting).where(Meeting.project_id == project_id)
        )
        meetings = result.scalars().all()

        return [
            {
                "id": str(meeting.id),
                "title": meeting.title,
                "description": meeting.description,
                "scheduled_date": meeting.scheduled_date.isoformat() if meeting.scheduled_date else None,
                "location": meeting.location,
                "status": meeting.status,
            }
            for meeting in meetings
        ]

    async def _get_defects_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all defects for a project."""
        result = await self.db.execute(
            select(Defect).where(Defect.project_id == project_id)
        )
        defects = result.scalars().all()

        return [
            {
                "id": str(defect.id),
                "title": defect.title,
                "description": defect.description,
                "severity": defect.severity,
                "status": defect.status,
                "location": defect.location,
                "created_at": defect.created_at.isoformat() if defect.created_at else None,
            }
            for defect in defects
        ]

    async def _get_files_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all file metadata for a project."""
        result = await self.db.execute(
            select(File).where(File.project_id == project_id)
        )
        files = result.scalars().all()

        return [
            {
                "id": str(file_obj.id),
                "file_name": file_obj.file_name,
                "file_type": file_obj.file_type,
                "file_size": file_obj.file_size,
                "storage_path": file_obj.storage_path,
                "uploaded_at": file_obj.uploaded_at.isoformat() if file_obj.uploaded_at else None,
            }
            for file_obj in files
        ]

    def _serialize_area(self, area: ConstructionArea) -> dict[str, Any]:
        """Serialize ConstructionArea model to dict."""
        return {
            "id": str(area.id),
            "name": area.name,
            "area_code": area.area_code,
            "floor_number": area.floor_number,
            "total_units": area.total_units,
            "area_type": area.area_type,
            "status": area.status,
        }

    def _serialize_contact(self, contact: Contact) -> dict[str, Any]:
        """Serialize Contact model to dict."""
        return {
            "id": str(contact.id),
            "contact_name": contact.contact_name,
            "contact_type": contact.contact_type,
            "company_name": contact.company_name,
            "email": contact.email,
            "phone": contact.phone,
        }

    def _generate_csv(self, data: list[dict]) -> str:
        """Generate CSV string from list of dicts."""
        if not data:
            return ""

        output = io.StringIO()
        output.write("\ufeff")  # UTF-8 BOM for Excel compatibility
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()
