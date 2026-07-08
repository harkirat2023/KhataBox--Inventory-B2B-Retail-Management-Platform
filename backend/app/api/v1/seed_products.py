import uuid as _uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.product import Product
from app.models.seed_product import SeedProduct
from app.models.store import Store
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class SeedProductResponse(BaseModel):
    id: int
    store_type: str
    name: str
    sku_prefix: str
    category: str
    default_selling_price: float
    default_cost_price: float

    model_config = {"from_attributes": True}


class BulkAddItem(BaseModel):
    seed_product_id: int
    quantity: int = 1


class BulkAddRequest(BaseModel):
    items: list[BulkAddItem]


class BulkAddResponse(BaseModel):
    created: int
    products: list[dict]


@router.get("", response_model=list[SeedProductResponse])
async def list_seed_products(
    store_type: str = Query(..., description="Store type (kirana, supermart, etc.)"),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SeedProduct).where(SeedProduct.store_type == store_type).order_by(SeedProduct.category, SeedProduct.name)
    )
    return [SeedProductResponse.model_validate(sp) for sp in result.scalars().all()]


@router.post("/bulk-add", response_model=BulkAddResponse)
async def bulk_add_seed_products(
    payload: BulkAddRequest,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No items provided")

    # Fetch all seed products
    seed_ids = [item.seed_product_id for item in payload.items]
    result = await db.execute(select(SeedProduct).where(SeedProduct.id.in_(seed_ids)))
    seed_map = {sp.id: sp for sp in result.scalars().all()}

    # Find user's store
    store_result = await db.execute(
        select(Store).where(Store.owner_id == current_user.id).limit(1)
    )
    store = store_result.scalar_one_or_none()

    # Build a qty map
    qty_map = {item.seed_product_id: item.quantity for item in payload.items}

    sku_index = 1
    existing_sku_result = await db.execute(
        select(Product).where(Product.owner_id == current_user.id).order_by(Product.id.desc()).limit(1)
    )
    last = existing_sku_result.scalar_one_or_none()
    if last and last.sku:
        try:
            parts = last.sku.rsplit("-", 1)
            sku_index = int(parts[-1]) + 1
        except (ValueError, IndexError):
            sku_index = 1

    created_products = []
    for item in payload.items:
        sp = seed_map.get(item.seed_product_id)
        if not sp:
            logger.warning(f"SeedProduct {item.seed_product_id} not found, skipping")
            continue

        qty = qty_map.get(item.seed_product_id, 1)
        sku = f"{sp.sku_prefix}-{sku_index:04d}"
        sku_index += 1

        product = Product(
            product_uuid=str(_uuid.uuid4()),
            name=sp.name,
            sku=sku,
            category=sp.category,
            cost_price=sp.default_cost_price,
            selling_price=sp.default_selling_price,
            stock_quantity=qty,
            owner_id=current_user.id,
            store_id=store.id if store else None,
            is_active=True,
        )
        db.add(product)
        await db.flush()
        created_products.append({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
        })

    await db.commit()
    return BulkAddResponse(created=len(created_products), products=created_products)
