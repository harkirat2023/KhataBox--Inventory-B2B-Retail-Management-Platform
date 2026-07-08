"""Create seed_products table for shopkeeper onboarding"""

from alembic import op
import sqlalchemy as sa
from datetime import timezone


revision = '0017_seed_products_table'
down_revision = '0016_b2c_orders_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TABLE IF NOT EXISTS seed_products ("
              "id SERIAL PRIMARY KEY, "
              "store_type VARCHAR(50) NOT NULL, "
              "name VARCHAR(255) NOT NULL, "
              "sku_prefix VARCHAR(10) NOT NULL, "
              "category VARCHAR(100) NOT NULL, "
              "default_selling_price FLOAT NOT NULL, "
              "default_cost_price FLOAT NOT NULL, "
              "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
              ")")
    op.execute("CREATE INDEX IF NOT EXISTS ix_seed_products_store_type ON seed_products (store_type)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS seed_products CASCADE")
