"""Add department to project_members

Revision ID: 062
Revises: 061
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa

revision = "062"
down_revision = "061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_members",
        sa.Column("department", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("project_members", "department")
