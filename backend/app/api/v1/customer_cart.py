from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.customer_cart import (
    CustomerCartAddResponse,
    CustomerCartCheckout,
    CustomerCartCreate,
    CustomerCartItemResponse,
    CustomerCartResponse,
)
from app.services import cart_service

router = APIRouter()


@router.get("/", response_model=list[CustomerCartResponse])
async def list_carts(
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    response: Response = None,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    result, total = await cart_service.list_carts(db, current_user.email, page, page_size)
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return result


@router.get("/{cart_id}", response_model=CustomerCartResponse)
async def get_cart(cart_id: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    return await cart_service.get_cart(db, cart_id, current_user.email)


@router.post("/", response_model=CustomerCartAddResponse, status_code=status.HTTP_201_CREATED)
async def create_cart(payload: CustomerCartCreate, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    return await cart_service.create_cart(db, current_user.email, payload)


@router.post("/items", response_model=CustomerCartAddResponse)
async def add_item(payload: CustomerCartCreate, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    return await cart_service.add_item(db, current_user.email, payload)


@router.put("/{cart_id}/items/{item_id}", response_model=CustomerCartItemResponse)
async def update_item_quantity(
    cart_id: int, item_id: int, quantity: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)
):
    return await cart_service.update_item_quantity(db, cart_id, item_id, quantity, current_user.email)


@router.delete("/{cart_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    cart_id: int, item_id: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)
):
    await cart_service.delete_item(db, cart_id, item_id, current_user.email)


@router.post("/checkout", response_model=dict)
async def checkout_active_cart(payload: CustomerCartCheckout, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    return await cart_service.checkout_active_cart(db, current_user.email, payload)


@router.post("/{cart_id}/checkout", response_model=dict)
async def checkout_cart(cart_id: int, payload: CustomerCartCheckout, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    return await cart_service.checkout_cart(db, cart_id, current_user.email, payload)


@router.delete("/{cart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart(cart_id: int, current_user: User = Depends(require_role("customer")), db: AsyncSession = Depends(get_db)):
    await cart_service.delete_cart(db, cart_id, current_user.email)
