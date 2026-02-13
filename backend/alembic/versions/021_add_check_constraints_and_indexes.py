"""Add CHECK constraints and performance indexes

Revision ID: 021
Revises: 020
Create Date: 2026-02-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '021'
down_revision: Union[str, None] = '020'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CHECK_CONSTRAINTS = [
    ("meetings", "ck_meetings_status", "status IN ('scheduled','invitations_sent','completed','cancelled')"),
    ("inspections", "ck_inspections_status", "status IN ('pending','in_progress','completed','failed')"),
    ("findings", "ck_findings_severity", "severity IN ('low','medium','high','critical')"),
    ("findings", "ck_findings_status", "status IN ('open','resolved')"),
    ("rfis", "ck_rfis_status", "status IN ('draft','open','waiting_response','answered','closed','cancelled')"),
    ("rfis", "ck_rfis_priority", "priority IN ('low','medium','high','urgent')"),
    ("rfis", "ck_rfis_category", "category IN ('design','structural','mep','architectural','specifications','schedule','cost','other')"),
    ("projects", "ck_projects_status", "status IN ('active','on_hold','completed','archived')"),
    ("checklist_instances", "ck_checklist_instances_status", "status IN ('pending','in_progress','completed','cancelled')"),
    ("project_invitations", "ck_invitations_status", "status IN ('pending','accepted','expired','revoked')"),
    ("project_invitations", "ck_invitations_role", "role IN ('project_admin','supervisor','consultant','contractor','inspector')"),
]

NUMERIC_CONSTRAINTS = [
    ("construction_areas", "ck_areas_progress", "current_progress >= 0 AND current_progress <= 100"),
    ("construction_areas", "ck_areas_total_units", "total_units >= 1"),
    ("construction_areas", "ck_areas_floor_number", "floor_number >= -99 AND floor_number <= 999"),
]

INDEXES = [
    ("ix_equipment_project_id", "equipment", ["project_id"]),
    ("ix_materials_project_id", "materials", ["project_id"]),
    ("ix_meetings_project_id", "meetings", ["project_id"]),
    ("ix_meetings_scheduled_date", "meetings", ["scheduled_date"]),
    ("ix_inspections_project_id", "inspections", ["project_id"]),
    ("ix_inspections_status", "inspections", ["status"]),
    ("ix_files_entity", "files", ["entity_type", "entity_id"]),
    ("ix_notifications_user_id", "notifications", ["user_id"]),
]


def upgrade() -> None:
    for table, name, condition in CHECK_CONSTRAINTS:
        op.create_check_constraint(name, table, condition)

    for table, name, condition in NUMERIC_CONSTRAINTS:
        op.create_check_constraint(name, table, condition)

    for name, table, columns in INDEXES:
        op.create_index(name, table, columns)


def downgrade() -> None:
    for name, table, columns in reversed(INDEXES):
        op.drop_index(name, table_name=table)

    for table, name, condition in reversed(NUMERIC_CONSTRAINTS):
        op.drop_constraint(name, table, type_="check")

    for table, name, condition in reversed(CHECK_CONSTRAINTS):
        op.drop_constraint(name, table, type_="check")
