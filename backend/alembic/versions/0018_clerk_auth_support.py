"""Add clerk_id to users table, make password_hash nullable"""

from alembic import op
import sqlalchemy as sa


revision = '0018_clerk_auth_support'
down_revision = '0017_seed_products_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('clerk_id', sa.String(255), nullable=True))
    op.create_index('ix_users_clerk_id', 'users', ['clerk_id'], unique=True)
    op.alter_column('users', 'password_hash', type_=sa.String(255), nullable=True)


def downgrade() -> None:
    op.drop_index('ix_users_clerk_id')
    op.drop_column('users', 'clerk_id')
    op.alter_column('users', 'password_hash', type_=sa.String(255), nullable=False)
