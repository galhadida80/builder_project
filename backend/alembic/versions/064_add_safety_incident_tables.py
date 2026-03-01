"""Add safety incident tables

Revision ID: 064
Revises: 063
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "064"
down_revision = "063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create safety_incidents table
    op.create_table(
        "safety_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incident_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("photos", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("witnesses", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("corrective_actions", sa.Text(), nullable=True),
        sa.Column("reported_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["area_id"],
            ["construction_areas.id"],
            ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["reported_by_id"],
            ["contacts.id"],
            ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"]
        ),
        sa.UniqueConstraint("project_id", "incident_number", name="uq_project_incident_number"),
    )
    op.create_index(op.f("ix_safety_incidents_project_id"), "safety_incidents", ["project_id"], unique=False)
    op.create_index(op.f("ix_safety_incidents_area_id"), "safety_incidents", ["area_id"], unique=False)

    # Create near_misses table
    op.create_table(
        "near_misses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("near_miss_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=50), nullable=False),
        sa.Column("potential_consequence", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("photos", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False),
        sa.Column("reported_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("preventive_actions", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["area_id"],
            ["construction_areas.id"],
            ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["reported_by_id"],
            ["contacts.id"],
            ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"]
        ),
        sa.UniqueConstraint("project_id", "near_miss_number", name="uq_project_near_miss_number"),
    )
    op.create_index(op.f("ix_near_misses_project_id"), "near_misses", ["project_id"], unique=False)
    op.create_index(op.f("ix_near_misses_area_id"), "near_misses", ["area_id"], unique=False)

    # Create safety_trainings table
    op.create_table(
        "safety_trainings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("training_type", sa.String(length=100), nullable=False),
        sa.Column("training_date", sa.DateTime(), nullable=False),
        sa.Column("expiry_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("certificate_number", sa.String(length=100), nullable=True),
        sa.Column("instructor", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["worker_id"],
            ["contacts.id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"]
        ),
        sa.UniqueConstraint(
            "project_id",
            "worker_id",
            "training_type",
            "training_date",
            name="uq_project_worker_training"
        ),
    )
    op.create_index(op.f("ix_safety_trainings_project_id"), "safety_trainings", ["project_id"], unique=False)
    op.create_index(op.f("ix_safety_trainings_worker_id"), "safety_trainings", ["worker_id"], unique=False)
    op.create_index(op.f("ix_safety_trainings_status"), "safety_trainings", ["status"], unique=False)

    # Create toolbox_talks table
    op.create_table(
        "toolbox_talks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("scheduled_date", sa.DateTime(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("presenter", sa.String(length=255), nullable=True),
        sa.Column("key_points", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("action_items", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"]
        ),
    )
    op.create_index(op.f("ix_toolbox_talks_project_id"), "toolbox_talks", ["project_id"], unique=False)

    # Create talk_attendees table
    op.create_table(
        "talk_attendees",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("talk_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("worker_name", sa.String(length=255), nullable=True),
        sa.Column("attended", sa.Boolean(), nullable=False),
        sa.Column("signature", sa.Text(), nullable=True),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["talk_id"],
            ["toolbox_talks.id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["worker_id"],
            ["contacts.id"],
            ondelete="SET NULL"
        ),
    )


def downgrade() -> None:
    # Drop talk_attendees table
    op.drop_table("talk_attendees")

    # Drop toolbox_talks table
    op.drop_index(op.f("ix_toolbox_talks_project_id"), table_name="toolbox_talks")
    op.drop_table("toolbox_talks")

    # Drop safety_trainings table
    op.drop_index(op.f("ix_safety_trainings_status"), table_name="safety_trainings")
    op.drop_index(op.f("ix_safety_trainings_worker_id"), table_name="safety_trainings")
    op.drop_index(op.f("ix_safety_trainings_project_id"), table_name="safety_trainings")
    op.drop_table("safety_trainings")

    # Drop near_misses table
    op.drop_index(op.f("ix_near_misses_area_id"), table_name="near_misses")
    op.drop_index(op.f("ix_near_misses_project_id"), table_name="near_misses")
    op.drop_table("near_misses")

    # Drop safety_incidents table
    op.drop_index(op.f("ix_safety_incidents_area_id"), table_name="safety_incidents")
    op.drop_index(op.f("ix_safety_incidents_project_id"), table_name="safety_incidents")
    op.drop_table("safety_incidents")
