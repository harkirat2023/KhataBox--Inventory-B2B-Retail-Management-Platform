"""Create B2C orders system with separate tables"""

from alembic import op
import sqlalchemy as sa
from datetime import timezone


revision = '0016_b2c_orders_system'
down_revision = '0015_payments_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'b2c_orders',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('order_number', sa.String(50), unique=True, nullable=False),
        sa.Column('customer_user_id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('shopkeeper_id', sa.Integer(), nullable=False),
        sa.Column('customer_name', sa.String(255), nullable=False),
        sa.Column('customer_phone', sa.String(20), nullable=True),
        sa.Column('payment_type', sa.String(20), nullable=False, server_default='online'),
        sa.Column('status', sa.String(20), nullable=False, server_default='online'),
        sa.Column('subtotal', sa.Float(), default=0, nullable=False),
        sa.Column('discount', sa.Float(), default=0, nullable=False),
        sa.Column('gst', sa.Float(), default=0, nullable=False),
        sa.Column('total', sa.Float(), default=0, nullable=False),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_b2c_orders_shopkeeper_id', 'b2c_orders', ['shopkeeper_id'])
    op.create_index('ix_b2c_orders_customer_user_id', 'b2c_orders', ['customer_user_id'])
    op.create_index('ix_b2c_orders_status', 'b2c_orders', ['status'])

    op.create_table(
        'b2c_order_items',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('total_price', sa.Float(), nullable=False),
    )
    op.create_index('ix_b2c_order_items_order_id', 'b2c_order_items', ['order_id'])


def downgrade() -> None:
    op.drop_table('b2c_order_items')
    op.drop_table('b2c_orders')