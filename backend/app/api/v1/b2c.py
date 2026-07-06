from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.b2c_order import B2COrderCreate, B2COrderResponse, B2COrderValidationResult
from app.services import b2c_service

router = APIRouter()


# === Customer-facing endpoints ===


@router.get("/stores")
async def list_stores(
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Customer browses all available stores."""
    return await b2c_service.list_available_stores(db)


@router.get("/stores/{store_id}/products")
async def list_store_products(
    store_id: int,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Customer views products for a specific store."""
    return await b2c_service.list_store_products(db, store_id)


@router.post("/orders/validate", response_model=B2COrderValidationResult)
async def validate_order(
    payload: B2COrderCreate,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Pre-order validation: checks stock, prices, store consistency."""
    return await b2c_service.validate_order_payload(db, payload, current_user)


@router.post("/orders", response_model=B2COrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    payload: B2COrderCreate,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Customer places a B2C order (status: pending)."""
    return await b2c_service.place_order(db, payload, current_user)


@router.get("/orders", response_model=list[B2COrderResponse])
async def get_my_orders(
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Customer views their own B2C orders."""
    return await b2c_service.get_customer_orders(db, current_user.id)


@router.get("/orders/{order_id}", response_model=B2COrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Customer fetches a single B2C order by ID."""
    return await b2c_service.get_order_by_id(db, order_id, current_user.id)


# === Shopkeeper-facing endpoints ===


@router.get("/shopkeeper/orders", response_model=list[B2COrderResponse])
async def get_shopkeeper_b2c_orders(
    status: str | None = Query(None, description="Filter by status: pending, confirmed, completed"),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper views their B2C orders."""
    return await b2c_service.get_shopkeeper_orders(db, current_user.id, status)



@router.get("/shopkeeper/order-history", response_model=list[B2COrderResponse])
async def get_shopkeeper_b2c_history(
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper views completed & cancelled B2C orders (history)."""
    return await b2c_service.get_shopkeeper_orders(db, current_user.id, status_filter="history")


@router.post("/shopkeeper/orders/{order_id}/approve", response_model=B2COrderResponse)
async def approve_b2c_order(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper approves a pending B2C order → status = confirmed."""
    return await b2c_service.approve_order(db, order_id, current_user.id)


@router.post("/shopkeeper/orders/{order_id}/processing", response_model=B2COrderResponse)
async def processing_b2c_order(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper marks a confirmed order as processing."""
    return await b2c_service.set_processing_order(db, order_id, current_user.id)


@router.post("/shopkeeper/orders/{order_id}/reject", response_model=B2COrderResponse)
async def reject_b2c_order(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper rejects an order (returns reserved inventory)."""
    return await b2c_service.reject_order(db, order_id, current_user.id)


@router.post("/shopkeeper/orders/{order_id}/cancel", response_model=B2COrderResponse)
async def cancel_b2c_order(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper cancels an order (returns reserved inventory)."""
    return await b2c_service.cancel_order(db, order_id, current_user.id)


@router.post("/shopkeeper/orders/{order_id}/confirm", response_model=B2COrderResponse)
async def confirm_b2c_order(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Shopkeeper marks a confirmed B2C order as completed → inventory deducted, receipt generated."""
    return await b2c_service.complete_order(db, order_id, current_user.id)
