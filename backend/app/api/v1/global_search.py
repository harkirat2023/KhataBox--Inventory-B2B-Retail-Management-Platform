from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.order import Order
from app.models.product import Product
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.store import Store
from app.models.purchase_order import PurchaseOrder
from app.models.user import User
from app.schemas.product import ProductResponse
from app.schemas.order import OrderResponse

router = APIRouter()


@router.get("/")
async def global_search(
    q: str = Query("", min_length=1, max_length=200),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    if not q.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Search query is required")

    query = q.strip()
    ilike = f"%{query}%"
    results: dict = {}

    # Products
    product_rows = await db.execute(
        select(Product).where(
            Product.owner_id == current_user.id,
            Product.is_active == True,
            or_(Product.name.ilike(ilike), Product.sku.ilike(ilike)),
        ).limit(limit)
    )
    products = product_rows.scalars().all()
    if products:
        results["products"] = [
            {"id": p.id, "name": p.name, "sku": p.sku, "category": p.category, "selling_price": p.selling_price, "stock_quantity": p.stock_quantity, "type": "product"}
            for p in products
        ]

    # Orders
    order_rows = await db.execute(
        select(Order).where(
            Order.shopkeeper_id == current_user.id,
            Order.order_number.ilike(ilike),
        ).options(selectinload(Order.items)).limit(limit)
    )
    orders = order_rows.scalars().all()
    if orders:
        results["orders"] = [
            {"id": o.id, "order_number": o.order_number, "status": o.status, "total": o.total, "customer_name": o.customer_name, "type": "order"}
            for o in orders
        ]

    # Customers
    customer_rows = await db.execute(
        select(Customer).where(
            Customer.owner_id == current_user.id,
            or_(Customer.company_name.ilike(ilike), Customer.contact_person.ilike(ilike), Customer.email.ilike(ilike), Customer.phone.ilike(ilike)),
        ).limit(limit)
    )
    customers = customer_rows.scalars().all()
    if customers:
        results["customers"] = [
            {"id": c.id, "name": c.company_name or c.contact_person, "email": c.email, "phone": c.phone, "type": "customer"}
            for c in customers
        ]

    # Suppliers
    supplier_rows = await db.execute(
        select(Supplier).where(
            Supplier.owner_id == current_user.id,
            or_(Supplier.name.ilike(ilike), Supplier.contact_person.ilike(ilike), Supplier.email.ilike(ilike)),
        ).limit(limit)
    )
    suppliers = supplier_rows.scalars().all()
    if suppliers:
        results["suppliers"] = [
            {"id": s.id, "name": s.name, "contact_person": s.contact_person, "email": s.email, "type": "supplier"}
            for s in suppliers
        ]

    # Purchase Orders
    po_rows = await db.execute(
        select(PurchaseOrder).where(
            PurchaseOrder.shopkeeper_id == current_user.id,
            PurchaseOrder.po_number.ilike(ilike),
        ).limit(limit)
    )
    pos = po_rows.scalars().all()
    if pos:
        results["purchase_orders"] = [
            {"id": p.id, "po_number": p.po_number, "status": p.status, "total": p.total, "type": "purchase_order"}
            for p in pos
        ]

    # Stores
    store_rows = await db.execute(
        select(Store).where(
            Store.owner_id == current_user.id,
            Store.name.ilike(ilike),
        ).limit(limit)
    )
    stores = store_rows.scalars().all()
    if stores:
        results["stores"] = [
            {"id": s.id, "name": s.name, "store_type": s.store_type, "type": "store"}
            for s in stores
        ]

    return results
