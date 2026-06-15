from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.price_analysis import PriceAnalysisItem, SupplierPriceAnalysisResponse
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate

router = APIRouter()


@router.get("/", response_model=list[SupplierResponse])
async def list_suppliers(current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.owner_id == current_user.id))
    return [SupplierResponse.model_validate(s) for s in result.scalars().all()]


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(payload: SupplierCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    supplier = Supplier(**payload.model_dump(), owner_id=current_user.id)
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(supplier_id: int, payload: SupplierUpdate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, Supplier.owner_id == current_user.id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)
    await db.commit()
    await db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(supplier_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, Supplier.owner_id == current_user.id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    await db.delete(supplier)
    await db.commit()


@router.get("/price-analysis", response_model=list[SupplierPriceAnalysisResponse])
async def price_analysis(current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    """Returns margin analysis grouped by supplier."""
    suppliers_result = await db.execute(select(Supplier).where(Supplier.owner_id == current_user.id))
    suppliers = {s.id: s.name for s in suppliers_result.scalars().all()}

    pos = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.shopkeeper_id == current_user.id)
        .options(selectinload(PurchaseOrder.items))
        .order_by(desc(PurchaseOrder.created_at))
    )
    all_pos = pos.scalars().all()

    product_last_price = {}
    product_last_date = {}
    product_suppliers = defaultdict(set)

    for po in all_pos:
        for item in po.items:
            key = (item.product_id, po.supplier_id)
            if key not in product_last_price:
                product_last_price[key] = item.unit_price
                product_last_date[key] = po.created_at.isoformat()
            product_suppliers[item.product_id].add(po.supplier_id)

    products_result = await db.execute(
        select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
    )
    products = {p.id: p for p in products_result.scalars().all()}

    supplier_groups = defaultdict(list)
    for (pid, sid), unit_price in product_last_price.items():
        product = products.get(pid)
        if not product:
            continue
        margin = round(((product.selling_price - unit_price) / product.selling_price) * 100, 2) if product.selling_price > 0 else 0
        profit = round(product.selling_price - unit_price, 2)
        supplier_groups[sid].append(PriceAnalysisItem(
            product_id=product.id,
            product_name=product.name,
            product_sku=product.sku,
            category=product.category,
            supplier_id=sid,
            supplier_name=suppliers.get(sid, "Unknown"),
            last_supplier_price=round(unit_price, 2),
            current_selling_price=product.selling_price,
            current_cost_price=product.cost_price,
            margin_percent=margin,
            profit_per_unit=profit,
            last_purchased=product_last_date.get((pid, sid)),
        ))

    result = []
    for sid, items in supplier_groups.items():
        avg_margin = round(sum(i.margin_percent for i in items) / len(items), 2) if items else 0
        result.append(SupplierPriceAnalysisResponse(
            supplier_id=sid,
            supplier_name=suppliers.get(sid, "Unknown"),
            items=items,
            avg_margin_percent=avg_margin,
            total_items=len(items),
        ))

    suppliers_without_data = [sid for sid in suppliers if sid not in supplier_groups]
    for sid in suppliers_without_data:
        result.append(SupplierPriceAnalysisResponse(
            supplier_id=sid,
            supplier_name=suppliers[sid],
            items=[],
            avg_margin_percent=0,
            total_items=0,
        ))

    return result
