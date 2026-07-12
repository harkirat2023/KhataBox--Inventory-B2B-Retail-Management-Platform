import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.notification import Notification
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.services.cache import get as cache_get, set as cache_set, is_available as cache_available

router = APIRouter()


@router.get("")
@router.get("/stats")
async def get_dashboard_stats(
    store_id: int | None = Query(None),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"dashboard:{current_user.id}:{store_id or 'all'}"

    if await cache_available():
        cached = await cache_get(cache_key)
        if cached:
            return cached

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    year_start = month_start.replace(month=1)
    twelve_months_ago = now - timedelta(days=365)

    base_where = [
        Order.shopkeeper_id == current_user.id,
        Order.status == OrderStatus.COMPLETED,
    ]

    async def count_products():
        q = select(func.count(Product.id)).where(Product.owner_id == current_user.id, Product.is_active == True)
        if store_id:
            q = q.where(Product.store_id == store_id)
        r = await db.execute(q)
        return r.scalar() or 0

    async def inventory_value():
        q = select(func.coalesce(func.sum(Product.cost_price * Product.stock_quantity), 0)).where(Product.owner_id == current_user.id, Product.is_active == True)
        if store_id:
            q = q.where(Product.store_id == store_id)
        r = await db.execute(q)
        return round(r.scalar() or 0, 2)

    async def today_sales():
        q = select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0)).where(*base_where, Order.created_at >= today_start)
        r = await db.execute(q)
        c, a = r.one()
        return c, round(a or 0, 2)

    async def pending_count():
        q = select(func.count(Order.id)).where(Order.shopkeeper_id == current_user.id, Order.status == OrderStatus.PENDING)
        r = await db.execute(q)
        return r.scalar() or 0

    async def low_stock_count():
        q = select(func.count(Product.id)).where(Product.owner_id == current_user.id, Product.is_active == True, Product.stock_quantity <= Product.reorder_threshold)
        if store_id:
            q = q.where(Product.store_id == store_id)
        r = await db.execute(q)
        return r.scalar() or 0

    async def out_of_stock_count():
        q = select(func.count(Product.id)).where(Product.owner_id == current_user.id, Product.is_active == True, Product.stock_quantity == 0)
        if store_id:
            q = q.where(Product.store_id == store_id)
        r = await db.execute(q)
        return r.scalar() or 0

    async def this_month_sales():
        q = select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0)).where(*base_where, Order.created_at >= month_start)
        r = await db.execute(q)
        c, a = r.one()
        return c, round(a or 0, 2)

    async def this_year_sales():
        q = select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0)).where(*base_where, Order.created_at >= year_start)
        r = await db.execute(q)
        c, a = r.one()
        return c, round(a or 0, 2)

    async def sales_chart():
        rows = await db.execute(
            select(
                func.date_trunc(text("'month'"), Order.created_at).label("month"),
                func.coalesce(func.sum(Order.total), 0).label("revenue"),
                func.count(Order.id).label("orders"),
            )
            .where(*base_where, Order.created_at >= twelve_months_ago)
            .group_by(func.date_trunc(text("'month'"), Order.created_at))
            .order_by(func.date_trunc(text("'month'"), Order.created_at))
        )
        return [
            {"month": str(r.month.strftime("%Y-%m")), "revenue": round(float(r.revenue), 2), "orders": int(r.orders)}
            for r in rows
        ]

    async def activity_feed():
        # Last 20 notifications + recent orders as unified feed
        notifications = (await db.execute(
            select(Notification).where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc()).limit(20)
        )).scalars().all()
        recent_orders = (await db.execute(
            select(Order).where(Order.shopkeeper_id == current_user.id)
            .order_by(Order.created_at.desc()).limit(10)
        )).scalars().all()
        feed = []
        for n in notifications:
            feed.append({
                "type": "notification",
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "icon": n.type.value if hasattr(n.type, "value") else str(n.type),
                "is_read": n.is_read,
                "created_at": n.created_at,
                "reference_id": n.reference_id,
            })
        for o in recent_orders:
            feed.append({
                "type": "order",
                "id": o.id,
                "title": f"Order {o.order_number}",
                "message": f"Status: {o.status.value if hasattr(o.status, 'value') else o.status}",
                "status": o.status.value if hasattr(o.status, "value") else str(o.status),
                "total": float(o.total),
                "created_at": o.created_at,
            })
        feed.sort(key=lambda x: x["created_at"], reverse=True)
        return feed[:20]

    results = await asyncio.gather(
        count_products(), inventory_value(), today_sales(), pending_count(),
        low_stock_count(), out_of_stock_count(), this_month_sales(),
        this_year_sales(), sales_chart(), activity_feed(),
    )

    month_counts, month_revenue = results[6]
    year_counts, year_revenue = results[7]

    data = {
        "total_products": results[0],
        "total_inventory_value": results[1],
        "today_sales_count": results[2][0],
        "today_sales_amount": results[2][1],
        "pending_orders_count": results[3],
        "low_stock_count": results[4],
        "out_of_stock_count": results[5],
        "total_revenue_today": results[2][1],
        "total_revenue_this_month": month_revenue,
        "total_revenue_this_year": year_revenue,
        "total_orders_today": results[2][0],
        "total_orders_this_month": month_counts,
        "total_orders_this_year": year_counts,
        "sales_chart": results[8],
        "activity_feed": results[9],
    }

    if await cache_available():
        await cache_set(cache_key, data, ttl=300)

    return data
