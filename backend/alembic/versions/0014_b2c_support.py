"""Add is_b2c column to orders and counter enum value"""

from alembic import op
import sqlalchemy as sa


revision = '0014_b2c_support'
down_revision = '0013_optional_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('is_b2c', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'counter'")


def downgrade() -> None:
    op.drop_column('orders', 'is_b2c')
