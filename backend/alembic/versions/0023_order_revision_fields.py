"""Add revision_number, previous_total, adjustment_total, revision_status to orders; add rejected to orderstatus"""

from alembic import op
import sqlalchemy as sa


revision = '0023_order_revision_fields'
down_revision = '0022_receipts_order_id_nullable'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'rejected'")
    op.add_column('orders', sa.Column('revision_number', sa.Integer(), server_default='0', nullable=False))
    op.add_column('orders', sa.Column('previous_total', sa.Float(), server_default='0', nullable=False))
    op.add_column('orders', sa.Column('adjustment_total', sa.Float(), nullable=True))
    op.add_column('orders', sa.Column('revision_status', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'revision_status')
    op.drop_column('orders', 'adjustment_total')
    op.drop_column('orders', 'previous_total')
    op.drop_column('orders', 'revision_number')
    # Note: ALTER TYPE ... DROP VALUE is not supported by PostgreSQL 14+
    # The 'rejected' enum value will remain but be unused after downgrade
