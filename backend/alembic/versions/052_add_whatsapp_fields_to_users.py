"""Add whatsapp_number and whatsapp_verified to users

Revision ID: 052
Revises: 051
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa

revision = "052"
down_revision = "051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("whatsapp_number", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("whatsapp_verified", sa.Boolean(), nullable=False, server_default="false"))
    op.create_unique_constraint("uq_users_whatsapp_number", "users", ["whatsapp_number"])


def downgrade() -> None:
    op.drop_constraint("uq_users_whatsapp_number", "users", type_="unique")
    op.drop_column("users", "whatsapp_verified")
    op.drop_column("users", "whatsapp_number")
