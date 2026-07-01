from datetime import datetime

from pydantic import BaseModel


class CustomerCreate(BaseModel):
    company_name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    gst_number: str | None = None
    credit_limit: float = 0
    price_tier: str = "standard"


class CustomerUpdate(BaseModel):
    company_name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    gst_number: str | None = None
    credit_limit: float | None = None
    price_tier: str | None = None


class CustomerCreditUpdate(BaseModel):
    clear_overdue: bool = False
    additional_credit: float | None = None


class CustomerResponse(BaseModel):
    id: int
    company_name: str | None
    contact_person: str | None
    email: str | None
    phone: str | None
    gst_number: str | None
    credit_limit: float
    credit_used: float
    price_tier: str
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
