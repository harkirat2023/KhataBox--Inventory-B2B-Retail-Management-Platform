"""inventory reservation support

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add reserved stock tracking to products
    op.add_column(
        "products",
        sa.Column(
            "reserved_quantity",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # Extend movement type enum for inventory reservation lifecycle.
    # movementtype is defined in initial schema as sa.Enum(..., name="movementtype")
    # and already exists in the DB. We add new values.
    op.execute("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'reserve_out'")
    op.execute("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'consume_out'")
    op.execute("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'reserve_cancelled_in'")


def downgrade() -> None:
    # Reverting enum values in Postgres is non-trivial; we omit it.
    # Remove column so application rollback doesn't keep inconsistent state.
    op.drop_column("products", "reserved_quantity")
