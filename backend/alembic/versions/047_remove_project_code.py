"""Remove project code column

Revision ID: 047
Revises: 046
"""
from alembic import op
import sqlalchemy as sa

revision = "047"
down_revision = "046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("projects_code_key", "projects", type_="unique")
    op.drop_column("projects", "code")


def downgrade() -> None:
    op.add_column("projects", sa.Column("code", sa.String(50), nullable=True))
    op.execute("UPDATE projects SET code = LEFT(id::text, 8) WHERE code IS NULL")
    op.alter_column("projects", "code", nullable=False)
    op.create_unique_constraint("projects_code_key", "projects", ["code"])
