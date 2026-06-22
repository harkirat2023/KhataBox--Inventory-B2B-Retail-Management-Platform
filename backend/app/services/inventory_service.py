from fastapi import HTTPException, status
from sqlalchemy import func, select

from app.models.inventory import InventoryMovement, MovementType
from app.models.product import Product
from app.models.store import Store
from app.services.cache import invalidate_pattern as invalidate_cache
from app.services.notifications import check_low_stock
from app.services.socketio_manager import emit_inventory_update


async def list_movements(db, shopkeeper_id, product_id=None, store_id=None, movement_type=None, page=None, page_size=None):
    base_query = (
        select(InventoryMovement)
        .where(InventoryMovement.shopkeeper_id == shopkeeper_id)
        .order_by(InventoryMovement.created_at.desc())
    )
    count_query = select(func.count()).select_from(InventoryMovement).where(InventoryMovement.shopkeeper_id == shopkeeper_id)
    if product_id:
        base_query = base_query.where(InventoryMovement.product_id == product_id)
        count_query = count_query.where(InventoryMovement.product_id == product_id)
    if store_id:
        base_query = base_query.where(InventoryMovement.store_id == store_id)
        count_query = count_query.where(InventoryMovement.store_id == store_id)
    if movement_type:
        base_query = base_query.where(InventoryMovement.movement_type == movement_type)
        count_query = count_query.where(InventoryMovement.movement_type == movement_type)
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
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

    return _build_movement_response_list(movements, products, stores), total


async def get_product_movements(db, product_id, shopkeeper_id, page=None, page_size=None):
    base_query = (
        select(InventoryMovement)
        .where(
            InventoryMovement.product_id == product_id,
            InventoryMovement.shopkeeper_id == shopkeeper_id,
        )
        .order_by(InventoryMovement.created_at.desc())
    )
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(
            select(func.count()).select_from(InventoryMovement).where(
                InventoryMovement.product_id == product_id,
                InventoryMovement.shopkeeper_id == shopkeeper_id,
            )
        )
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    movements = result.scalars().all()

    prod_result = await db.execute(select(Product).where(Product.id == product_id))
    product = prod_result.scalar_one_or_none()

    store_ids = list(set(m.store_id for m in movements if m.store_id))
    stores = {}
    if store_ids:
        store_result = await db.execute(select(Store).where(Store.id.in_(store_ids)))
        stores = {s.id: s for s in store_result.scalars().all()}

    products = {p.id: p for p in [product]} if product else {}

    return _build_movement_response_list(movements, products, stores), total


def _build_movement_response_list(movements, products, stores):
    responses = []
    for m in movements:
        movement_type_str = m.movement_type.value if hasattr(m.movement_type, "value") else str(m.movement_type)
        resp = {
            "id": m.id,
            "product_id": m.product_id,
            "store_id": m.store_id,
            "store_name": stores[m.store_id].name if m.store_id and m.store_id in stores else None,
            "product_name": products[m.product_id].name if m.product_id in products else None,
            "product_sku": products[m.product_id].sku if m.product_id in products else None,
            "movement_type": movement_type_str,
            "quantity": m.quantity,
            "reference": m.reference,
            "notes": m.notes,
            "created_at": m.created_at,
        }
        responses.append(resp)
    return responses


async def update_stock(db, payload, shopkeeper_id):
    result = await db.execute(
        select(Product).where(Product.id == payload.product_id, Product.owner_id == shopkeeper_id, Product.is_active == True)
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
        shopkeeper_id=shopkeeper_id,
        store_id=payload.store_id,
        movement_type=mtype,
        quantity=payload.quantity,
        reference="qr-scan",
        notes=f"QR scan stock {payload.action}: {previous_stock} -> {product.stock_quantity}",
    )
    db.add(movement)
    await db.flush()
    await check_low_stock(product.id, shopkeeper_id, db)
    await db.commit()
    await db.refresh(product)
    await invalidate_cache("dashboard:*")
    await emit_inventory_update(shopkeeper_id, {
        "product_id": product.id,
        "product_name": product.name,
        "previous_stock": previous_stock,
        "new_stock": product.stock_quantity,
        "action": payload.action,
    })

    mtype_str = mtype.value if hasattr(mtype, "value") else str(mtype)
    return {
        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,
        "previous_stock": previous_stock,
        "new_stock": product.stock_quantity,
        "movement_id": movement.id,
        "movement_type": mtype_str,
    }
