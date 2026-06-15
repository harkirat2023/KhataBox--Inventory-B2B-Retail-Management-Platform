"""add product_uuid to products table

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("product_uuid", postgresql.UUID(), nullable=True))
    op.execute("UPDATE products SET product_uuid = gen_random_uuid() WHERE product_uuid IS NULL")
    op.alter_column("products", "product_uuid", nullable=False)
    op.create_unique_constraint("uq_products_product_uuid", "products", ["product_uuid"])


def downgrade() -> None:
    op.drop_constraint("uq_products_product_uuid", "products", type_="unique")
    op.drop_column("products", "product_uuid")
