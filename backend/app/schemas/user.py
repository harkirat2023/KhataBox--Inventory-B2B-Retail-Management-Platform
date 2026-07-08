import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


def validate_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d]", "", phone)
    if len(cleaned) != 10:
        raise ValueError("Phone must be 10 digits")
    return cleaned


def validate_password_strength(password: str) -> str:
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")
    return password


def validate_pin_code(pin_code: str | None) -> str | None:
    if pin_code is None:
        return pin_code
    cleaned = "".join(c for c in pin_code if c.isdigit())
    if len(cleaned) != 6:
        raise ValueError("PIN code must be 6 digits")
    return cleaned


def validate_gst_number(gst_number: str | None) -> str | None:
    if gst_number is None:
        return gst_number
    cleaned = "".join(c for c in gst_number.upper() if c.isalnum())
    if len(cleaned) != 15:
        raise ValueError("GST number must be 15 characters")
    return cleaned


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    name: str
    role: str = "shopkeeper"
    store_name: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    store_type: str | None = None
    pin_code: str | None = None
    gst_number: str | None = None
    monthly_revenue: float | None = None
    business_description: str | None = None

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_phone(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("pin_code")
    @classmethod
    def validate_pin_code_format(cls, v: str | None) -> str | None:
        return validate_pin_code(v)

    @field_validator("gst_number")
    @classmethod
    def validate_gst_format(cls, v: str | None) -> str | None:
        return validate_gst_number(v)


class ClerkRegisterRequest(BaseModel):
    clerk_id: str
    email: EmailStr
    name: str
    password: str | None = None
    role: str = "shopkeeper"
    store_name: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    store_type: str | None = None
    pin_code: str | None = None
    gst_number: str | None = None
    monthly_revenue: float | None = None
    business_description: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_phone(v)

    @field_validator("pin_code")
    @classmethod
    def validate_pin_code_format(cls, v: str | None) -> str | None:
        return validate_pin_code(v)

    @field_validator("gst_number")
    @classmethod
    def validate_gst_format(cls, v: str | None) -> str | None:
        return validate_gst_number(v)


class RefreshRequest(BaseModel):
    refresh_token: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    clerk_id: str | None
    email: str
    name: str
    role: str
    store_name: str | None
    phone: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
