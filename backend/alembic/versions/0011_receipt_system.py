"""Receipt system migration.

Revision ID: 0011_receipt_system
Revises: 0010_inventory_reservation_support
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0011_receipt_system"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # paymentmethod enum may already exist; guard creation.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'paymentmethod'
            ) THEN
                CREATE TYPE paymentmethod AS ENUM ('cash', 'upi', 'credit', 'bank_transfer');
            END IF;
        END
        $$;
        """
    )

    payment_method_enum = sa.Enum(
        "cash",
        "upi",
        "credit",
        "bank_transfer",
        name="paymentmethod",
        create_type=False,
    )

    # Create receipts
    op.create_table(
        "receipts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("receipt_number", sa.String(length=50), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("shopkeeper_id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("payment_method", payment_method_enum, nullable=True),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("taxes", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.UniqueConstraint("receipt_number"),
    )
    op.create_index("ix_receipts_order_id", "receipts", ["order_id"], unique=False)

    # Create receipt items
    op.create_table(
        "receipt_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("receipt_id", sa.Integer(), nullable=False),
        sa.Column("order_item_id", sa.Integer(), nullable=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("line_total", sa.Float(), nullable=False),
        sa.Column("taxes", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"]),
        sa.ForeignKeyConstraint(["order_item_id"], ["order_items.id"]),
    )


def downgrade() -> None:
    op.drop_table("receipt_items")
    op.drop_table("receipts")
