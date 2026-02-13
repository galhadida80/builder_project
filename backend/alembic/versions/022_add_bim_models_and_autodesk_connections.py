"""Add BIM models and Autodesk connections tables

Revision ID: 022
Revises: 021
Create Date: 2026-02-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = '022'
down_revision: Union[str, None] = '021'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'bim_models',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('file_size', sa.BigInteger, nullable=True),
        sa.Column('storage_path', sa.String(1000), nullable=True),
        sa.Column('urn', sa.String(500), nullable=True),
        sa.Column('translation_status', sa.String(50), nullable=False, server_default='uploaded'),
        sa.Column('translation_progress', sa.Integer, nullable=False, server_default='0'),
        sa.Column('metadata', sa.JSON, nullable=True),
        sa.Column('uploaded_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'autodesk_connections',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('access_token', sa.Text, nullable=True),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expires_at', sa.DateTime, nullable=True),
        sa.Column('acc_account_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.text('now()'), nullable=False),
    )

    op.create_index('ix_bim_models_project_id', 'bim_models', ['project_id'])
    op.create_index('ix_autodesk_connections_user_id', 'autodesk_connections', ['user_id'])

    op.create_check_constraint(
        'ck_bim_models_translation_status',
        'bim_models',
        "translation_status IN ('uploaded','translating','complete','failed')"
    )


def downgrade() -> None:
    op.drop_constraint('ck_bim_models_translation_status', 'bim_models', type_='check')
    op.drop_index('ix_autodesk_connections_user_id', table_name='autodesk_connections')
    op.drop_index('ix_bim_models_project_id', table_name='bim_models')
    op.drop_table('autodesk_connections')
    op.drop_table('bim_models')
