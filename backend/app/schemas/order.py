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


class OrderResponse(BaseModel):
    id: int
    order_number: str
    shopkeeper_id: int
    customer_id: int | None
    # UI contract expects customer_name
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

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: str


class BulkOrderCreate(BaseModel):
    payment_method: str | None = "credit"
    notes: str | None = None
    items: list[OrderItemCreate]
