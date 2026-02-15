"""fix audit_log project FK to SET NULL on delete

Revision ID: 026
Revises: 025
Create Date: 2026-02-16
"""

from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("audit_logs_project_id_fkey", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "audit_logs_project_id_fkey",
        "audit_logs",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("audit_logs_project_id_fkey", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "audit_logs_project_id_fkey",
        "audit_logs",
        "projects",
        ["project_id"],
        ["id"],
    )
