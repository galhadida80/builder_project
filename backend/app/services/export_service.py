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
from app.models.user import User
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
                "project_code": None,
                "status": project.status,
                "start_date": project.start_date.isoformat() if project.start_date else None,
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
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
        """Create ZIP archive with all project files organized by entity type."""
        from app.services.storage_service import get_storage_backend

        storage = get_storage_backend()

        # Create in-memory ZIP file
        zip_buffer = io.BytesIO()
        manifest_entries = []
        skipped_files = []

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Get all project files
            result = await self.db.execute(
                select(File)
                .where(File.project_id == project_id)
                .order_by(File.entity_type, File.uploaded_at)
            )
            files = result.scalars().all()

            # Track filenames to handle duplicates
            filename_counter = {}

            for file_obj in files:
                if not file_obj.storage_path:
                    skipped_files.append({
                        "id": str(file_obj.id),
                        "filename": file_obj.filename,
                        "reason": "No storage path"
                    })
                    continue

                try:
                    # Download file content from storage
                    file_content = await storage.get_file_content(file_obj.storage_path)

                    # Organize files by entity type
                    base_filename = file_obj.filename
                    entity_folder = file_obj.entity_type or "other"

                    # Handle duplicate filenames
                    filename_key = f"{entity_folder}/{base_filename}"
                    if filename_key in filename_counter:
                        filename_counter[filename_key] += 1
                        name_parts = base_filename.rsplit(".", 1)
                        if len(name_parts) == 2:
                            base_filename = f"{name_parts[0]}_{filename_counter[filename_key]}.{name_parts[1]}"
                        else:
                            base_filename = f"{base_filename}_{filename_counter[filename_key]}"
                    else:
                        filename_counter[filename_key] = 0

                    # Create archive path
                    archive_path = f"files/{entity_folder}/{base_filename}"
                    zip_file.writestr(archive_path, file_content)

                    # Add to manifest
                    manifest_entries.append({
                        "id": str(file_obj.id),
                        "filename": file_obj.filename,
                        "archive_path": archive_path,
                        "entity_type": file_obj.entity_type,
                        "entity_id": str(file_obj.entity_id),
                        "file_type": file_obj.file_type,
                        "file_size": file_obj.file_size,
                        "uploaded_at": file_obj.uploaded_at.isoformat() if file_obj.uploaded_at else None,
                    })

                except Exception as e:
                    # Track files that couldn't be retrieved
                    skipped_files.append({
                        "id": str(file_obj.id),
                        "filename": file_obj.filename,
                        "reason": f"Failed to retrieve: {str(e)}"
                    })
                    continue

            # Add manifest file to archive
            manifest_data = {
                "export_date": utcnow().isoformat(),
                "project_id": str(project_id),
                "total_files": len(manifest_entries),
                "skipped_files": len(skipped_files),
                "files": manifest_entries,
                "errors": skipped_files if skipped_files else []
            }
            manifest_json = json.dumps(manifest_data, indent=2, ensure_ascii=False)
            zip_file.writestr("manifest.json", manifest_json)

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
            .options(
                selectinload(EquipmentSubmission.created_by),
                selectinload(EquipmentSubmission.template),
                selectinload(EquipmentSubmission.decisions)
            )
        )
        equipment = result.scalars().all()

        return [
            {
                "id": str(eq.id),
                "project_id": str(eq.project_id),
                "template_id": str(eq.template_id),
                "name": eq.name,
                "description": eq.description,
                "specifications": eq.specifications,
                "status": eq.status,
                "notes": eq.notes,
                "created_at": eq.created_at.isoformat() if eq.created_at else None,
                "updated_at": eq.updated_at.isoformat() if eq.updated_at else None,
                "created_by": {
                    "id": str(eq.created_by.id),
                    "email": eq.created_by.email,
                    "full_name": eq.created_by.full_name,
                } if eq.created_by else None,
                "template_name": eq.template.name if eq.template else None,
                "decisions": [
                    {
                        "id": str(dec.id),
                        "decision": dec.decision,
                        "comments": dec.comments,
                        "decided_at": dec.decided_at.isoformat() if dec.decided_at else None,
                    }
                    for dec in eq.decisions
                ] if hasattr(eq, 'decisions') else [],
            }
            for eq in equipment
        ]

    async def _get_materials_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all material submissions for a project."""
        result = await self.db.execute(
            select(MaterialApprovalSubmission)
            .where(MaterialApprovalSubmission.project_id == project_id)
            .options(
                selectinload(MaterialApprovalSubmission.submitted_by),
                selectinload(MaterialApprovalSubmission.template),
                selectinload(MaterialApprovalSubmission.material),
                selectinload(MaterialApprovalSubmission.decisions)
            )
        )
        materials = result.scalars().all()

        return [
            {
                "id": str(mat.id),
                "project_id": str(mat.project_id),
                "template_id": str(mat.template_id) if mat.template_id else None,
                "material_id": str(mat.material_id) if mat.material_id else None,
                "name": mat.name,
                "specifications": mat.specifications,
                "documents": mat.documents,
                "checklist_responses": mat.checklist_responses,
                "additional_data": mat.additional_data,
                "status": mat.status,
                "submitted_at": mat.submitted_at.isoformat() if mat.submitted_at else None,
                "created_at": mat.created_at.isoformat() if mat.created_at else None,
                "updated_at": mat.updated_at.isoformat() if mat.updated_at else None,
                "submitted_by": {
                    "id": str(mat.submitted_by.id),
                    "email": mat.submitted_by.email,
                    "full_name": mat.submitted_by.full_name,
                } if mat.submitted_by else None,
                "template_name": mat.template.name if mat.template else None,
                "decisions": [
                    {
                        "id": str(dec.id),
                        "decision": dec.decision,
                        "comments": dec.comments,
                        "decided_at": dec.decided_at.isoformat() if dec.decided_at else None,
                    }
                    for dec in mat.decisions
                ] if hasattr(mat, 'decisions') else [],
            }
            for mat in materials
        ]

    async def _get_inspections_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all inspections with findings for a project."""
        result = await self.db.execute(
            select(Inspection)
            .where(Inspection.project_id == project_id)
            .options(
                selectinload(Inspection.findings),
                selectinload(Inspection.created_by),
                selectinload(Inspection.consultant_type)
            )
        )
        inspections = result.scalars().all()

        return [
            {
                "id": str(insp.id),
                "project_id": str(insp.project_id),
                "consultant_type_id": str(insp.consultant_type_id),
                "status": insp.status,
                "scheduled_date": insp.scheduled_date.isoformat() if insp.scheduled_date else None,
                "completed_date": insp.completed_date.isoformat() if insp.completed_date else None,
                "current_stage": insp.current_stage,
                "notes": insp.notes,
                "created_at": insp.created_at.isoformat() if insp.created_at else None,
                "updated_at": insp.updated_at.isoformat() if insp.updated_at else None,
                "created_by": {
                    "id": str(insp.created_by.id),
                    "email": insp.created_by.email,
                    "full_name": insp.created_by.full_name,
                } if insp.created_by else None,
                "consultant_type_name": insp.consultant_type.name if insp.consultant_type else None,
                "findings": [
                    {
                        "id": str(f.id),
                        "title": f.title,
                        "description": f.description,
                        "severity": f.severity,
                        "status": f.status,
                        "location": f.location,
                        "photos": f.photos,
                        "created_at": f.created_at.isoformat() if f.created_at else None,
                        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
                    }
                    for f in insp.findings
                ],
            }
            for insp in inspections
        ]

    async def _get_rfis_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all RFIs for a project."""
        from app.models.rfi import RFIResponse

        result = await self.db.execute(
            select(RFI)
            .where(RFI.project_id == project_id)
            .options(
                selectinload(RFI.created_by),
                selectinload(RFI.assigned_to),
                selectinload(RFI.responses)
            )
        )
        rfis = result.scalars().all()

        return [
            {
                "id": str(rfi.id),
                "project_id": str(rfi.project_id),
                "rfi_number": rfi.rfi_number,
                "subject": rfi.subject,
                "question": rfi.question,
                "category": rfi.category,
                "status": rfi.status,
                "priority": rfi.priority,
                "to_email": rfi.to_email,
                "to_name": rfi.to_name,
                "cc_emails": rfi.cc_emails,
                "location": rfi.location,
                "drawing_reference": rfi.drawing_reference,
                "specification_reference": rfi.specification_reference,
                "attachments": rfi.attachments,
                "due_date": rfi.due_date.isoformat() if rfi.due_date else None,
                "responded_at": rfi.responded_at.isoformat() if rfi.responded_at else None,
                "closed_at": rfi.closed_at.isoformat() if rfi.closed_at else None,
                "sent_at": rfi.sent_at.isoformat() if rfi.sent_at else None,
                "created_at": rfi.created_at.isoformat() if rfi.created_at else None,
                "updated_at": rfi.updated_at.isoformat() if rfi.updated_at else None,
                "created_by": {
                    "id": str(rfi.created_by.id),
                    "email": rfi.created_by.email,
                    "full_name": rfi.created_by.full_name,
                } if rfi.created_by else None,
                "assigned_to": {
                    "id": str(rfi.assigned_to.id),
                    "email": rfi.assigned_to.email,
                    "full_name": rfi.assigned_to.full_name,
                } if rfi.assigned_to else None,
                "responses": [
                    {
                        "id": str(resp.id),
                        "response_text": resp.response_text,
                        "from_email": resp.from_email,
                        "from_name": resp.from_name,
                        "is_internal": resp.is_internal,
                        "created_at": resp.created_at.isoformat() if resp.created_at else None,
                    }
                    for resp in rfi.responses
                ] if hasattr(rfi, 'responses') else [],
            }
            for rfi in rfis
        ]

    async def _get_tasks_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all tasks for a project."""
        result = await self.db.execute(
            select(Task)
            .where(Task.project_id == project_id)
            .options(
                selectinload(Task.assignee),
                selectinload(Task.reporter),
                selectinload(Task.created_by),
                selectinload(Task.dependencies)
            )
        )
        tasks = result.scalars().all()

        return [
            {
                "id": str(task.id),
                "project_id": str(task.project_id),
                "task_number": task.task_number,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "start_date": task.start_date.isoformat() if task.start_date else None,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "estimated_hours": task.estimated_hours,
                "actual_hours": task.actual_hours,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None,
                "assignee": {
                    "id": str(task.assignee.id),
                    "email": task.assignee.email,
                    "full_name": task.assignee.full_name,
                } if task.assignee else None,
                "reporter": {
                    "id": str(task.reporter.id),
                    "email": task.reporter.email,
                    "full_name": task.reporter.full_name,
                } if task.reporter else None,
                "created_by": {
                    "id": str(task.created_by.id),
                    "email": task.created_by.email,
                    "full_name": task.created_by.full_name,
                } if task.created_by else None,
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
        from app.models.meeting import MeetingAttendee

        result = await self.db.execute(
            select(Meeting)
            .where(Meeting.project_id == project_id)
            .options(
                selectinload(Meeting.created_by),
                selectinload(Meeting.attendees)
            )
        )
        meetings = result.scalars().all()

        return [
            {
                "id": str(meeting.id),
                "project_id": str(meeting.project_id),
                "title": meeting.title,
                "description": meeting.description,
                "meeting_type": meeting.meeting_type,
                "location": meeting.location,
                "scheduled_date": meeting.scheduled_date.isoformat() if meeting.scheduled_date else None,
                "scheduled_time": meeting.scheduled_time,
                "summary": meeting.summary,
                "action_items": meeting.action_items,
                "status": meeting.status,
                "has_time_slots": meeting.has_time_slots,
                "calendar_synced": meeting.calendar_synced,
                "meeting_format": meeting.meeting_format,
                "online_link": meeting.online_link,
                "created_at": meeting.created_at.isoformat() if meeting.created_at else None,
                "updated_at": meeting.updated_at.isoformat() if meeting.updated_at else None,
                "created_by": {
                    "id": str(meeting.created_by.id),
                    "email": meeting.created_by.email,
                    "full_name": meeting.created_by.full_name,
                } if meeting.created_by else None,
                "attendees": [
                    {
                        "id": str(att.id),
                        "role": att.role,
                        "attendance_status": att.attendance_status,
                        "email": att.email,
                    }
                    for att in meeting.attendees
                ] if hasattr(meeting, 'attendees') else [],
            }
            for meeting in meetings
        ]

    async def _get_defects_data(self, project_id: UUID) -> list[dict[str, Any]]:
        """Get all defects for a project."""
        result = await self.db.execute(
            select(Defect)
            .where(Defect.project_id == project_id)
            .options(
                selectinload(Defect.created_by),
                selectinload(Defect.area),
                selectinload(Defect.reporter),
                selectinload(Defect.assigned_contact),
                selectinload(Defect.assignees)
            )
        )
        defects = result.scalars().all()

        return [
            {
                "id": str(defect.id),
                "project_id": str(defect.project_id),
                "defect_number": defect.defect_number,
                "category": defect.category,
                "defect_type": defect.defect_type,
                "description": defect.description,
                "severity": defect.severity,
                "status": defect.status,
                "is_repeated": defect.is_repeated,
                "due_date": defect.due_date.isoformat() if defect.due_date else None,
                "resolved_at": defect.resolved_at.isoformat() if defect.resolved_at else None,
                "created_at": defect.created_at.isoformat() if defect.created_at else None,
                "updated_at": defect.updated_at.isoformat() if defect.updated_at else None,
                "area": {
                    "id": str(defect.area.id),
                    "name": defect.area.name,
                    "area_code": defect.area.area_code,
                } if defect.area else None,
                "created_by": {
                    "id": str(defect.created_by.id),
                    "email": defect.created_by.email,
                    "full_name": defect.created_by.full_name,
                } if defect.created_by else None,
                "reporter": {
                    "id": str(defect.reporter.id),
                    "contact_name": defect.reporter.contact_name,
                    "email": defect.reporter.email,
                } if defect.reporter else None,
                "assigned_contact": {
                    "id": str(defect.assigned_contact.id),
                    "contact_name": defect.assigned_contact.contact_name,
                    "email": defect.assigned_contact.email,
                } if defect.assigned_contact else None,
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
                "filename": file_obj.filename,
                "entity_type": file_obj.entity_type,
                "entity_id": str(file_obj.entity_id),
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
            "created_at": area.created_at.isoformat() if area.created_at else None,
            "updated_at": area.updated_at.isoformat() if area.updated_at else None,
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
            "role_description": contact.role_description,
            "created_at": contact.created_at.isoformat() if contact.created_at else None,
            "updated_at": contact.updated_at.isoformat() if contact.updated_at else None,
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
