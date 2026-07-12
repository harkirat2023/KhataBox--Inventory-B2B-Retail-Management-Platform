from datetime import date, datetime

from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str | None = None
    brand: str | None = None
    description: str | None = None
    cost_price: float = 0
    selling_price: float
    market_price: float | None = None
    vendor_price: float | None = None
    shipping_cost: float | None = None
    freight: float | None = None
    handling: float | None = None
    packaging: float | None = None
    tariff: float | None = None
    stock_quantity: int = 0
    reorder_threshold: int = 10
    batch_number: str | None = None
    mfg_date: date | None = None
    expiry_date: date | None = None
    store_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    category: str | None = None
    brand: str | None = None
    description: str | None = None
    cost_price: float | None = None
    selling_price: float | None = None
    market_price: float | None = None
    vendor_price: float | None = None
    shipping_cost: float | None = None
    freight: float | None = None
    handling: float | None = None
    packaging: float | None = None
    tariff: float | None = None
    stock_quantity: int | None = None
    reorder_threshold: int | None = None
    batch_number: str | None = None
    mfg_date: date | None = None
    expiry_date: date | None = None
    store_id: int | None = None


class ProductResponse(BaseModel):
    id: int
    product_uuid: str
    name: str
    sku: str
    category: str | None
    brand: str | None
    description: str | None
    cost_price: float
    selling_price: float
    market_price: float | None = None
    vendor_price: float | None = None
    shipping_cost: float | None = None
    freight: float | None = None
    handling: float | None = None
    packaging: float | None = None
    tariff: float | None = None
    stock_quantity: int
    reorder_threshold: int
    batch_number: str | None
    mfg_date: date | None
    expiry_date: date | None
    image_url: str | None = None
    store_id: int | None
    owner_id: int
    store_name: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
