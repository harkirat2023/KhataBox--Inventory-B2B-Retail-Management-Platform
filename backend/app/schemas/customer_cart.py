from datetime import datetime
from typing import List

from pydantic import BaseModel


class CustomerCartItemCreate(BaseModel):
    product_id: int
    product_name: str
    sku: str
    unit_price: float
    quantity: int = 1

    @classmethod
    def calculate_total_price(cls, unit_price: float, quantity: int) -> float:
        return round(unit_price * quantity, 2)

    @classmethod
    def from_order_item(cls, order_item: dict, unit_price: float) -> "CustomerCartItemCreate":
        return cls(
            product_id=order_item["product_id"],
            product_name=order_item["product_name"],
            sku=order_item.get("product_sku", ""),
            unit_price=unit_price,
            quantity=order_item["quantity"],
        )


class CustomerCartItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    unit_price: float
    quantity: int
    total_price: float

    model_config = {"from_attributes": True}


class CustomerCartCreate(BaseModel):
    items: List[CustomerCartItemCreate]


class CustomerCartUpdate(BaseModel):
    items: List[CustomerCartItemCreate]


class CustomerCartResponse(BaseModel):
    id: int
    customer_id: int
    status: str
    subtotal: float
    discount: float
    gst: float
    total: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
    items: List[CustomerCartItemResponse]

    model_config = {"from_attributes": True}


class CustomerCartAddResponse(BaseModel):
    cart: CustomerCartResponse
    item: CustomerCartItemResponse
    previous_item_exists: bool = False
    message: str


class CustomerCartCheckout(BaseModel):
    payment_method: str | None = "credit"
    notes: str | None = None
    store_id: int | None = None