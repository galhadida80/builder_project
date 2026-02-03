"""Add RFI system tables

Revision ID: 004
Revises: b348f02ac109
Create Date: 2026-01-30

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '004'
down_revision: Union[str, None] = 'b348f02ac109'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rfis',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('rfi_number', sa.String(length=50), nullable=False),
        sa.Column('email_thread_id', sa.String(length=255), nullable=True),
        sa.Column('email_message_id', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('created_by_id', sa.UUID(), nullable=False),
        sa.Column('assigned_to_id', sa.UUID(), nullable=True),
        sa.Column('to_email', sa.String(length=255), nullable=False),
        sa.Column('to_name', sa.String(length=255), nullable=True),
        sa.Column('cc_emails', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('drawing_reference', sa.String(length=255), nullable=True),
        sa.Column('specification_reference', sa.String(length=255), nullable=True),
        sa.Column('attachments', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rfi_number')
    )
    op.create_index('ix_rfis_project_id', 'rfis', ['project_id'], unique=False)
    op.create_index('ix_rfis_status', 'rfis', ['status'], unique=False)
    op.create_index('ix_rfis_rfi_number', 'rfis', ['rfi_number'], unique=False)
    op.create_index('ix_rfis_email_thread_id', 'rfis', ['email_thread_id'], unique=False)

    op.create_table(
        'rfi_responses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('rfi_id', sa.UUID(), nullable=False),
        sa.Column('email_message_id', sa.String(length=255), nullable=True),
        sa.Column('in_reply_to', sa.String(length=255), nullable=True),
        sa.Column('response_text', sa.Text(), nullable=False),
        sa.Column('attachments', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('from_email', sa.String(length=255), nullable=False),
        sa.Column('from_name', sa.String(length=255), nullable=True),
        sa.Column('responder_id', sa.UUID(), nullable=True),
        sa.Column('is_internal', sa.Boolean(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('received_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['rfi_id'], ['rfis.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['responder_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rfi_responses_rfi_id', 'rfi_responses', ['rfi_id'], unique=False)

    op.create_table(
        'rfi_email_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('rfi_id', sa.UUID(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('email_message_id', sa.String(length=255), nullable=True),
        sa.Column('from_email', sa.String(length=255), nullable=True),
        sa.Column('to_email', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=True),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rfi_id'], ['rfis.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rfi_email_logs_rfi_id', 'rfi_email_logs', ['rfi_id'], unique=False)
    op.create_index('ix_rfi_email_logs_event_type', 'rfi_email_logs', ['event_type'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_rfi_email_logs_event_type', table_name='rfi_email_logs')
    op.drop_index('ix_rfi_email_logs_rfi_id', table_name='rfi_email_logs')
    op.drop_table('rfi_email_logs')

    op.drop_index('ix_rfi_responses_rfi_id', table_name='rfi_responses')
    op.drop_table('rfi_responses')

    op.drop_index('ix_rfis_email_thread_id', table_name='rfis')
    op.drop_index('ix_rfis_rfi_number', table_name='rfis')
    op.drop_index('ix_rfis_status', table_name='rfis')
    op.drop_index('ix_rfis_project_id', table_name='rfis')
    op.drop_table('rfis')
