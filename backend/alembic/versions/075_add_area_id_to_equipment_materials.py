"""Add area_id FK to equipment and materials

Revision ID: 075
Revises: 074
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "075"
down_revision = "074"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("equipment", sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_equipment_area_id", "equipment", "construction_areas", ["area_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_equipment_area_id", "equipment", ["area_id"])

    op.add_column("materials", sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_materials_area_id", "materials", "construction_areas", ["area_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_materials_area_id", "materials", ["area_id"])


def downgrade() -> None:
    op.drop_index("ix_materials_area_id", table_name="materials")
    op.drop_constraint("fk_materials_area_id", "materials", type_="foreignkey")
    op.drop_column("materials", "area_id")

    op.drop_index("ix_equipment_area_id", table_name="equipment")
    op.drop_constraint("fk_equipment_area_id", "equipment", type_="foreignkey")
    op.drop_column("equipment", "area_id")
