"""Make product.category and customer.company_name nullable"""

from alembic import op
import sqlalchemy as sa


revision = '0013_optional_fields'
down_revision = '0012_store_business'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('products', 'category',
                    existing_type=sa.String(100),
                    nullable=True)
    op.alter_column('customers', 'company_name',
                    existing_type=sa.String(255),
                    nullable=True)


def downgrade() -> None:
    op.alter_column('customers', 'company_name',
                    existing_type=sa.String(255),
                    nullable=False)
    op.alter_column('products', 'category',
                    existing_type=sa.String(100),
                    nullable=False)
