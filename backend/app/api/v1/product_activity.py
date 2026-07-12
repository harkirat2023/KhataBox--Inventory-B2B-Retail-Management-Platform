from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.product import Product
from app.models.product_activity import ProductActivity
from app.models.user import User
from app.schemas.product_activity import ProductActivityListResponse, ProductActivityResponse

router = APIRouter()


@router.get("/{product_id}", response_model=ProductActivityListResponse)
async def get_product_activity(
    product_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    product = await db.execute(select(Product).where(Product.id == product_id, Product.owner_id == current_user.id))
    if not product.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    base = select(ProductActivity).where(
        ProductActivity.product_id == product_id,
        ProductActivity.shopkeeper_id == current_user.id,
    )
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    rows = (await db.execute(base.order_by(ProductActivity.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ProductActivityListResponse(
        activities=[ProductActivityResponse.model_validate(r) for r in rows],
        total=total,
    )
