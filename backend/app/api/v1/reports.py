import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from openpyxl import Workbook

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.customer import Customer
from app.models.order import Order, OrderStatus, OrderItem
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder
from app.models.user import User

router = APIRouter()


@router.get("/customers/top")
async def top_customers(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Customer.id,
            Customer.company_name,
            Customer.email,
            Customer.credit_limit,
            Customer.credit_used,
            func.coalesce(func.sum(Order.total), 0).label("total_spent"),
            func.count(Order.id).label("order_count"),
        )
        .select_from(Customer)
        .outerjoin(Order, Order.customer_id == Customer.id)
        .where(Customer.owner_id == current_user.id, Order.status != OrderStatus.CANCELLED)
        .group_by(Customer.id)
        .order_by(func.coalesce(func.sum(Order.total), 0).desc())
        .limit(limit)
    )
    return [
        {
            "id": row[0],
            "company_name": row[1],
            "email": row[2],
            "credit_limit": row[3],
            "credit_used": row[4],
            "total_spent": float(row[5]),
            "order_count": row[6],
        }
        for row in result.all()
    ]


@router.get("/customers/repeat-purchases")
async def repeat_purchases(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Customer.id,
            Customer.company_name,
            Customer.email,
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total), 0).label("total_spent"),
        )
        .select_from(Customer)
        .join(Order, Order.customer_id == Customer.id)
        .where(Customer.owner_id == current_user.id, Order.status != OrderStatus.CANCELLED)
        .group_by(Customer.id)
        .having(func.count(Order.id) > 1)
        .order_by(func.count(Order.id).desc())
        .limit(limit)
    )
    return [
        {
            "id": row[0],
            "company_name": row[1],
            "email": row[2],
            "order_count": row[3],
            "total_spent": float(row[4]),
        }
        for row in result.all()
    ]


@router.get("/customers/clv")
async def customer_lifetime_value(
    min_orders: int = Query(1, ge=1),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Customer.id,
            Customer.company_name,
            Customer.email,
            func.coalesce(func.sum(Order.total), 0).label("lifetime_value"),
            func.count(Order.id).label("order_count"),
            func.avg(Order.total).label("avg_order_value"),
            func.max(Order.created_at).label("last_order_date"),
        )
        .select_from(Customer)
        .outerjoin(Order, Order.customer_id == Customer.id)
        .where(Customer.owner_id == current_user.id, Order.status != OrderStatus.CANCELLED)
        .group_by(Customer.id)
        .having(func.count(Order.id) >= min_orders)
        .order_by(func.coalesce(func.sum(Order.total), 0).desc())
    )
    return [
        {
            "id": row[0],
            "company_name": row[1],
            "email": row[2],
            "lifetime_value": float(row[3]),
            "order_count": row[4],
            "avg_order_value": round(float(row[5]), 2) if row[5] else 0,
            "last_order_date": row[6].isoformat() if row[6] else None,
        }
        for row in result.all()
    ]


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
    )


def _xlsx_response(rows: list[dict], filename: str) -> StreamingResponse:
    wb = Workbook()
    ws = wb.active
    if rows:
        ws.append(list(rows[0].keys()))
        for row in rows:
            ws.append(list(row.values()))
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"},
    )


@router.get("/export/orders")
async def export_orders(
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    base = select(Order).where(Order.shopkeeper_id == current_user.id).options(selectinload(Order.items))
    if start_date:
        base = base.where(Order.created_at >= start_date)
    if end_date:
        base = base.where(Order.created_at <= end_date)
    rows = (await db.execute(base.order_by(Order.created_at.desc()))).scalars().all()
    data = []
    for o in rows:
        for it in (o.items or []):
            data.append({
                "Order #": o.order_number,
                "Date": o.created_at.isoformat(),
                "Status": o.status.value if hasattr(o.status, "value") else str(o.status),
                "Customer": o.customer_name or "",
                "Product": it.product_name,
                "Qty": it.quantity,
                "Unit Price": float(it.unit_price),
                "Total": float(it.total_price),
                "Order Total": float(o.total),
                "Payment": o.payment_method.value if hasattr(o.payment_method, "value") else str(o.payment_method),
            })
    if format == "xlsx":
        return _xlsx_response(data, "orders_export")
    return _csv_response(data, "orders_export")


@router.get("/export/products")
async def export_products(
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
    )).scalars().all()
    data = [{
        "Name": p.name,
        "SKU": p.sku,
        "Category": p.category or "",
        "Brand": p.brand or "",
        "Cost Price": float(p.cost_price) if p.cost_price else 0,
        "Selling Price": float(p.selling_price) if p.selling_price else 0,
        "Stock": p.stock_quantity or 0,
        "Reorder Threshold": p.reorder_threshold or 0,
        "HSN": p.hsn_code or "",
    } for p in rows]
    if format == "xlsx":
        return _xlsx_response(data, "products_export")
    return _csv_response(data, "products_export")


@router.get("/export/customers")
async def export_customers(
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Customer).where(Customer.owner_id == current_user.id)
    )).scalars().all()
    data = [{
        "Company": c.company_name or "",
        "Contact": c.contact_person or "",
        "Email": c.email or "",
        "Phone": c.phone or "",
        "Credit Limit": float(c.credit_limit) if c.credit_limit else 0,
        "Credit Used": float(c.credit_used) if c.credit_used else 0,
        "GST": c.gst_no or "",
    } for c in rows]
    if format == "xlsx":
        return _xlsx_response(data, "customers_export")
    return _csv_response(data, "customers_export")


@router.get("/export/suppliers")
async def export_suppliers(
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Supplier).where(Supplier.owner_id == current_user.id)
    )).scalars().all()
    data = [{
        "Name": s.name or "",
        "Contact": s.contact_person or "",
        "Email": s.email or "",
        "GST": s.gst_no or "",
    } for s in rows]
    if format == "xlsx":
        return _xlsx_response(data, "suppliers_export")
    return _csv_response(data, "suppliers_export")
