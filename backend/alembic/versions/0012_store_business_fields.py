# revision identifiers, used by alembic.
from alembic import op
import sqlalchemy as sa


revision = '0012_store_business'
down_revision = '0011_receipt_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add store_type column
    op.add_column('stores', sa.Column('store_type', sa.String(50), nullable=True, server_default='other'))

    # Add city column
    op.add_column('stores', sa.Column('city', sa.String(100), nullable=True))

    # Add state column
    op.add_column('stores', sa.Column('state', sa.String(100), nullable=True))

    # Add pin_code column
    op.add_column('stores', sa.Column('pin_code', sa.String(10), nullable=True))

    # Add gst_number column
    op.add_column('stores', sa.Column('gst_number', sa.String(20), nullable=True))

    # Add monthly_revenue column
    op.add_column('stores', sa.Column('monthly_revenue', sa.Numeric(12, 2), nullable=True))

    # Add business_description column
    op.add_column('stores', sa.Column('business_description', sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column('stores', 'business_description')
    op.drop_column('stores', 'monthly_revenue')
    op.drop_column('stores', 'gst_number')
    op.drop_column('stores', 'pin_code')
    op.drop_column('stores', 'state')
    op.drop_column('stores', 'city')
    op.drop_column('stores', 'store_type')