"""Add bim_object_id and bim_model_id to equipment, materials, and construction_areas

Revision ID: 065
Revises: 064
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "065"
down_revision = "064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add bim_object_id and bim_model_id columns to equipment table
    op.add_column(
        "equipment",
        sa.Column("bim_object_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "equipment",
        sa.Column("bim_model_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key("fk_equipment_bim_model", "equipment", "bim_models", ["bim_model_id"], ["id"], ondelete="SET NULL")

    # Add bim_object_id and bim_model_id columns to materials table
    op.add_column(
        "materials",
        sa.Column("bim_object_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "materials",
        sa.Column("bim_model_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key("fk_materials_bim_model", "materials", "bim_models", ["bim_model_id"], ["id"], ondelete="SET NULL")

    # Add bim_object_id and bim_model_id columns to construction_areas table
    op.add_column(
        "construction_areas",
        sa.Column("bim_object_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "construction_areas",
        sa.Column("bim_model_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key("fk_construction_areas_bim_model", "construction_areas", "bim_models", ["bim_model_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_construction_areas_bim_model", "construction_areas", type_="foreignkey")
    op.drop_column("construction_areas", "bim_model_id")
    op.drop_column("construction_areas", "bim_object_id")

    op.drop_constraint("fk_materials_bim_model", "materials", type_="foreignkey")
    op.drop_column("materials", "bim_model_id")
    op.drop_column("materials", "bim_object_id")

    op.drop_constraint("fk_equipment_bim_model", "equipment", type_="foreignkey")
    op.drop_column("equipment", "bim_model_id")
    op.drop_column("equipment", "bim_object_id")
