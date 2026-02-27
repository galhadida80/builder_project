"""Add template_id FK to equipment and materials tables

Revision ID: 051
Revises: 050
Create Date: 2026-02-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "051"
down_revision = "050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("equipment", sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_equipment_template_id",
        "equipment",
        "equipment_templates",
        ["template_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_equipment_template_id", "equipment", ["template_id"])

    op.add_column("materials", sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_materials_template_id",
        "materials",
        "material_templates",
        ["template_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_materials_template_id", "materials", ["template_id"])


def downgrade() -> None:
    op.drop_index("ix_materials_template_id", table_name="materials")
    op.drop_constraint("fk_materials_template_id", "materials", type_="foreignkey")
    op.drop_column("materials", "template_id")

    op.drop_index("ix_equipment_template_id", table_name="equipment")
    op.drop_constraint("fk_equipment_template_id", "equipment", type_="foreignkey")
    op.drop_column("equipment", "template_id")
