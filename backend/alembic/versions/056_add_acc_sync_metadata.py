"""Add ACC sync metadata fields to rfis and rfi_responses

Revision ID: 056
Revises: 055
Create Date: 2026-03-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = '056'
down_revision: Union[str, None] = '055'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ACC sync metadata fields to rfis table
    op.add_column('rfis', sa.Column('acc_issue_id', sa.String(255), nullable=True))
    op.add_column('rfis', sa.Column('acc_project_id', sa.String(255), nullable=True))
    op.add_column('rfis', sa.Column('acc_container_id', sa.String(255), nullable=True))
    op.add_column('rfis', sa.Column('sync_source', sa.String(50), nullable=False, server_default='builderops'))
    op.add_column('rfis', sa.Column('last_synced_at', sa.DateTime, nullable=True))
    op.add_column('rfis', sa.Column('sync_status', sa.String(50), nullable=True))
    op.add_column('rfis', sa.Column('acc_metadata', JSONB, nullable=True))

    # Add ACC sync metadata fields to rfi_responses table
    op.add_column('rfi_responses', sa.Column('acc_issue_id', sa.String(255), nullable=True))
    op.add_column('rfi_responses', sa.Column('acc_project_id', sa.String(255), nullable=True))
    op.add_column('rfi_responses', sa.Column('acc_container_id', sa.String(255), nullable=True))
    op.add_column('rfi_responses', sa.Column('sync_source', sa.String(50), nullable=False, server_default='builderops'))
    op.add_column('rfi_responses', sa.Column('last_synced_at', sa.DateTime, nullable=True))
    op.add_column('rfi_responses', sa.Column('sync_status', sa.String(50), nullable=True))
    op.add_column('rfi_responses', sa.Column('acc_metadata', JSONB, nullable=True))

    # Create indexes for rfis table
    op.create_index('ix_rfis_acc_issue_id', 'rfis', ['acc_issue_id'])
    op.create_index('ix_rfis_acc_project_id', 'rfis', ['acc_project_id'])

    # Create indexes for rfi_responses table
    op.create_index('ix_rfi_responses_acc_issue_id', 'rfi_responses', ['acc_issue_id'])
    op.create_index('ix_rfi_responses_acc_project_id', 'rfi_responses', ['acc_project_id'])

    # Add unique constraint for acc_issue_id on rfis (only rfis should have unique ACC issue IDs)
    op.create_unique_constraint('uq_rfis_acc_issue_id', 'rfis', ['acc_issue_id'])

    # Add check constraints for sync_status and sync_source
    op.create_check_constraint(
        'ck_rfis_sync_status',
        'rfis',
        "sync_status IN ('synced', 'conflict', 'pending') OR sync_status IS NULL"
    )
    op.create_check_constraint(
        'ck_rfis_sync_source',
        'rfis',
        "sync_source IN ('builderops', 'acc')"
    )
    op.create_check_constraint(
        'ck_rfi_responses_sync_status',
        'rfi_responses',
        "sync_status IN ('synced', 'conflict', 'pending') OR sync_status IS NULL"
    )
    op.create_check_constraint(
        'ck_rfi_responses_sync_source',
        'rfi_responses',
        "sync_source IN ('builderops', 'acc')"
    )


def downgrade() -> None:
    # Drop check constraints
    op.drop_constraint('ck_rfi_responses_sync_source', 'rfi_responses', type_='check')
    op.drop_constraint('ck_rfi_responses_sync_status', 'rfi_responses', type_='check')
    op.drop_constraint('ck_rfis_sync_source', 'rfis', type_='check')
    op.drop_constraint('ck_rfis_sync_status', 'rfis', type_='check')

    # Drop unique constraint
    op.drop_constraint('uq_rfis_acc_issue_id', 'rfis', type_='unique')

    # Drop indexes for rfi_responses table
    op.drop_index('ix_rfi_responses_acc_project_id', table_name='rfi_responses')
    op.drop_index('ix_rfi_responses_acc_issue_id', table_name='rfi_responses')

    # Drop indexes for rfis table
    op.drop_index('ix_rfis_acc_project_id', table_name='rfis')
    op.drop_index('ix_rfis_acc_issue_id', table_name='rfis')

    # Drop columns from rfi_responses table
    op.drop_column('rfi_responses', 'acc_metadata')
    op.drop_column('rfi_responses', 'sync_status')
    op.drop_column('rfi_responses', 'last_synced_at')
    op.drop_column('rfi_responses', 'sync_source')
    op.drop_column('rfi_responses', 'acc_container_id')
    op.drop_column('rfi_responses', 'acc_project_id')
    op.drop_column('rfi_responses', 'acc_issue_id')

    # Drop columns from rfis table
    op.drop_column('rfis', 'acc_metadata')
    op.drop_column('rfis', 'sync_status')
    op.drop_column('rfis', 'last_synced_at')
    op.drop_column('rfis', 'sync_source')
    op.drop_column('rfis', 'acc_container_id')
    op.drop_column('rfis', 'acc_project_id')
    op.drop_column('rfis', 'acc_issue_id')
