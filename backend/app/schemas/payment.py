from datetime import datetime

from pydantic import BaseModel


class PaymentInitiate(BaseModel):
    amount: float
    payment_method: str = "upi"


class PaymentSimulateResponse(BaseModel):
    success: bool
    transaction_id: str
    message: str


class PaymentResponse(BaseModel):
    id: int
    customer_id: int
    order_id: int | None
    amount: float
    payment_method: str
    transaction_id: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
