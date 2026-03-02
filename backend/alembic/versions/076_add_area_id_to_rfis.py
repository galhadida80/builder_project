"""Add related_area_id FK to rfis

Revision ID: 076
Revises: 075
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "076"
down_revision = "075"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rfis", sa.Column("related_area_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_rfis_area", "rfis", "construction_areas", ["related_area_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_rfis_area", "rfis", type_="foreignkey")
    op.drop_column("rfis", "related_area_id")
