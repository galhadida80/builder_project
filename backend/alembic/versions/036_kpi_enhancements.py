"""kpi enhancements - add target/threshold columns and kpi_snapshots table

Revision ID: 036
Revises: 035
Create Date: 2026-02-20
"""

import sqlalchemy as sa
from alembic import op

revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("custom_kpi_definitions", sa.Column("target_value", sa.Float(), nullable=True))
    op.add_column("custom_kpi_definitions", sa.Column("warning_threshold", sa.Float(), nullable=True))
    op.add_column("custom_kpi_definitions", sa.Column("unit", sa.String(50), nullable=True))
    op.add_column("custom_kpi_definitions", sa.Column("display_order", sa.Integer(), server_default="0", nullable=False))
    op.add_column("custom_kpi_definitions", sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("custom_kpi_definitions", sa.Column("icon", sa.String(50), nullable=True))
    op.add_column("custom_kpi_definitions", sa.Column("color", sa.String(20), nullable=True))

    op.create_table(
        "kpi_snapshots",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("kpi_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("custom_kpi_definitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("kpi_id", "snapshot_date", name="uq_kpi_snapshot_date"),
    )
    op.create_index("ix_kpi_snapshots_kpi_id", "kpi_snapshots", ["kpi_id"])


def downgrade() -> None:
    op.drop_table("kpi_snapshots")
    op.drop_column("custom_kpi_definitions", "color")
    op.drop_column("custom_kpi_definitions", "icon")
    op.drop_column("custom_kpi_definitions", "is_active")
    op.drop_column("custom_kpi_definitions", "display_order")
    op.drop_column("custom_kpi_definitions", "unit")
    op.drop_column("custom_kpi_definitions", "warning_threshold")
    op.drop_column("custom_kpi_definitions", "target_value")
