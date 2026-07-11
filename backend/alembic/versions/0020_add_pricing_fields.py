"""Add pricing analysis fields to products table"""

from alembic import op
import sqlalchemy as sa


revision = '0020_add_pricing_fields'
down_revision = '0019_b2c_order_id_receipts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('market_price', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('vendor_price', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('shipping_cost', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('freight', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('handling', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('packaging', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('tariff', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'tariff')
    op.drop_column('products', 'packaging')
    op.drop_column('products', 'handling')
    op.drop_column('products', 'freight')
    op.drop_column('products', 'shipping_cost')
    op.drop_column('products', 'vendor_price')
    op.drop_column('products', 'market_price')
