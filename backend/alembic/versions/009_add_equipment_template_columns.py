"""Add description and created_by_id to equipment_templates

Revision ID: 009
Revises: 008
Create Date: 2026-02-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('equipment_templates', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('equipment_templates', sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_equipment_templates_created_by_id',
        'equipment_templates',
        'users',
        ['created_by_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_equipment_templates_created_by_id', 'equipment_templates', type_='foreignkey')
    op.drop_column('equipment_templates', 'created_by_id')
    op.drop_column('equipment_templates', 'description')
