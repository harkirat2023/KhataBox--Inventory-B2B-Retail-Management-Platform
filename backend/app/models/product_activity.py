import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ActivityType(str, enum.Enum):
    PRICE_CHANGE = "price_change"
    STOCK_UPDATE = "stock_update"
    ORDER_CONSUMED = "order_consumed"
    RETURN = "return"
    PURCHASE_RECEIVED = "purchase_received"
    TRANSFER_OUT = "transfer_out"
    TRANSFER_IN = "transfer_in"
    PRODUCT_CREATED = "product_created"
    PRODUCT_UPDATED = "product_updated"
    ADJUSTMENT = "adjustment"


class ProductActivity(Base):
    __tablename__ = "product_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    shopkeeper_id: Mapped[int] = mapped_column(Integer, nullable=False)
    activity_type: Mapped[ActivityType] = mapped_column(Enum(ActivityType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    previous_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
