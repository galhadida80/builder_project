"""Add user_id to contacts table

Revision ID: 019
Revises: 018
Create Date: 2026-02-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contacts",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_contacts_user_id",
        "contacts",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_contacts_user_id", "contacts", ["user_id"])

    # Auto-link existing contacts to users by matching email
    op.execute(
        """
        UPDATE contacts
        SET user_id = users.id
        FROM users
        WHERE contacts.email IS NOT NULL
          AND LOWER(contacts.email) = LOWER(users.email)
        """
    )


def downgrade() -> None:
    op.drop_index("ix_contacts_user_id", table_name="contacts")
    op.drop_constraint("fk_contacts_user_id", "contacts", type_="foreignkey")
    op.drop_column("contacts", "user_id")
