"""Update meeting status CHECK constraint to include pending_votes

Revision ID: 037
Revises: 036
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op

revision: str = '037'
down_revision: Union[str, None] = '036'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_meetings_status', 'meetings', type_='check')
    op.create_check_constraint(
        'ck_meetings_status',
        'meetings',
        "status IN ('scheduled','invitations_sent','pending_votes','completed','cancelled')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_meetings_status', 'meetings', type_='check')
    op.create_check_constraint(
        'ck_meetings_status',
        'meetings',
        "status IN ('scheduled','invitations_sent','completed','cancelled')",
    )
