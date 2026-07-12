from datetime import datetime

from pydantic import BaseModel


class OrderItemCreate(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class OrderCreate(BaseModel):
    customer_id: int | None = None
    payment_method: str | None = None
    discount: float = 0
    notes: str | None = None
    items: list[OrderItemCreate]
    apply_gst: bool = True


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str | None = None
    quantity: int
    unit_price: float
    # UI contract expects `total` (amount for this line)
    total: float

    model_config = {"from_attributes": True}


class OrderItemRevision(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class OrderResponse(BaseModel):
    id: int
    order_number: str
    shopkeeper_id: int
    customer_id: int | None
    customer_name: str | None = None
    status: str
    payment_method: str | None
    subtotal: float
    discount: float
    gst: float
    total: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]
    credit_alert: dict | None = None
    revision_number: int = 0
    previous_total: float = 0
    adjustment_total: float | None = None
    revision_status: str | None = None

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: str
    revised_items: list[OrderItemRevision] | None = None
    discount: float | None = None
    apply_gst: bool | None = None
    settlement_type: str | None = None  # "settled" or "leftover"
    leftover_amount: float | None = None
    notes: str | None = None


class BulkOrderCreate(BaseModel):
    payment_method: str | None = "credit"
    notes: str | None = None
    items: list[OrderItemCreate]
    apply_gst: bool = True
