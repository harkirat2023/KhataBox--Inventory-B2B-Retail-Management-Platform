from datetime import datetime

from pydantic import BaseModel


class ProductActivityResponse(BaseModel):
    id: int
    product_id: int
    activity_type: str
    previous_value: float | None
    new_value: float | None
    quantity: int | None
    reference: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductActivityListResponse(BaseModel):
    activities: list[ProductActivityResponse]
    total: int
