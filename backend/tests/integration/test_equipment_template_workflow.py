import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval_decision import ApprovalDecision
from app.models.audit import AuditLog
from app.models.equipment_submission import EquipmentSubmission
from app.models.equipment_template import EquipmentTemplate
from app.models.project import Project, ProjectMember
from app.models.user import User


class TestEquipmentTemplateWorkflow:
    """Integration tests for equipment template end-to-end workflows."""

    @pytest.mark.asyncio
    async def test_template_to_submission_flow(
        self,
        admin_client: AsyncClient,
        project: Project,
        db: AsyncSession,
    ):
        """Create template → create submission → verify linkage."""
        # Step 1: Admin creates a template
        template_response = await admin_client.post(
            "/api/v1/equipment-templates",
            json={
                "name": "Crane Template",
                "name_he": "תבנית מנוף",
                "category": "Lifting Equipment",
                "description": "Standard crane template",
            }
        )

        assert template_response.status_code == 201
        template_data = template_response.json()
        template_id = template_data["id"]

        # Verify template in database
        result = await db.execute(
            select(EquipmentTemplate).where(EquipmentTemplate.id == uuid.UUID(template_id))
        )
        template = result.scalar_one_or_none()
        assert template is not None
        assert template.name == "Crane Template"

        # Step 2: Create a submission from the template
        submission_response = await admin_client.post(
            f"/api/v1/projects/{project.id}/equipment-submissions",
            json={
                "template_id": template_id,
                "name": "Crane for Site A",
                "description": "Need crane for site A construction",
                "specifications": {
                    "capacity": "50 tons",
                    "custom_note": "Needed for 3 months"
                }
            }
        )

        assert submission_response.status_code == 201
        submission_data = submission_response.json()
        submission_id = submission_data["id"]

        # Step 3: Verify linkage between submission, template, and project
        result = await db.execute(
            select(EquipmentSubmission).where(
                EquipmentSubmission.id == uuid.UUID(submission_id)
            )
        )
        submission = result.scalar_one_or_none()
        assert submission is not None
        assert submission.name == "Crane for Site A"
        assert submission.template_id == uuid.UUID(template_id)
        assert submission.project_id == project.id
        assert submission.status == "draft"

        # Step 4: Verify we can retrieve the submission and see the linkage via API
        get_submission_response = await admin_client.get(
            f"/api/v1/projects/{project.id}/equipment-submissions/{submission_id}"
        )

        assert get_submission_response.status_code == 200
        submission_detail = get_submission_response.json()
        assert submission_detail["templateId"] == template_id
        assert submission_detail["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_submission_to_approval_flow(
        self,
        user_client: AsyncClient,
        project: Project,
        equipment_template: EquipmentTemplate,
        db: AsyncSession,
        regular_user: User
    ):
        """Create submission → add decision → verify status update."""
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()

        # Step 1: Create a submission
        submission_response = await user_client.post(
            f"/api/v1/projects/{project.id}/equipment-submissions",
            json={
                "template_id": str(equipment_template.id),
                "name": "Bulldozer Submission",
                "description": "Need bulldozer for site clearing",
                "specifications": {"type": "heavy-duty"}
            }
        )

        assert submission_response.status_code == 201
        submission_data = submission_response.json()
        submission_id = submission_data["id"]
        assert submission_data["status"] == "draft"

        # Step 2: Add an approval decision
        decision_response = await user_client.post(
            f"/api/v1/equipment-submissions/{submission_id}/decisions",
            json={
                "decision": "approved",
                "comments": "Approved for project use"
            }
        )

        assert decision_response.status_code == 201
        decision_data = decision_response.json()
        assert decision_data["decision"] == "approved"
        assert decision_data["comments"] == "Approved for project use"

        # Step 3: Verify submission status was updated to approved
        result = await db.execute(
            select(EquipmentSubmission).where(
                EquipmentSubmission.id == uuid.UUID(submission_id)
            )
        )
        submission = result.scalar_one_or_none()
        assert submission is not None
        assert submission.status == "approved"

        # Step 4: Verify decision is linked to submission
        result = await db.execute(
            select(ApprovalDecision).where(
                ApprovalDecision.submission_id == uuid.UUID(submission_id)
            )
        )
        decision = result.scalar_one_or_none()
        assert decision is not None
        assert decision.decision == "approved"
        assert decision.submission_id == uuid.UUID(submission_id)

        # Step 5: Test rejection workflow
        rejection_submission_response = await user_client.post(
            f"/api/v1/projects/{project.id}/equipment-submissions",
            json={
                "template_id": str(equipment_template.id),
                "name": "Rejected Submission",
                "description": "This will be rejected",
                "specifications": {}
            }
        )

        rejection_submission_id = rejection_submission_response.json()["id"]

        reject_decision_response = await user_client.post(
            f"/api/v1/equipment-submissions/{rejection_submission_id}/decisions",
            json={
                "decision": "rejected",
                "comments": "Not needed at this time"
            }
        )

        assert reject_decision_response.status_code == 201

        # Verify rejection status update
        result = await db.execute(
            select(EquipmentSubmission).where(
                EquipmentSubmission.id == uuid.UUID(rejection_submission_id)
            )
        )
        rejected_submission = result.scalar_one_or_none()
        assert rejected_submission.status == "rejected"

    @pytest.mark.asyncio
    async def test_admin_can_crud_templates(
        self,
        admin_client: AsyncClient,
        equipment_template: EquipmentTemplate
    ):
        """Verify admin can create, update, and delete templates."""
        admin_create_response = await admin_client.post(
            "/api/v1/equipment-templates",
            json={
                "name": "Admin Template",
                "name_he": "תבנית מנהל",
                "category": "Test"
            }
        )
        assert admin_create_response.status_code == 201
        template_id = admin_create_response.json()["id"]

        admin_update_response = await admin_client.put(
            f"/api/v1/equipment-templates/{equipment_template.id}",
            json={"name": "Updated by Admin"}
        )
        assert admin_update_response.status_code == 200

        admin_delete_response = await admin_client.delete(
            f"/api/v1/equipment-templates/{template_id}"
        )
        assert admin_delete_response.status_code == 200

    @pytest.mark.asyncio
    async def test_user_cannot_crud_templates(
        self,
        user_client: AsyncClient,
        equipment_template: EquipmentTemplate,
    ):
        """Verify non-admin users get 403 on template CRUD."""
        user_create_response = await user_client.post(
            "/api/v1/equipment-templates",
            json={
                "name": "User Template",
                "name_he": "תבנית משתמש",
                "category": "Test"
            }
        )
        assert user_create_response.status_code == 403
        assert user_create_response.json()["detail"] == "Admin access required"

        user_update_response = await user_client.put(
            f"/api/v1/equipment-templates/{equipment_template.id}",
            json={"name": "Updated by User"}
        )
        assert user_update_response.status_code == 403

        user_delete_response = await user_client.delete(
            f"/api/v1/equipment-templates/{equipment_template.id}"
        )
        assert user_delete_response.status_code == 403

    @pytest.mark.asyncio
    async def test_audit_log_integration(
        self,
        admin_client: AsyncClient,
        project: Project,
        equipment_template: EquipmentTemplate,
        db: AsyncSession,
    ):
        """Verify all operations create audit log entries."""
        # Operation 1: Create template (admin)
        create_template_response = await admin_client.post(
            "/api/v1/equipment-templates",
            json={
                "name": "Audit Test Template",
                "name_he": "תבנית בדיקת ביקורת",
                "category": "Test",
                "description": "For audit testing"
            }
        )
        assert create_template_response.status_code == 201
        template_id = create_template_response.json()["id"]

        # Verify audit log for template creation
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "equipment_template",
                AuditLog.entity_id == uuid.UUID(template_id),
                AuditLog.action == "create"
            )
        )
        create_audit = result.scalar_one_or_none()
        assert create_audit is not None

        # Operation 2: Update template (admin)
        await admin_client.put(
            f"/api/v1/equipment-templates/{template_id}",
            json={"name": "Updated Audit Template"}
        )

        # Verify audit log for template update
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "equipment_template",
                AuditLog.entity_id == uuid.UUID(template_id),
                AuditLog.action == "update"
            )
        )
        update_audit = result.scalar_one_or_none()
        assert update_audit is not None

        # Operation 3: Create submission
        create_submission_response = await admin_client.post(
            f"/api/v1/projects/{project.id}/equipment-submissions",
            json={
                "template_id": str(equipment_template.id),
                "name": "Audit Test Submission",
                "description": "For audit testing"
            }
        )
        assert create_submission_response.status_code == 201
        submission_id = create_submission_response.json()["id"]

        # Verify audit log for submission creation
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "equipment_submission",
                AuditLog.entity_id == uuid.UUID(submission_id),
                AuditLog.action == "create"
            )
        )
        submission_create_audit = result.scalar_one_or_none()
        assert submission_create_audit is not None
        assert submission_create_audit.project_id == project.id

        # Operation 4: Update submission
        await admin_client.put(
            f"/api/v1/projects/{project.id}/equipment-submissions/{submission_id}",
            json={"name": "Updated Audit Submission"}
        )

        # Verify audit log for submission update
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "equipment_submission",
                AuditLog.entity_id == uuid.UUID(submission_id),
                AuditLog.action == "update"
            )
        )
        submission_update_audit = result.scalar_one_or_none()
        assert submission_update_audit is not None

        # Operation 5: Add approval decision (creates 2 audit logs: decision + status change)
        await admin_client.post(
            f"/api/v1/equipment-submissions/{submission_id}/decisions",
            json={
                "decision": "approved",
                "comments": "Audit test approval"
            }
        )

        # Verify audit log for decision creation
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "approval_decision",
                AuditLog.action == "create"
            )
        )
        decision_audit = result.scalar_one_or_none()
        assert decision_audit is not None

        # Verify audit log for status change
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "equipment_submission",
                AuditLog.entity_id == uuid.UUID(submission_id),
                AuditLog.action == "status_change"
            )
        )
        status_change_audit = result.scalar_one_or_none()
        assert status_change_audit is not None

        # Operation 6: Delete template
        # Create a new template to delete (can't delete one with submissions)
        delete_template_response = await admin_client.post(
            "/api/v1/equipment-templates",
            json={"name": "Template to Delete", "name_he": "תבנית למחיקה", "category": "Test"}
        )
        delete_template_id = delete_template_response.json()["id"]

        await admin_client.delete(
            f"/api/v1/equipment-templates/{delete_template_id}"
        )

        # Verify audit log for template deletion
        result = await db.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "equipment_template",
                AuditLog.entity_id == uuid.UUID(delete_template_id),
                AuditLog.action == "delete"
            )
        )
        delete_audit = result.scalar_one_or_none()
        assert delete_audit is not None

        # Summary: Verify we have at least 8 audit log entries from all operations
        result = await db.execute(select(AuditLog))
        all_audits = result.scalars().all()
        assert len(all_audits) >= 8
