"""Change signature_url columns from String(500) to Text

Revision ID: 077
Revises: 076
Create Date: 2026-03-09
"""
from alembic import op
import sqlalchemy as sa

revision = "077"
down_revision = "076"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "signature_url", type_=sa.Text())
    op.alter_column("checklist_item_responses", "signature_url", type_=sa.Text())
    op.alter_column("equipment", "contractor_signature_url", type_=sa.Text())
    op.alter_column("equipment", "supervisor_signature_url", type_=sa.Text())
    op.alter_column("materials", "contractor_signature_url", type_=sa.Text())
    op.alter_column("materials", "supervisor_signature_url", type_=sa.Text())


def downgrade() -> None:
    op.alter_column("users", "signature_url", type_=sa.String(500))
    op.alter_column("checklist_item_responses", "signature_url", type_=sa.String(500))
    op.alter_column("equipment", "contractor_signature_url", type_=sa.String(500))
    op.alter_column("equipment", "supervisor_signature_url", type_=sa.String(500))
    op.alter_column("materials", "contractor_signature_url", type_=sa.String(500))
    op.alter_column("materials", "supervisor_signature_url", type_=sa.String(500))
