"""Make (email, role) composite unique to allow same email with different roles"""

from alembic import op
import sqlalchemy as sa


revision = '0021_composite_email_role_unique'
down_revision = '0020_add_pricing_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('users_email_key', 'users', type_='unique')
    op.create_unique_constraint('uq_user_email_role', 'users', ['email', 'role'])


def downgrade() -> None:
    op.drop_constraint('uq_user_email_role', 'users', type_='unique')
    op.create_unique_constraint('users_email_key', 'users', ['email'])
