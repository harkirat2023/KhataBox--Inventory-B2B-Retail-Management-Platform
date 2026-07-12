import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationType(str, enum.Enum):
    LOW_STOCK = "low_stock"
    EXPIRY = "expiry"
    PAYMENT_REMINDER = "payment_reminder"
    AI_RECOMMENDATION = "ai_recommendation"
    ORDER_COMPLETED = "order_completed"
    ORDER_CANCELLED = "order_cancelled"
    ORDER_REJECTED = "order_rejected"
    ORDER_REVISED = "order_revised"
    INVOICE_GENERATED = "invoice_generated"
    PURCHASE_ORDER_RECEIVED = "purchase_order_received"
    SUPPLIER_ADDED = "supplier_added"
    CUSTOMER_ADDED = "customer_added"
    PRODUCT_CREATED = "product_created"
    STOCK_UPDATED = "stock_updated"
    PRICE_UPDATED = "price_updated"
    QR_GENERATED = "qr_generated"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
