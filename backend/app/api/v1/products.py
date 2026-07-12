import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.notification import NotificationType
from app.models.price_history import PriceHistory
from app.models.inventory import InventoryMovement, MovementType
from app.models.product import Product
from app.models.product_activity import ActivityType
from app.models.store import Store
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.cache import invalidate_pattern as invalidate_cache
from app.services.notifications import check_low_stock, create_notification
from app.services.product_activity_service import log_activity
from app.services.storage import upload as r2_upload, is_available as r2_available
from app.config import settings

router = APIRouter()


async def _enrich_store_name(product: Product, resp: ProductResponse, db: AsyncSession) -> ProductResponse:
    if product.store_id:
        store_result = await db.execute(select(Store).where(Store.id == product.store_id))
        store = store_result.scalar_one_or_none()
        resp.store_name = store.name if store else None
    return resp


@router.get("/", response_model=list[ProductResponse])
async def list_products(
    search: str | None = Query(None),
    category: str | None = Query(None),
    brand: str | None = Query(None),
    stock_status: str | None = Query(None, description="in_stock, low_stock, out_of_stock"),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    store_id: int | None = Query(None),
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    response: Response = None,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
    count_query = select(func.count()).select_from(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
    if category:
        base_query = base_query.where(Product.category == category)
        count_query = count_query.where(Product.category == category)
    if brand:
        base_query = base_query.where(Product.brand.ilike(f"%{brand}%"))
        count_query = count_query.where(Product.brand.ilike(f"%{brand}%"))
    if store_id:
        base_query = base_query.where(Product.store_id == store_id)
        count_query = count_query.where(Product.store_id == store_id)
    if min_price is not None:
        base_query = base_query.where(Product.selling_price >= min_price)
        count_query = count_query.where(Product.selling_price >= min_price)
    if max_price is not None:
        base_query = base_query.where(Product.selling_price <= max_price)
        count_query = count_query.where(Product.selling_price <= max_price)
    if stock_status == "in_stock":
        base_query = base_query.where(Product.stock_quantity > Product.reorder_threshold)
        count_query = count_query.where(Product.stock_quantity > Product.reorder_threshold)
    elif stock_status == "low_stock":
        base_query = base_query.where(Product.stock_quantity > 0, Product.stock_quantity <= Product.reorder_threshold)
        count_query = count_query.where(Product.stock_quantity > 0, Product.stock_quantity <= Product.reorder_threshold)
    elif stock_status == "out_of_stock":
        base_query = base_query.where(Product.stock_quantity == 0)
        count_query = count_query.where(Product.stock_quantity == 0)
    if search:
        base_query = base_query.where(Product.search_vector.op("@@")(func.plainto_tsquery("english", search)))
        count_query = count_query.where(Product.search_vector.op("@@")(func.plainto_tsquery("english", search)))
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    products = result.scalars().all()
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))

    stores = {}
    if products:
        store_ids = list(set(p.store_id for p in products if p.store_id))
        if store_ids:
            store_result = await db.execute(select(Store).where(Store.id.in_(store_ids)))
            stores = {s.id: s.name for s in store_result.scalars().all()}

    responses = []
    for p in products:
        resp = ProductResponse.model_validate(p)
        resp.store_name = stores.get(p.store_id) if p.store_id else None
        responses.append(resp)
    return responses


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Product).where(Product.sku == payload.sku, Product.owner_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")

    # Auto-assign store_id if user has exactly one store
    data = payload.model_dump()
    if data.get("store_id") is None:
        store_result = await db.execute(select(Store).where(Store.owner_id == current_user.id, Store.is_active == True))
        stores = store_result.scalars().all()
        if len(stores) == 1:
            data["store_id"] = stores[0].id
        elif len(stores) >= 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Multiple stores found. Please specify a store_id.")

    product = Product(**data, owner_id=current_user.id)
    db.add(product)
    await db.flush()
    await check_low_stock(product.id, current_user.id, db)
    try:
        await log_activity(
            db=db, product_id=product.id, shopkeeper_id=current_user.id,
            activity_type=ActivityType.PRODUCT_CREATED,
            reference=f"Created by {current_user.email}",
        )
    except Exception as e:
        print(f"[products] log_activity skipped: {e}")
    try:
        await create_notification(
            db=db, user_id=current_user.id, type=NotificationType.PRODUCT_CREATED,
            title="Product Created",
            message=f"{product.name} ({product.sku}) — ₹{product.selling_price}",
            reference_id=product.id,
        )
    except Exception as e:
        print(f"[products] create_notification skipped: {e}")
    await db.commit()
    await db.refresh(product)
    await invalidate_cache("dashboard:*")
    return await _enrich_store_name(product, ProductResponse.model_validate(product), db)


@router.get("/by-uuid/{uuid}", response_model=ProductResponse)
async def get_product_by_uuid(uuid: str, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", uuid.lower()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid UUID format")
    result = await db.execute(
        select(Product).where(Product.product_uuid == uuid, Product.owner_id == current_user.id, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return await _enrich_store_name(product, ProductResponse.model_validate(product), db)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.owner_id == current_user.id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return await _enrich_store_name(product, ProductResponse.model_validate(product), db)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, payload: ProductUpdate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.owner_id == current_user.id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    updated = payload.model_dump(exclude_unset=True)

    # Track stock change before overwriting
    old_stock = product.stock_quantity

    # Track price changes before applying
    for field in ("cost_price", "selling_price"):
        if field in updated and updated[field] != getattr(product, field):
            db.add(PriceHistory(
                product_id=product.id, shopkeeper_id=current_user.id,
                field_name=field, previous_value=getattr(product, field),
                new_value=updated[field],
                changed_by=current_user.email, reason="Manual update",
            ))
            await log_activity(
                db=db, product_id=product.id, shopkeeper_id=current_user.id,
                activity_type=ActivityType.PRICE_CHANGE,
                previous_value=float(getattr(product, field) or 0),
                new_value=float(updated[field]),
                reference=f"{field}: {getattr(product, field)} → {updated[field]}",
            )
    for key, value in updated.items():
        setattr(product, key, value)
    await db.flush()
    if "stock_quantity" in updated:
        diff = product.stock_quantity - old_stock
        db.add(InventoryMovement(
            product_id=product.id, shopkeeper_id=current_user.id,
            store_id=product.store_id,
            movement_type=MovementType.ADJUSTMENT,
            quantity=diff,
            reference=f"Manual stock edit: {old_stock} → {product.stock_quantity}",
        ))
        await log_activity(
            db=db, product_id=product.id, shopkeeper_id=current_user.id,
            activity_type=ActivityType.STOCK_UPDATE,
            quantity=product.stock_quantity,
            reference="Manual stock update",
        )
        await check_low_stock(product.id, current_user.id, db)
    await create_notification(
        db=db, user_id=current_user.id, type=NotificationType.STOCK_UPDATED,
        title="Product Updated",
        message=f"{product.name} ({product.sku}) — stock: {product.stock_quantity}, price: ₹{product.selling_price}",
        reference_id=product.id,
    )
    await db.commit()
    await db.refresh(product)
    await invalidate_cache("dashboard:*")
    return await _enrich_store_name(product, ProductResponse.model_validate(product), db)


@router.post("/{product_id}/image", response_model=ProductResponse)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.owner_id == current_user.id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    key = f"products/{current_user.id}/{product.id}_{uuid.uuid4().hex[:8]}.{ext}"
    data = await file.read()

    if r2_available():
        ok = r2_upload(key, data, file.content_type or "image/png")
        if not ok:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Failed to upload image")
        product.image_url = f"{settings.R2_PUBLIC_URL}/{key}" if settings.R2_PUBLIC_URL else key
    else:
        product.image_url = f"/api/v1/products/{product.id}/image/placeholder"

    await db.commit()
    await db.refresh(product)
    return await _enrich_store_name(product, ProductResponse.model_validate(product), db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.owner_id == current_user.id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product.is_active = False
    await db.commit()
    await invalidate_cache("dashboard:*")
