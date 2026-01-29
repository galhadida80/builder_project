"""Add equipment approval models

Revision ID: 002
Revises: 001
Create Date: 2026-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'equipment_approval_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        # TODO: Add FK constraint to equipment_templates.id when EquipmentTemplate model is created
        sa.Column('template_id', postgresql.UUID(as_uuid=True)),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('specifications', postgresql.JSONB(), default={}),
        sa.Column('documents', postgresql.JSONB(), default={}),
        sa.Column('checklist_responses', postgresql.JSONB(), default={}),
        sa.Column('additional_data', postgresql.JSONB(), default={}),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('submitted_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('submitted_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'equipment_approval_decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment_approval_submissions.id', ondelete='CASCADE'), nullable=False),
        # TODO: Add FK constraint to consultant_types.id when ConsultantType model is created
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True)),
        sa.Column('approver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('decision', sa.String(50), nullable=False),
        sa.Column('comments', sa.Text()),
        sa.Column('decided_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('equipment_approval_decisions')
    op.drop_table('equipment_approval_submissions')
