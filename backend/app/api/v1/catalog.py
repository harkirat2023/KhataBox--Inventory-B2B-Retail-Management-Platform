import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.product import Product
from app.models.user import User

router = APIRouter()


@router.get("/products")
async def catalog_products(
    search: str = Query("", max_length=100),
    category: str = Query("", max_length=100),
    brand: str = Query("", max_length=100),
    min_price: float = Query(0),
    max_price: float = Query(0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_active == True)

    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%")
        )
    if category:
        query = query.where(Product.category.ilike(f"%{category}%"))
    if brand:
        query = query.where(Product.brand.ilike(f"%{brand}%"))
    if min_price > 0:
        query = query.where(Product.selling_price >= min_price)
    if max_price > 0:
        query = query.where(Product.selling_price <= max_price)

    query = query.order_by(Product.name)
    result = await db.execute(query)
    products = result.scalars().all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "brand": p.brand,
            "selling_price": p.selling_price,
            "stock_quantity": p.stock_quantity,
        }
        for p in products
    ]


@router.get("/by-uuid/{uuid}")
async def catalog_product_by_uuid(
    uuid: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", uuid.lower()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid UUID format")
    result = await db.execute(
        select(Product).where(Product.product_uuid == uuid, Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "brand": product.brand,
        "selling_price": product.selling_price,
        "stock_quantity": product.stock_quantity,
    }
