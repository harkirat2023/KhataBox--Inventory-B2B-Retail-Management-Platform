"""Add b2c_order_id column to receipts table"""

from alembic import op
import sqlalchemy as sa


revision = '0019_b2c_order_id_receipts'
down_revision = '0018_clerk_auth_support'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('receipts', sa.Column('b2c_order_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('receipts', 'b2c_order_id')
