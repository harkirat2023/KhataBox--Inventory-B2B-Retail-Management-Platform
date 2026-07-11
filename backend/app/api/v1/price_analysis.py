import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/overview")
async def get_price_analysis_overview(
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.owner_id == current_user.id, Product.is_active == True)
    )
    products = result.scalars().all()

    if not products:
        return {
            "total_products": 0,
            "procurement_analysis": [],
            "profitability": [],
            "hml": {"high": 0, "medium": 0, "low": 0},
            "low_stock_alerts": [],
        }

    procurement_analysis = []
    profitability = []
    high_cost = medium_cost = low_cost = 0
    low_stock_alerts = []

    for p in products:
        landed_cost = p.cost_price
        if p.shipping_cost or p.freight or p.handling or p.packaging or p.tariff:
            landed_cost += (p.shipping_cost or 0) + (p.freight or 0) + (p.handling or 0) + (p.packaging or 0) + (p.tariff or 0)

        gross_profit = p.selling_price - p.cost_price
        gross_margin = round((gross_profit / p.selling_price) * 100, 2) if p.selling_price > 0 else 0
        revenue_projection = p.selling_price * p.stock_quantity
        total_profit = gross_profit * p.stock_quantity
        gmroi = round((gross_margin / (p.cost_price or 1)) * 100, 2) if p.cost_price > 0 else 0

        procurement_analysis.append({
            "product_id": p.id,
            "product_name": p.name,
            "sku": p.sku,
            "category": p.category,
            "cost_price": p.cost_price,
            "selling_price": p.selling_price,
            "market_price": p.market_price,
            "vendor_price": p.vendor_price,
            "cost_vs_market_diff": round((p.market_price or p.selling_price) - p.cost_price, 2),
            "cost_vs_market_pct": round((((p.market_price or p.selling_price) - p.cost_price) / p.cost_price) * 100, 2) if p.cost_price > 0 else 0,
        })

        profitability.append({
            "product_id": p.id,
            "product_name": p.name,
            "sku": p.sku,
            "cost_price": p.cost_price,
            "selling_price": p.selling_price,
            "landed_cost": round(landed_cost, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_margin_pct": gross_margin,
            "gmroi": gmroi,
            "revenue_projection": round(revenue_projection, 2),
            "total_profit": round(total_profit, 2),
            "stock_quantity": p.stock_quantity,
        })

        if p.reorder_threshold > 0 and p.stock_quantity <= p.reorder_threshold:
            low_stock_alerts.append({
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "stock_quantity": p.stock_quantity,
                "reorder_threshold": p.reorder_threshold,
            })

        if p.cost_price > 500:
            high_cost += 1
        elif p.cost_price > 100:
            medium_cost += 1
        else:
            low_cost += 1

    return {
        "total_products": len(products),
        "procurement_analysis": procurement_analysis,
        "profitability": profitability,
        "hml": {"high": high_cost, "medium": medium_cost, "low": low_cost},
        "low_stock_alerts": low_stock_alerts,
    }


@router.get("/true-cost/{product_id}")
async def get_true_cost(
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

    components = {
        "cost_price": product.cost_price,
        "shipping_cost": product.shipping_cost or 0,
        "freight": product.freight or 0,
        "handling": product.handling or 0,
        "packaging": product.packaging or 0,
        "tariff": product.tariff or 0,
    }
    landed_cost = sum(components.values())

    return {
        "product_id": product.id,
        "product_name": product.name,
        "components": components,
        "landed_cost": round(landed_cost, 2),
        "selling_price": product.selling_price,
        "profit_at_current": round(product.selling_price - landed_cost, 2),
        "margin_at_current": round(((product.selling_price - landed_cost) / product.selling_price) * 100, 2) if product.selling_price > 0 else 0,
    }


@router.get("/suggestions/{product_id}")
async def get_dynamic_pricing_suggestions(
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

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    sales_result = await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.product_id == product_id,
            Order.shopkeeper_id == current_user.id,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= thirty_days_ago,
        )
    )
    sales_velocity = sales_result.scalar() or 0

    age_days = (datetime.now(timezone.utc) - product.created_at).days if product.created_at else 0

    current_margin = ((product.selling_price - product.cost_price) / product.selling_price * 100) if product.selling_price > 0 else 0

    suggestions = []
    for target_margin in [15, 20, 25, 30, 35]:
        suggested_price = round(product.cost_price / (1 - target_margin / 100), 2)
        suggestions.append({
            "target_margin_pct": target_margin,
            "suggested_price": suggested_price,
            "current_price": product.selling_price,
            "current_margin_pct": round(current_margin, 2),
            "expected_margin_pct": target_margin,
            "price_change": round(suggested_price - product.selling_price, 2),
            "price_change_pct": round(((suggested_price - product.selling_price) / product.selling_price) * 100, 2) if product.selling_price > 0 else 0,
        })

    recommendation = None
    if sales_velocity >= 10 and current_margin < 25:
        recommendation = "increase"
    elif sales_velocity < 3 and current_margin > 35:
        recommendation = "decrease"
    else:
        recommendation = "maintain"

    return {
        "product_id": product.id,
        "product_name": product.name,
        "current_price": product.selling_price,
        "cost_price": product.cost_price,
        "current_margin_pct": round(current_margin, 2),
        "sales_velocity_30d": sales_velocity,
        "inventory_age_days": age_days,
        "suggestions": suggestions,
        "recommendation": recommendation,
    }
