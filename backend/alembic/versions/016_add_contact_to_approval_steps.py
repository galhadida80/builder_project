"""Add contact_id to approval_steps

Revision ID: 016
Revises: 015
Create Date: 2026-02-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "approval_steps",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_approval_steps_contact_id",
        "approval_steps",
        "contacts",
        ["contact_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_approval_steps_contact_id", "approval_steps", type_="foreignkey")
    op.drop_column("approval_steps", "contact_id")
