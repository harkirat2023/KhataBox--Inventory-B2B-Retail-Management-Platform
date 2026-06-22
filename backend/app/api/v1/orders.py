from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.order import BulkOrderCreate, OrderCreate, OrderResponse, OrderStatusUpdate
from app.services import order_service

router = APIRouter()


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    response: Response = None,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result, total = await order_service.list_orders(db, current_user.id, page, page_size)
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return result


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    return await order_service.create_order(db, payload, current_user.id)


@router.post("/bulk", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_order(payload: BulkOrderCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    return await order_service.create_bulk_order(db, payload, current_user.email)


@router.get("/my-orders", response_model=list[OrderResponse])
async def my_orders(
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    response: Response = None,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    result, total = await order_service.get_my_orders(db, current_user.email, page, page_size)
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return result


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    return await order_service.get_order(db, order_id, current_user.id)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: int, payload: OrderStatusUpdate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    return await order_service.update_order_status(db, order_id, payload, current_user.id)
