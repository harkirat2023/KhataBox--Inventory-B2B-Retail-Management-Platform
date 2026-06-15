from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.inventory import InventoryMovement, MovementType
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.services.notifications import check_low_stock


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
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(InventoryMovement)
        .where(InventoryMovement.shopkeeper_id == current_user.id)
        .order_by(InventoryMovement.created_at.desc())
    )
    if product_id:
        query = query.where(InventoryMovement.product_id == product_id)
    if store_id:
        query = query.where(InventoryMovement.store_id == store_id)
    if movement_type:
        query = query.where(InventoryMovement.movement_type == movement_type)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    movements = result.scalars().all()

    product_ids = list(set(m.product_id for m in movements))
    products = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
        products = {p.id: p for p in prod_result.scalars().all()}

    store_ids = list(set(m.store_id for m in movements if m.store_id))
    stores = {}
    if store_ids:
        store_result = await db.execute(select(Store).where(Store.id.in_(store_ids)))
        stores = {s.id: s for s in store_result.scalars().all()}

    responses = []
    for m in movements:
        resp = MovementResponse.model_validate(m)
        if m.product_id in products:
            resp.product_name = products[m.product_id].name
            resp.product_sku = products[m.product_id].sku
        if m.store_id and m.store_id in stores:
            resp.store_name = stores[m.store_id].name
        responses.append(resp)
    return responses


@router.get("/movements/{product_id}", response_model=list[MovementResponse])
async def get_product_movements(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryMovement)
        .where(
            InventoryMovement.product_id == product_id,
            InventoryMovement.shopkeeper_id == current_user.id,
        )
        .order_by(InventoryMovement.created_at.desc())
    )
    movements = result.scalars().all()

    prod_result = await db.execute(select(Product).where(Product.id == product_id))
    product = prod_result.scalar_one_or_none()

    store_ids = list(set(m.store_id for m in movements if m.store_id))
    stores = {}
    if store_ids:
        store_result = await db.execute(select(Store).where(Store.id.in_(store_ids)))
        stores = {s.id: s for s in store_result.scalars().all()}

    responses = []
    for m in movements:
        resp = MovementResponse.model_validate(m)
        if product:
            resp.product_name = product.name
            resp.product_sku = product.sku
        if m.store_id and m.store_id in stores:
            resp.store_name = stores[m.store_id].name
        responses.append(resp)
    return responses


@router.post("/stock-update", response_model=StockUpdateResponse)
async def stock_update(
    payload: StockUpdateRequest,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == payload.product_id, Product.owner_id == current_user.id, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    previous_stock = product.stock_quantity
    if payload.action == "add":
        product.stock_quantity += payload.quantity
        mtype = MovementType.PURCHASE
    elif payload.action == "remove":
        if product.stock_quantity < payload.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock: have {product.stock_quantity}, need {payload.quantity}",
            )
        product.stock_quantity -= payload.quantity
        mtype = MovementType.SALE
    else:
        product.stock_quantity = payload.quantity
        mtype = MovementType.ADJUSTMENT

    movement = InventoryMovement(
        product_id=product.id,
        shopkeeper_id=current_user.id,
        store_id=payload.store_id,
        movement_type=mtype,
        quantity=payload.quantity,
        reference="qr-scan",
        notes=f"QR scan stock {payload.action}: {previous_stock} -> {product.stock_quantity}",
    )
    db.add(movement)
    await db.flush()
    await check_low_stock(product.id, current_user.id, db)
    await db.commit()
    await db.refresh(product)

    return StockUpdateResponse(
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        previous_stock=previous_stock,
        new_stock=product.stock_quantity,
        movement_id=movement.id,
        movement_type=mtype.value,
    )
