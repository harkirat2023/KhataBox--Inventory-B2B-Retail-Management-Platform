from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
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
