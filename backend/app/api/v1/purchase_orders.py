import random
import string
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.purchase_order import POStatus, PurchaseOrder, PurchaseOrderItem
from app.models.user import User


class POItemCreate(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class POCreate(BaseModel):
    supplier_id: int
    notes: str | None = None
    items: list[POItemCreate]


class POStatusUpdate(BaseModel):
    status: str


class POItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class POResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    shopkeeper_id: int
    status: str
    total: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
    items: list[POItemResponse]

    model_config = {"from_attributes": True}


router = APIRouter()


def generate_po_number() -> str:
    return "PO-" + "".join(random.choices(string.digits, k=8))


@router.get("/", response_model=list[POResponse])
async def list_purchase_orders(
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.shopkeeper_id == current_user.id)
        .options(selectinload(PurchaseOrder.items))
        .order_by(PurchaseOrder.created_at.desc())
    )
    return [POResponse.model_validate(po) for po in result.scalars().all()]


@router.post("/", response_model=POResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    payload: POCreate,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    total = sum(item.unit_price * item.quantity for item in payload.items)

    po = PurchaseOrder(
        po_number=generate_po_number(),
        supplier_id=payload.supplier_id,
        shopkeeper_id=current_user.id,
        total=total,
        notes=payload.notes,
    )
    db.add(po)
    await db.flush()

    for item in payload.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.unit_price * item.quantity,
        )
        db.add(po_item)

    await db.commit()
    await db.refresh(po)
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po.id)
        .options(selectinload(PurchaseOrder.items))
    )
    return POResponse.model_validate(result.scalar_one())


@router.patch("/{po_id}/status", response_model=POResponse)
async def update_po_status(
    po_id: int,
    payload: POStatusUpdate,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po_id, PurchaseOrder.shopkeeper_id == current_user.id)
        .options(selectinload(PurchaseOrder.items))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    try:
        po.status = POStatus(payload.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in POStatus]}",
        )

    await db.commit()
    await db.refresh(po, ["items"])
    return POResponse.model_validate(po)
