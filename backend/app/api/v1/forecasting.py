from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.ml import predict as ml_predict
from app.ml import train as ml_train
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.forecasting import (
    DailySalesPoint,
    DemandForecastResponse,
    RetrainResponse,
    SalesHistoryResponse,
)

router = APIRouter()


def _trend_from_slope(values: list[float]) -> str:
    if len(values) < 2:
        return "stable"
    half = len(values) // 2
    first_half = sum(values[:half]) / max(half, 1)
    second_half = sum(values[half:]) / max(len(values) - half, 1)
    diff = second_half - first_half
    threshold = max(first_half, second_half) * 0.05
    if diff > threshold:
        return "up"
    if diff < -threshold:
        return "down"
    return "stable"


@router.get("/demand/{product_id}", response_model=DemandForecastResponse)
async def get_demand_forecast(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    # Quantities sold in last 30 days
    last_30 = await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == "completed",
            Order.created_at >= thirty_days_ago,
        )
    )
    total_sold_last_30_days = last_30.scalar() or 0

    # Quantities sold in the 30 days before that
    prev_30 = await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == "completed",
            Order.created_at >= sixty_days_ago,
            Order.created_at < thirty_days_ago,
        )
    )
    total_sold_prev_30_days = prev_30.scalar() or 0

    # Category average monthly sales
    category_avg_monthly = 0.0
    if product.category:
        cat_subq = (
            select(
                OrderItem.product_id,
                func.sum(OrderItem.quantity).label("qty"),
            )
            .join(Order, OrderItem.order_id == Order.id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(
                Product.category == product.category,
                Product.owner_id == current_user.id,
                Order.shopkeeper_id == current_user.id,
                Order.status == "completed",
                Order.created_at >= thirty_days_ago,
            )
            .group_by(OrderItem.product_id)
            .subquery()
        )
        cat_result = await db.execute(
            select(func.coalesce(func.avg(cat_subq.c.qty), 0))
        )
        category_avg_monthly = round((cat_result.scalar() or 0), 1)

    # Monthly trend from last 6 months
    monthly_totals = []
    for i in range(6):
        month_start = now - timedelta(days=(i + 1) * 30)
        month_end = now - timedelta(days=i * 30)
        m_res = await db.execute(
            select(func.coalesce(func.sum(OrderItem.quantity), 0))
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                OrderItem.product_id == product_id,
                Order.shopkeeper_id == current_user.id,
                Order.status == "completed",
                Order.created_at >= month_start,
                Order.created_at < month_end,
            )
        )
        monthly_totals.append(float(m_res.scalar() or 0))
    monthly_totals.reverse()
    trend = _trend_from_slope(monthly_totals)

    # ML prediction
    current_stock = product.stock_quantity
    if ml_predict.is_model_ready():
        ml_input = {
            "product_id": product_id,
            "category": product.category or "unknown",
            "current_stock": current_stock,
            "selling_price": product.selling_price,
            "day_of_week": now.weekday(),
            "month": now.month,
            "day_of_month": now.day,
            "is_holiday": 1 if now.weekday() >= 5 else 0,
            "is_weekend": 1 if now.weekday() >= 5 else 0,
        }
        forecast = ml_predict.predict_demand(ml_input)
    else:
        predicted_demand = round(total_sold_last_30_days * 1.1)
        seasonality_factor = 1.1 if now.month in [11, 12, 3, 4] else 1.0
        forecast = {
            "predicted_demand": predicted_demand,
            "recommended_order_qty": max(0, predicted_demand - current_stock),
            "confidence_score": 85,
            "seasonality_factor": seasonality_factor,
        }

    return DemandForecastResponse(
        product_id=product_id,
        product_name=product.name,
        category=product.category,
        current_stock=current_stock,
        total_sold_last_30_days=total_sold_last_30_days,
        total_sold_prev_30_days=total_sold_prev_30_days,
        predicted_demand=forecast["predicted_demand"],
        recommended_order_qty=forecast["recommended_order_qty"],
        confidence_score=forecast["confidence_score"],
        seasonality_factor=forecast["seasonality_factor"],
        trend=trend,
        category_avg_monthly=category_avg_monthly,
        store_id=product.store_id,
    )


@router.get("/demand/{product_id}/sales-history", response_model=SalesHistoryResponse)
async def get_sales_history(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    now = datetime.now(timezone.utc)
    twelve_months_ago = now - timedelta(days=365)

    daily_rows = await db.execute(
        select(
            func.date(Order.created_at).label("sale_date"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("qty"),
            func.coalesce(func.sum(OrderItem.total_price), 0).label("rev"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == "completed",
            Order.created_at >= twelve_months_ago,
        )
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    daily = daily_rows.all()

    daily_sales = [
        DailySalesPoint(
            date=str(row.sale_date),
            quantity=int(row.qty),
            revenue=round(float(row.rev), 2),
        )
        for row in daily
    ]

    # Monthly aggregation for trend
    monthly_rows = await db.execute(
        select(
            func.date_trunc(text("month"), Order.created_at).label("month"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("qty"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == "completed",
            Order.created_at >= twelve_months_ago,
        )
        .group_by(func.date_trunc(text("month"), Order.created_at))
        .order_by(func.date_trunc(text("month"), Order.created_at))
    )
    monthly = monthly_rows.all()
    monthly_values = [float(m.qty) for m in monthly]
    monthly_avg = round(sum(monthly_values) / max(len(monthly_values), 1), 1)
    trend = _trend_from_slope(monthly_values)

    peak_month = ""
    low_month = ""
    if monthly:
        peak = max(monthly, key=lambda m: m.qty)
        low = min(monthly, key=lambda m: m.qty)
        peak_month = peak.month.strftime("%Y-%m")
        low_month = low.month.strftime("%Y-%m")

    # MoM change: last full month vs previous month
    mom_change_pct = 0.0
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
    two_months_ago = last_month_start - timedelta(days=1)
    two_months_ago = two_months_ago.replace(day=1)

    tm_res = await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == "completed",
            Order.created_at >= last_month_start,
            Order.created_at < this_month_start,
        )
    )
    this_month_qty = float(tm_res.scalar() or 0)

    lm_res = await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == "completed",
            Order.created_at >= two_months_ago,
            Order.created_at < last_month_start,
        )
    )
    last_month_qty = float(lm_res.scalar() or 0)

    if last_month_qty > 0:
        mom_change_pct = round(((this_month_qty - last_month_qty) / last_month_qty) * 100, 1)

    return SalesHistoryResponse(
        product_id=product_id,
        product_name=product.name,
        daily_sales=daily_sales,
        monthly_avg=monthly_avg,
        peak_month=peak_month,
        low_month=low_month,
        trend=trend,
        mom_change_pct=mom_change_pct,
    )


@router.post("/ml/retrain", response_model=RetrainResponse)
async def retrain_model(
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    try:
        metrics = await ml_train.train_from_db(db, shopkeeper_id=current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}",
        )
    return RetrainResponse(
        r2_score=metrics["r2_score"],
        mae=metrics["mae"],
        samples=metrics["samples"],
        features=ml_train.FEATURE_COLS,
    )
