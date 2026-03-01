"""Add vendor management tables

Revision ID: 069
Revises: 068
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "069"
down_revision = "068"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vendors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("trade", sa.String(100), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("license_number", sa.String(100), nullable=True),
        sa.Column("insurance_expiry", sa.DateTime(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("certifications", postgresql.JSON(), server_default="[]", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_vendors_company_name", "vendors", ["company_name"])
    op.create_index("ix_vendors_trade", "vendors", ["trade"])

    op.create_table(
        "vendor_performances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delivery_score", sa.Float(), nullable=True),
        sa.Column("quality_score", sa.Float(), nullable=True),
        sa.Column("price_score", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_vendor_performances_vendor_id", "vendor_performances", ["vendor_id"])
    op.create_index("ix_vendor_performances_project_id", "vendor_performances", ["project_id"])

    op.add_column("equipment", sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_equipment_vendor", "equipment", "vendors", ["vendor_id"], ["id"], ondelete="SET NULL")

    op.add_column("materials", sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_materials_vendor", "materials", "vendors", ["vendor_id"], ["id"], ondelete="SET NULL")

    op.add_column("cost_entries", sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_cost_entries_vendor", "cost_entries", "vendors", ["vendor_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_cost_entries_vendor", "cost_entries", type_="foreignkey")
    op.drop_column("cost_entries", "vendor_id")

    op.drop_constraint("fk_materials_vendor", "materials", type_="foreignkey")
    op.drop_column("materials", "vendor_id")

    op.drop_constraint("fk_equipment_vendor", "equipment", type_="foreignkey")
    op.drop_column("equipment", "vendor_id")

    op.drop_index("ix_vendor_performances_project_id", table_name="vendor_performances")
    op.drop_index("ix_vendor_performances_vendor_id", table_name="vendor_performances")
    op.drop_table("vendor_performances")

    op.drop_index("ix_vendors_trade", table_name="vendors")
    op.drop_index("ix_vendors_company_name", table_name="vendors")
    op.drop_table("vendors")
