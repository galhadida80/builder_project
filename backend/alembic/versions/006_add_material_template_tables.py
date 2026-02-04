"""Add material template tables with multi-consultant approval

Revision ID: 006
Revises: 005_add_is_cc_participant_to_rfi_responses
Create Date: 2026-02-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create material_templates table
    op.create_table('material_templates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('name_he', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('required_documents', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('required_specifications', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('submission_checklist', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_templates_category'), 'material_templates', ['category'], unique=False)

    # Create material_template_consultants table (many-to-many)
    op.create_table('material_template_consultants',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=False),
        sa.Column('consultant_type_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['consultant_type_id'], ['consultant_types.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['material_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create material_approval_submissions table
    op.create_table('material_approval_submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=True),
        sa.Column('material_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('specifications', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('documents', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('checklist_responses', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('additional_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('submitted_by_id', sa.UUID(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['template_id'], ['material_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_approval_submissions_project_id'), 'material_approval_submissions', ['project_id'], unique=False)
    op.create_index(op.f('ix_material_approval_submissions_status'), 'material_approval_submissions', ['status'], unique=False)

    # Create material_approval_decisions table
    op.create_table('material_approval_decisions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('consultant_type_id', sa.UUID(), nullable=True),
        sa.Column('approver_id', sa.UUID(), nullable=True),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['approver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['consultant_type_id'], ['consultant_types.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['submission_id'], ['material_approval_submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_approval_decisions_submission_id'), 'material_approval_decisions', ['submission_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_material_approval_decisions_submission_id'), table_name='material_approval_decisions')
    op.drop_table('material_approval_decisions')
    op.drop_index(op.f('ix_material_approval_submissions_status'), table_name='material_approval_submissions')
    op.drop_index(op.f('ix_material_approval_submissions_project_id'), table_name='material_approval_submissions')
    op.drop_table('material_approval_submissions')
    op.drop_table('material_template_consultants')
    op.drop_index(op.f('ix_material_templates_category'), table_name='material_templates')
    op.drop_table('material_templates')
