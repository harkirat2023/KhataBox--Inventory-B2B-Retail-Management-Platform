"""expiry_batch_tracking

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("batch_number", sa.String(100), nullable=True))
    op.add_column("products", sa.Column("mfg_date", sa.Date(), nullable=True))
    op.add_column("products", sa.Column("expiry_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "expiry_date")
    op.drop_column("products", "mfg_date")
    op.drop_column("products", "batch_number")
