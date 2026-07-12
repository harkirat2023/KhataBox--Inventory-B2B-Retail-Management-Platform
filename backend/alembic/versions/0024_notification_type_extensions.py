"""Add order lifecycle notification types, create price_history and product_activities tables"""

from alembic import op
import sqlalchemy as sa

revision = '0024_noti_ext'
down_revision = '0023_order_revision_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum values for notification types
    for val in [
        'order_completed', 'order_cancelled', 'order_rejected', 'order_revised',
        'invoice_generated', 'purchase_order_received', 'supplier_added',
        'customer_added', 'product_created', 'stock_updated', 'price_updated', 'qr_generated',
    ]:
        op.execute(f"ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS '{val}'")

    # Create product_activities table
    op.create_table(
        'product_activities',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False, index=True),
        sa.Column('shopkeeper_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('previous_value', sa.Float(), nullable=True),
        sa.Column('new_value', sa.Float(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('reference', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create price_history table
    op.create_table(
        'price_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False, index=True),
        sa.Column('shopkeeper_id', sa.Integer(), nullable=False),
        sa.Column('field_name', sa.String(50), nullable=False),
        sa.Column('previous_value', sa.Float(), nullable=True),
        sa.Column('new_value', sa.Float(), nullable=True),
        sa.Column('changed_by', sa.String(255), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('price_history')
    op.drop_table('product_activities')
