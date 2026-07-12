"""Make receipts.order_id nullable (B2C receipts use b2c_order_id instead)"""

from alembic import op
import sqlalchemy as sa


revision = '0022_receipts_order_id_nullable'
down_revision = '0021_composite_email_role_unique'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('receipts', 'order_id', nullable=True, existing_type=sa.Integer())


def downgrade() -> None:
    op.alter_column('receipts', 'order_id', nullable=False, existing_type=sa.Integer())
