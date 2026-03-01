"""Add marketplace template tables

Revision ID: 068
Revises: 067
Create Date: 2026-03-01
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '068'
down_revision: Union[str, None] = '067'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create marketplace_templates table
    op.create_table(
        'marketplace_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_he', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('description_he', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('trade', sa.String(100), nullable=True),
        sa.Column('building_type', sa.String(100), nullable=True),
        sa.Column('regulatory_standard', sa.String(100), nullable=True),
        sa.Column('tags', postgresql.JSONB(), default=list),
        sa.Column('template_data', postgresql.JSONB(), nullable=False),
        sa.Column('version', sa.String(20), default='1.0.0'),
        sa.Column('tier', sa.String(20), default='free'),
        sa.Column('price', sa.Numeric(10, 2), nullable=True),
        sa.Column('is_official', sa.Boolean(), default=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_marketplace_templates_template_type', 'marketplace_templates', ['template_type'])
    op.create_index('ix_marketplace_templates_category', 'marketplace_templates', ['category'])
    op.create_index('ix_marketplace_templates_trade', 'marketplace_templates', ['trade'])
    op.create_index('ix_marketplace_templates_building_type', 'marketplace_templates', ['building_type'])
    op.create_index('ix_marketplace_templates_regulatory_standard', 'marketplace_templates', ['regulatory_standard'])

    # Create marketplace_listings table
    op.create_table(
        'marketplace_listings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('marketplace_templates.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('featured', sa.Boolean(), default=False),
        sa.Column('install_count', sa.Integer(), default=0),
        sa.Column('average_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('review_count', sa.Integer(), default=0),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_marketplace_listings_status', 'marketplace_listings', ['status'])

    # Create template_installations table
    op.create_table(
        'template_installations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('marketplace_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('installed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('installed_version', sa.String(20), nullable=False),
        sa.Column('custom_name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('installed_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create template_ratings table
    op.create_table(
        'template_ratings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('marketplace_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('template_ratings')
    op.drop_table('template_installations')
    op.drop_index('ix_marketplace_listings_status', table_name='marketplace_listings')
    op.drop_table('marketplace_listings')
    op.drop_index('ix_marketplace_templates_regulatory_standard', table_name='marketplace_templates')
    op.drop_index('ix_marketplace_templates_building_type', table_name='marketplace_templates')
    op.drop_index('ix_marketplace_templates_trade', table_name='marketplace_templates')
    op.drop_index('ix_marketplace_templates_category', table_name='marketplace_templates')
    op.drop_index('ix_marketplace_templates_template_type', table_name='marketplace_templates')
    op.drop_table('marketplace_templates')
