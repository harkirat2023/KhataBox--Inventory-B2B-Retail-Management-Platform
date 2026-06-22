from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.services import inventory_service


class MovementResponse(BaseModel):
    id: int
    product_id: int
    store_id: int | None = None
    store_name: str | None = None
    product_name: str | None = None
    product_sku: str | None = None
    movement_type: str
    quantity: int
    reference: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockUpdateRequest(BaseModel):
    product_id: int
    store_id: int | None = None
    action: str
    quantity: int

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("add", "remove", "adjust"):
            raise ValueError("action must be 'add', 'remove', or 'adjust'")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 0:
            raise ValueError("quantity must be non-negative")
        return v


class StockUpdateResponse(BaseModel):
    product_id: int
    product_name: str
    sku: str
    previous_stock: int
    new_stock: int
    movement_id: int
    movement_type: str


router = APIRouter()


@router.get("/movements", response_model=list[MovementResponse])
async def list_movements(
    product_id: int | None = Query(None),
    store_id: int | None = Query(None),
    movement_type: str | None = Query(None),
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=500),
    response: Response = None,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result, total = await inventory_service.list_movements(db, current_user.id, product_id, store_id, movement_type, page, page_size)
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return [MovementResponse(**r) for r in result]


@router.get("/movements/{product_id}", response_model=list[MovementResponse])
async def get_product_movements(
    product_id: int,
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=500),
    response: Response = None,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result, total = await inventory_service.get_product_movements(db, product_id, current_user.id, page, page_size)
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return [MovementResponse(**r) for r in result]


@router.post("/stock-update", response_model=StockUpdateResponse)
async def stock_update(
    payload: StockUpdateRequest,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    return await inventory_service.update_stock(db, payload, current_user.id)
