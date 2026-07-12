from datetime import datetime

from pydantic import BaseModel


class PriceHistoryResponse(BaseModel):
    id: int
    product_id: int
    field_name: str
    previous_value: float | None
    new_value: float | None
    changed_by: str
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PriceHistoryListResponse(BaseModel):
    history: list[PriceHistoryResponse]
    total: int
