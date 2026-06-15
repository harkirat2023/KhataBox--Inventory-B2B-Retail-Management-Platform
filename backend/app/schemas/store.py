from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


def validate_pin_code(pin_code: str | None) -> str | None:
    if pin_code is None:
        return pin_code
    # Indian PIN code: 6 digits
    cleaned = "".join(c for c in pin_code if c.isdigit())
    if len(cleaned) != 6:
        raise ValueError("PIN code must be 6 digits")
    return cleaned


def validate_gst_number(gst_number: str | None) -> str | None:
    if gst_number is None:
        return gst_number
    # GST format: 15 characters (2 state code + 10 PAN + 1 entity number + 1 Z + 1 check)
    cleaned = "".join(c for c in gst_number.upper() if c.isalnum())
    if len(cleaned) != 15:
        raise ValueError("GST number must be 15 characters")
    return cleaned


class StoreCreate(BaseModel):
    name: str
    store_type: str = "other"
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    gst_number: str | None = None
    monthly_revenue: float | None = None
    business_description: str | None = None

    @field_validator("pin_code")
    @classmethod
    def validate_pin_code_format(cls, v: str | None) -> str | None:
        return validate_pin_code(v)

    @field_validator("gst_number")
    @classmethod
    def validate_gst_format(cls, v: str | None) -> str | None:
        return validate_gst_number(v)


class StoreUpdate(BaseModel):
    name: str | None = None
    store_type: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    gst_number: str | None = None
    monthly_revenue: float | None = None
    business_description: str | None = None


class StoreResponse(BaseModel):
    id: int
    name: str
    store_type: str
    address: str | None
    city: str | None
    state: str | None
    pin_code: str | None
    gst_number: str | None
    monthly_revenue: float | None
    business_description: str | None
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("monthly_revenue", mode="before")
    @classmethod
    def convert_revenue(cls, v):
        if v is None:
            return v
        if isinstance(v, Decimal):
            return float(v)
        return v