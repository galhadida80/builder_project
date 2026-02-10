"""Add related_equipment_id and related_material_id to rfis table

Revision ID: 011
Revises: 010
Create Date: 2026-02-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rfis", sa.Column("related_equipment_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("rfis", sa.Column("related_material_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_rfis_related_equipment_id",
        "rfis",
        "equipment",
        ["related_equipment_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_rfis_related_material_id",
        "rfis",
        "materials",
        ["related_material_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_rfis_related_equipment_id", "rfis", ["related_equipment_id"])
    op.create_index("ix_rfis_related_material_id", "rfis", ["related_material_id"])


def downgrade() -> None:
    op.drop_index("ix_rfis_related_material_id", table_name="rfis")
    op.drop_index("ix_rfis_related_equipment_id", table_name="rfis")
    op.drop_constraint("fk_rfis_related_material_id", "rfis", type_="foreignkey")
    op.drop_constraint("fk_rfis_related_equipment_id", "rfis", type_="foreignkey")
    op.drop_column("rfis", "related_material_id")
    op.drop_column("rfis", "related_equipment_id")
