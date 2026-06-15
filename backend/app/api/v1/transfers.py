from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.inventory import InventoryMovement, MovementType, StockTransfer, StockTransferStatus
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.schemas.stock_transfer import StockTransferApprove, StockTransferCreate, StockTransferResponse

router = APIRouter()


async def _enrich_transfer(transfer: StockTransfer, resp: StockTransferResponse, db: AsyncSession) -> StockTransferResponse:
    from_store_result = await db.execute(select(Store).where(Store.id == transfer.from_store_id))
    from_store = from_store_result.scalar_one_or_none()
    resp.from_store_name = from_store.name if from_store else None

    to_store_result = await db.execute(select(Store).where(Store.id == transfer.to_store_id))
    to_store = to_store_result.scalar_one_or_none()
    resp.to_store_name = to_store.name if to_store else None

    product_result = await db.execute(select(Product).where(Product.id == transfer.product_id))
    product = product_result.scalar_one_or_none()
    resp.product_name = product.name if product else None
    resp.product_sku = product.sku if product else None

    return resp


@router.get("/", response_model=list[StockTransferResponse])
async def list_transfers(
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(StockTransfer)
        .where(
            (StockTransfer.requested_by == current_user.id) | (StockTransfer.from_store_id.in_(
                select(Store.id).where(Store.owner_id == current_user.id)
            ))
        )
        .order_by(StockTransfer.created_at.desc())
    )
    if status_filter:
        query = query.where(StockTransfer.status == status_filter)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    transfers = result.scalars().all()
    responses = [StockTransferResponse.model_validate(t) for t in transfers]
    enriched = [await _enrich_transfer(t, r, db) for t, r in zip(transfers, responses)]
    return enriched


@router.post("/", response_model=StockTransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    payload: StockTransferCreate,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    if payload.from_store_id == payload.to_store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and destination stores must be different")

    from_store_result = await db.execute(select(Store).where(Store.id == payload.from_store_id, Store.owner_id == current_user.id, Store.is_active == True))
    if not from_store_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source store not found")

    to_store_result = await db.execute(select(Store).where(Store.id == payload.to_store_id, Store.is_active == True))
    if not to_store_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination store not found")

    product_result = await db.execute(select(Product).where(Product.id == payload.product_id, Product.owner_id == current_user.id, Product.is_active == True))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product.store_id and product.store_id != payload.from_store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product does not belong to the source store")

    if payload.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be positive")

    if payload.quantity > product.stock_quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock in source store")

    transfer = StockTransfer(
        product_id=payload.product_id,
        from_store_id=payload.from_store_id,
        to_store_id=payload.to_store_id,
        quantity=payload.quantity,
        requested_by=current_user.id,
        notes=payload.notes,
    )
    db.add(transfer)
    await db.flush()

    product.stock_quantity -= payload.quantity
    out_movement = InventoryMovement(
        product_id=payload.product_id,
        shopkeeper_id=current_user.id,
        store_id=payload.from_store_id,
        movement_type=MovementType.TRANSFER_OUT,
        quantity=-payload.quantity,
        reference=f"StockTransfer-{transfer.id}",
        notes=f"Transfer to store {payload.to_store_id}" + (f": {payload.notes}" if payload.notes else ""),
    )
    db.add(out_movement)
    await db.commit()
    await db.refresh(transfer)
    resp = StockTransferResponse.model_validate(transfer)
    return await _enrich_transfer(transfer, resp, db)


@router.get("/{transfer_id}", response_model=StockTransferResponse)
async def get_transfer(
    transfer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StockTransfer).where(StockTransfer.id == transfer_id))
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    resp = StockTransferResponse.model_validate(transfer)
    return await _enrich_transfer(transfer, resp, db)


@router.patch("/{transfer_id}/status", response_model=StockTransferResponse)
async def update_transfer_status(
    transfer_id: int,
    payload: StockTransferApprove,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StockTransfer).where(StockTransfer.id == transfer_id))
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")

    if payload.status not in ("approved", "rejected", "completed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    if transfer.status != StockTransferStatus.PENDING and payload.status in ("approved", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer already processed")

    if payload.status == "approved":
        transfer.approved_by = current_user.id
        transfer.status = StockTransferStatus.APPROVED

        in_movement = InventoryMovement(
            product_id=transfer.product_id,
            shopkeeper_id=current_user.id,
            store_id=transfer.to_store_id,
            movement_type=MovementType.TRANSFER_IN,
            quantity=transfer.quantity,
            reference=f"StockTransfer-{transfer.id}",
            notes=f"Transfer from store {transfer.from_store_id}",
        )
        db.add(in_movement)

    elif payload.status == "rejected":
        product_result = await db.execute(select(Product).where(Product.id == transfer.product_id))
        product = product_result.scalar_one_or_none()
        if product:
            product.stock_quantity += transfer.quantity
        transfer.status = StockTransferStatus.REJECTED

    elif payload.status == "completed":
        transfer.status = StockTransferStatus.COMPLETED

    if payload.notes:
        transfer.notes = (transfer.notes or "") + f" | {payload.notes}"

    await db.commit()
    await db.refresh(transfer)
    resp = StockTransferResponse.model_validate(transfer)
    return await _enrich_transfer(transfer, resp, db)
