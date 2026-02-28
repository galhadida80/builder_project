"""Add billing and subscriptions tables

Revision ID: 053
Revises: 052
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "053"
down_revision = "052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create subscription_plans table
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tier", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("monthly_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("annual_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("max_users", sa.Integer, nullable=True),
        sa.Column("max_projects", sa.Integer, nullable=True),
        sa.Column("max_storage_gb", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # Create subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("billing_cycle", sa.String(20), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("trial_ends_at", sa.DateTime, nullable=True),
        sa.Column("current_period_start", sa.DateTime, nullable=False),
        sa.Column("current_period_end", sa.DateTime, nullable=False),
        sa.Column("canceled_at", sa.DateTime, nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True, unique=True),
        sa.Column("payplus_subscription_id", sa.String(255), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_subscriptions_organization_id",
        "subscriptions",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_subscriptions_plan_id",
        "subscriptions",
        "subscription_plans",
        ["plan_id"],
        ["id"],
    )
    op.create_index("ix_subscriptions_organization_id", "subscriptions", ["organization_id"], unique=True)
    op.create_index("ix_subscriptions_plan_id", "subscriptions", ["plan_id"])

    # Create invoices table
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invoice_number", sa.String(100), nullable=False, unique=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("billing_period_start", sa.DateTime, nullable=False),
        sa.Column("billing_period_end", sa.DateTime, nullable=False),
        sa.Column("issued_at", sa.DateTime, nullable=False),
        sa.Column("due_date", sa.DateTime, nullable=True),
        sa.Column("paid_at", sa.DateTime, nullable=True),
        sa.Column("stripe_invoice_id", sa.String(255), nullable=True, unique=True),
        sa.Column("payplus_invoice_id", sa.String(255), nullable=True, unique=True),
        sa.Column("pdf_url", sa.String(500), nullable=True),
        sa.Column("meta", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_invoices_organization_id",
        "invoices",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_invoices_subscription_id",
        "invoices",
        "subscriptions",
        ["subscription_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_invoices_organization_id", "invoices", ["organization_id"])
    op.create_index("ix_invoices_subscription_id", "invoices", ["subscription_id"])

    # Create payment_methods table
    op.create_table(
        "payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("card_brand", sa.String(50), nullable=True),
        sa.Column("card_last4", sa.String(4), nullable=True),
        sa.Column("card_exp_month", sa.Integer, nullable=True),
        sa.Column("card_exp_year", sa.Integer, nullable=True),
        sa.Column("is_default", sa.Boolean, default=False),
        sa.Column("stripe_payment_method_id", sa.String(255), nullable=True, unique=True),
        sa.Column("payplus_payment_method_id", sa.String(255), nullable=True, unique=True),
        sa.Column("meta", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_payment_methods_organization_id",
        "payment_methods",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_payment_methods_organization_id", "payment_methods", ["organization_id"])

    # Create billing_history table
    op.create_table(
        "billing_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("meta", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_billing_history_organization_id",
        "billing_history",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_billing_history_subscription_id",
        "billing_history",
        "subscriptions",
        ["subscription_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_billing_history_organization_id", "billing_history", ["organization_id"])
    op.create_index("ix_billing_history_subscription_id", "billing_history", ["subscription_id"])
    op.create_index("ix_billing_history_event_type", "billing_history", ["event_type"])
    op.create_index("ix_billing_history_created_at", "billing_history", ["created_at"])


def downgrade() -> None:
    # Drop billing_history table
    op.drop_index("ix_billing_history_created_at", table_name="billing_history")
    op.drop_index("ix_billing_history_event_type", table_name="billing_history")
    op.drop_index("ix_billing_history_subscription_id", table_name="billing_history")
    op.drop_index("ix_billing_history_organization_id", table_name="billing_history")
    op.drop_constraint("fk_billing_history_subscription_id", "billing_history", type_="foreignkey")
    op.drop_constraint("fk_billing_history_organization_id", "billing_history", type_="foreignkey")
    op.drop_table("billing_history")

    # Drop payment_methods table
    op.drop_index("ix_payment_methods_organization_id", table_name="payment_methods")
    op.drop_constraint("fk_payment_methods_organization_id", "payment_methods", type_="foreignkey")
    op.drop_table("payment_methods")

    # Drop invoices table
    op.drop_index("ix_invoices_subscription_id", table_name="invoices")
    op.drop_index("ix_invoices_organization_id", table_name="invoices")
    op.drop_constraint("fk_invoices_subscription_id", "invoices", type_="foreignkey")
    op.drop_constraint("fk_invoices_organization_id", "invoices", type_="foreignkey")
    op.drop_table("invoices")

    # Drop subscriptions table
    op.drop_index("ix_subscriptions_plan_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_organization_id", table_name="subscriptions")
    op.drop_constraint("fk_subscriptions_plan_id", "subscriptions", type_="foreignkey")
    op.drop_constraint("fk_subscriptions_organization_id", "subscriptions", type_="foreignkey")
    op.drop_table("subscriptions")

    # Drop subscription_plans table
    op.drop_table("subscription_plans")
