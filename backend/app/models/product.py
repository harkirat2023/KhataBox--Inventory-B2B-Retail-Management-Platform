import uuid as _uuid

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_uuid: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        unique=True,
        nullable=False,
        default=lambda: str(_uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, nullable=False)
    market_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    vendor_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    shipping_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    freight: Mapped[float | None] = mapped_column(Float, nullable=True)
    handling: Mapped[float | None] = mapped_column(Float, nullable=True)
    packaging: Mapped[float | None] = mapped_column(Float, nullable=True)
    tariff: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Existing field represents *available* stock (what dashboards show).
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)

    # New: reserved stock kept out of availability until order completion/cancellation.
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)

    reorder_threshold: Mapped[int] = mapped_column(Integer, default=10)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mfg_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, nullable=False)
    store_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
