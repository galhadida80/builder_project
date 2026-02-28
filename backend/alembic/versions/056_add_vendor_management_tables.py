"""Add vendor management tables

Revision ID: 056
Revises: 055
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "056"
down_revision = "055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create vendors table
    op.create_table(
        "vendors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("trade", sa.String(100), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("license_number", sa.String(100), nullable=True),
        sa.Column("insurance_expiry", sa.DateTime, nullable=True),
        sa.Column("is_verified", sa.Boolean, default=False),
        sa.Column("rating", sa.Float, nullable=True),
        sa.Column("certifications", postgresql.JSON, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_vendors_company_name", "vendors", ["company_name"])
    op.create_index("ix_vendors_trade", "vendors", ["trade"])
    op.create_index("ix_vendors_is_verified", "vendors", ["is_verified"])

    # Create vendor_performances table
    op.create_table(
        "vendor_performances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delivery_score", sa.Float, nullable=True),
        sa.Column("quality_score", sa.Float, nullable=True),
        sa.Column("price_score", sa.Float, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_vendor_performances_vendor_id",
        "vendor_performances",
        "vendors",
        ["vendor_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_vendor_performances_project_id",
        "vendor_performances",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_vendor_performances_vendor_id", "vendor_performances", ["vendor_id"])
    op.create_index("ix_vendor_performances_project_id", "vendor_performances", ["project_id"])


def downgrade() -> None:
    # Drop vendor_performances table
    op.drop_index("ix_vendor_performances_project_id", table_name="vendor_performances")
    op.drop_index("ix_vendor_performances_vendor_id", table_name="vendor_performances")
    op.drop_constraint("fk_vendor_performances_project_id", "vendor_performances", type_="foreignkey")
    op.drop_constraint("fk_vendor_performances_vendor_id", "vendor_performances", type_="foreignkey")
    op.drop_table("vendor_performances")

    # Drop vendors table
    op.drop_index("ix_vendors_is_verified", table_name="vendors")
    op.drop_index("ix_vendors_trade", table_name="vendors")
    op.drop_index("ix_vendors_company_name", table_name="vendors")
    op.drop_table("vendors")
