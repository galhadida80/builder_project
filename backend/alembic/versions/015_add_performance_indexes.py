"""Add performance indexes for frequently queried columns

Revision ID: 015
Revises: 014
Create Date: 2026-02-09

"""
from typing import Sequence, Union
from alembic import op

revision: str = '015'
down_revision: Union[str, None] = '014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. AuditLog indexes - most queried table for history/compliance
    op.create_index("ix_audit_logs_project_id", "audit_logs", ["project_id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_entity_type_entity_id", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # 2. Equipment indexes - queried by project_id, status, created_at in analytics
    op.create_index("ix_equipment_project_id", "equipment", ["project_id"])
    op.create_index("ix_equipment_status", "equipment", ["status"])
    op.create_index("ix_equipment_created_at", "equipment", ["created_at"])
    op.create_index("ix_equipment_project_status", "equipment", ["project_id", "status"])

    # 3. Materials indexes - same query patterns as equipment
    op.create_index("ix_materials_project_id", "materials", ["project_id"])
    op.create_index("ix_materials_status", "materials", ["status"])
    op.create_index("ix_materials_created_at", "materials", ["created_at"])
    op.create_index("ix_materials_project_status", "materials", ["project_id", "status"])

    # 4. Inspections indexes - queried by project + status, scheduled_date
    op.create_index("ix_inspections_project_id", "inspections", ["project_id"])
    op.create_index("ix_inspections_status", "inspections", ["status"])
    op.create_index("ix_inspections_project_status", "inspections", ["project_id", "status"])
    op.create_index("ix_inspections_scheduled_date", "inspections", ["scheduled_date"])
    op.create_index("ix_inspections_created_at", "inspections", ["created_at"])

    # 5. Notifications indexes - user_id + is_read queried on every page load
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    # 6. ProjectMember indexes - used in every access-control subquery
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])
    op.create_index("ix_project_members_project_id", "project_members", ["project_id"])
    op.create_index("ix_project_members_project_user", "project_members", ["project_id", "user_id"], unique=True)

    # 7. Files indexes - polymorphic lookup by entity_type + entity_id
    op.create_index("ix_files_project_id", "files", ["project_id"])
    op.create_index("ix_files_entity_type_entity_id", "files", ["entity_type", "entity_id"])

    # 8. Meetings indexes - queried by project_id, scheduled_date
    op.create_index("ix_meetings_project_id", "meetings", ["project_id"])
    op.create_index("ix_meetings_scheduled_date", "meetings", ["scheduled_date"])
    op.create_index("ix_meetings_created_at", "meetings", ["created_at"])

    # 9. Findings indexes - queried via inspection joins, grouped by severity
    op.create_index("ix_findings_inspection_id", "findings", ["inspection_id"])
    op.create_index("ix_findings_severity", "findings", ["severity"])
    op.create_index("ix_findings_status", "findings", ["status"])

    # 10. Contacts indexes - queried by project_id
    op.create_index("ix_contacts_project_id", "contacts", ["project_id"])

    # 11. Construction areas indexes
    op.create_index("ix_construction_areas_project_id", "construction_areas", ["project_id"])

    # 12. Approval requests indexes - queried by entity lookup
    op.create_index("ix_approval_requests_project_id", "approval_requests", ["project_id"])
    op.create_index("ix_approval_requests_entity", "approval_requests", ["entity_type", "entity_id"])

    # 13. Checklist instances - queried by project + template
    op.create_index("ix_checklist_instances_project_id", "checklist_instances", ["project_id"])
    op.create_index("ix_checklist_instances_template_id", "checklist_instances", ["template_id"])
    op.create_index("ix_checklist_instances_status", "checklist_instances", ["status"])

    # 14. Equipment approval submissions
    op.create_index("ix_equip_approval_subs_project_id", "equipment_approval_submissions", ["project_id"])
    op.create_index("ix_equip_approval_subs_status", "equipment_approval_submissions", ["status"])

    # 15. Consultant assignments
    op.create_index("ix_consultant_assignments_project_id", "consultant_assignments", ["project_id"])
    op.create_index("ix_consultant_assignments_consultant_id", "consultant_assignments", ["consultant_id"])
    op.create_index("ix_consultant_assignments_status", "consultant_assignments", ["status"])


def downgrade() -> None:
    op.drop_index("ix_consultant_assignments_status", "consultant_assignments")
    op.drop_index("ix_consultant_assignments_consultant_id", "consultant_assignments")
    op.drop_index("ix_consultant_assignments_project_id", "consultant_assignments")
    op.drop_index("ix_equip_approval_subs_status", "equipment_approval_submissions")
    op.drop_index("ix_equip_approval_subs_project_id", "equipment_approval_submissions")
    op.drop_index("ix_checklist_instances_status", "checklist_instances")
    op.drop_index("ix_checklist_instances_template_id", "checklist_instances")
    op.drop_index("ix_checklist_instances_project_id", "checklist_instances")
    op.drop_index("ix_approval_requests_entity", "approval_requests")
    op.drop_index("ix_approval_requests_project_id", "approval_requests")
    op.drop_index("ix_construction_areas_project_id", "construction_areas")
    op.drop_index("ix_contacts_project_id", "contacts")
    op.drop_index("ix_findings_status", "findings")
    op.drop_index("ix_findings_severity", "findings")
    op.drop_index("ix_findings_inspection_id", "findings")
    op.drop_index("ix_meetings_created_at", "meetings")
    op.drop_index("ix_meetings_scheduled_date", "meetings")
    op.drop_index("ix_meetings_project_id", "meetings")
    op.drop_index("ix_files_entity_type_entity_id", "files")
    op.drop_index("ix_files_project_id", "files")
    op.drop_index("ix_project_members_project_user", "project_members")
    op.drop_index("ix_project_members_project_id", "project_members")
    op.drop_index("ix_project_members_user_id", "project_members")
    op.drop_index("ix_notifications_created_at", "notifications")
    op.drop_index("ix_notifications_user_unread", "notifications")
    op.drop_index("ix_notifications_user_id", "notifications")
    op.drop_index("ix_inspections_created_at", "inspections")
    op.drop_index("ix_inspections_scheduled_date", "inspections")
    op.drop_index("ix_inspections_project_status", "inspections")
    op.drop_index("ix_inspections_status", "inspections")
    op.drop_index("ix_inspections_project_id", "inspections")
    op.drop_index("ix_materials_project_status", "materials")
    op.drop_index("ix_materials_created_at", "materials")
    op.drop_index("ix_materials_status", "materials")
    op.drop_index("ix_materials_project_id", "materials")
    op.drop_index("ix_equipment_project_status", "equipment")
    op.drop_index("ix_equipment_created_at", "equipment")
    op.drop_index("ix_equipment_status", "equipment")
    op.drop_index("ix_equipment_project_id", "equipment")
    op.drop_index("ix_audit_logs_created_at", "audit_logs")
    op.drop_index("ix_audit_logs_action", "audit_logs")
    op.drop_index("ix_audit_logs_entity_type_entity_id", "audit_logs")
    op.drop_index("ix_audit_logs_user_id", "audit_logs")
    op.drop_index("ix_audit_logs_project_id", "audit_logs")
