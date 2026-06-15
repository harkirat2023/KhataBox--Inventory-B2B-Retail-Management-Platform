from datetime import datetime

from pydantic import BaseModel


class StockTransferCreate(BaseModel):
    product_id: int
    from_store_id: int
    to_store_id: int
    quantity: int
    notes: str | None = None


class StockTransferApprove(BaseModel):
    status: str
    notes: str | None = None


class StockTransferResponse(BaseModel):
    id: int
    product_id: int
    from_store_id: int
    to_store_id: int
    quantity: int
    status: str
    requested_by: int
    approved_by: int | None
    notes: str | None
    from_store_name: str | None = None
    to_store_name: str | None = None
    product_name: str | None = None
    product_sku: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
