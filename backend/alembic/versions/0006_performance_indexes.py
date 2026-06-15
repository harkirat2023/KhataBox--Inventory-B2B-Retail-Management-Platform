"""performance_indexes

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_products_owner_id", "products", ["owner_id"])
    op.create_index("ix_products_store_id", "products", ["store_id"])
    op.create_index("ix_orders_shopkeeper_id", "orders", ["shopkeeper_id"])
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_customers_owner_id", "customers", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_products_owner_id")
    op.drop_index("ix_products_store_id")
    op.drop_index("ix_orders_shopkeeper_id")
    op.drop_index("ix_orders_customer_id")
    op.drop_index("ix_customers_owner_id")
