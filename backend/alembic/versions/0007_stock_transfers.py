"""stock_transfers + store_id on inventory_movements

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_transfers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("from_store_id", sa.Integer(), nullable=False),
        sa.Column("to_store_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", "completed", name="stocktransferstatus"), nullable=False, server_default="pending"),
        sa.Column("requested_by", sa.Integer(), nullable=False),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["from_store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["to_store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("inventory_movements", sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("inventory_movements", "store_id")
    op.drop_table("stock_transfers")
