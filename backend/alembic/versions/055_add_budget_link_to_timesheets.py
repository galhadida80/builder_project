"""Add budget_item_id to timesheets

Revision ID: 055
Revises: 054
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "055"
down_revision = "054"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add budget_item_id column to timesheets table
    op.add_column(
        "timesheets",
        sa.Column("budget_item_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_timesheets_budget_item_id",
        "timesheets",
        "budget_line_items",
        ["budget_item_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Remove budget_item_id column from timesheets table
    op.drop_constraint("fk_timesheets_budget_item_id", "timesheets", type_="foreignkey")
    op.drop_column("timesheets", "budget_item_id")
