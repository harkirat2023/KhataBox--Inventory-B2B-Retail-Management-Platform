"""add transfer_in/transfer_out to movementtype enum

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE movementtype ADD VALUE 'transfer_in'")
    op.execute("ALTER TYPE movementtype ADD VALUE 'transfer_out'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing values from an enum.
    # Full downgrade requires creating a new type, migrating data, dropping old, renaming.
    op.execute("ALTER TYPE movementtype RENAME TO movementtype_old")
    op.execute("CREATE TYPE movementtype AS ENUM ('sale', 'purchase', 'adjustment', 'return')")
    op.execute(
        "ALTER TABLE inventory_movements ALTER COLUMN movement_type TYPE movementtype USING "
        "movement_type::text::movementtype"
    )
    op.execute("DROP TYPE movementtype_old")
