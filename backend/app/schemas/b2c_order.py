from datetime import datetime

from pydantic import BaseModel


class B2COrderItemCreate(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class B2COrderCreate(BaseModel):
    store_id: int
    payment_type: str = "online"
    discount: float = 0
    notes: str | None = None
    items: list[B2COrderItemCreate]
    apply_gst: bool = True


class B2COrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class B2COrderResponse(BaseModel):
    id: int
    order_number: str
    customer_user_id: int
    customer_name: str
    customer_phone: str | None = None
    store_id: int
    shopkeeper_id: int
    payment_type: str
    status: str
    subtotal: float
    discount: float
    gst: float
    total: float
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[B2COrderItemResponse]
    store_name: str | None = None

    model_config = {"from_attributes": True}


class B2CConfirmRequest(BaseModel):
    items: list[B2COrderItemCreate] | None = None
    discount: float | None = None
    apply_gst: bool = True


class B2COrderApproval(BaseModel):
    """Empty payload for approval request."""
    pass


class B2CValidatedItem(BaseModel):
    product_id: int
    product_name: str
    requested_quantity: int
    available_stock: int
    current_price: float
    submitted_price: float
    price_mismatch: bool = False


class B2COrderValidationResult(BaseModel):
    valid: bool
    issues: list[str] = []
    items: list[B2CValidatedItem] = []