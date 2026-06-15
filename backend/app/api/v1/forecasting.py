from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.ml import predict as ml_predict
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User

router = APIRouter()


@router.get("/demand/{product_id}")
async def get_demand_forecast(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.owner_id == current_user.id))
    product = result.scalar_one_or_none()
    if not product:
        return {"error": "Product not found"}

    sales_result = await db.execute(
        select(func.sum(OrderItem.quantity))
        .join(Order)
        .where(OrderItem.product_id == product_id, Order.shopkeeper_id == current_user.id)
    )
    total_sold = sales_result.scalar() or 0

    now = datetime.now(timezone.utc)

    if ml_predict.is_model_ready():
        ml_input = {
            "product_id": product_id,
            "category": product.category,
            "current_stock": product.stock_quantity,
            "day_of_week": now.weekday(),
            "month": now.month,
            "is_holiday": 1 if now.weekday() >= 5 else 0,
        }
        forecast = ml_predict.predict_demand(ml_input)
    else:
        predicted_demand = round(total_sold * 1.1)
        seasonality_factor = 1.1 if now.month in [11, 12, 3, 4] else 1.0
        forecast = {
            "predicted_demand": predicted_demand,
            "recommended_order_qty": max(0, predicted_demand - product.stock_quantity),
            "confidence_score": 85,
            "seasonality_factor": seasonality_factor,
        }

    return {
        "product_id": product_id,
        "product_name": product.name,
        "current_stock": product.stock_quantity,
        "total_sold_last_30_days": total_sold,
        **forecast,
    }
