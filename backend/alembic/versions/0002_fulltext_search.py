"""fulltext_search

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True))
    op.create_index("idx_products_search", "products", ["search_vector"], postgresql_using="gin")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english',
                coalesce(NEW.name, '') || ' ' ||
                coalesce(NEW.sku, '') || ' ' ||
                coalesce(NEW.category, '') || ' ' ||
                coalesce(NEW.brand, '')
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_products_search
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION products_search_update();
        """
    )
    op.execute(
        """
        UPDATE products SET search_vector = to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(sku, '') || ' ' ||
            coalesce(category, '') || ' ' ||
            coalesce(brand, '')
        );
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_products_search ON products")
    op.execute("DROP FUNCTION IF EXISTS products_search_update()")
    op.drop_index("idx_products_search", table_name="products")
    op.drop_column("products", "search_vector")
