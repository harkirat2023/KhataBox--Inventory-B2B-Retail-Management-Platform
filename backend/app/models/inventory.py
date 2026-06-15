import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MovementType(str, enum.Enum):
    # Financial-ish inventory movements (existing)
    SALE = "sale"
    PURCHASE = "purchase"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"

    # Order reservation lifecycle (inventory synchronization)
    RESERVE_OUT = "reserve_out"
    CONSUME_OUT = "consume_out"
    RESERVE_CANCELLED_IN = "reserve_cancelled_in"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, nullable=False)
    shopkeeper_id: Mapped[int] = mapped_column(Integer, nullable=False)
    store_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("stores.id"), nullable=True)
    movement_type: Mapped[MovementType] = mapped_column(Enum(MovementType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    store = relationship("Store", lazy="selectin")


class StockTransferStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, nullable=False)
    from_store_id: Mapped[int] = mapped_column(Integer, ForeignKey("stores.id"), nullable=False)
    to_store_id: Mapped[int] = mapped_column(Integer, ForeignKey("stores.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[StockTransferStatus] = mapped_column(Enum(StockTransferStatus, values_callable=lambda x: [e.value for e in x]), default=StockTransferStatus.PENDING, nullable=False)
    requested_by: Mapped[int] = mapped_column(Integer, nullable=False)
    approved_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    from_store = relationship("Store", foreign_keys=[from_store_id], lazy="selectin")
    to_store = relationship("Store", foreign_keys=[to_store_id], lazy="selectin")
