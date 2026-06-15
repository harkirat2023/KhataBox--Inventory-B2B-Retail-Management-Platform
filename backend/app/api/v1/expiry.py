from datetime import date, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductResponse

router = APIRouter()


@router.get("/upcoming")
async def upcoming_expiry(
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    query = select(Product).where(
        Product.owner_id == current_user.id,
        Product.expiry_date.isnot(None),
        Product.is_active == True,
    )
    result = await db.execute(query)
    products = result.scalars().all()

    alerts_30 = []
    alerts_60 = []
    alerts_90 = []

    for p in products:
        if not p.expiry_date:
            continue
        days_until = (p.expiry_date - today).days
        entry = {
            "product_id": p.id,
            "name": p.name,
            "sku": p.sku,
            "batch_number": p.batch_number,
            "mfg_date": str(p.mfg_date) if p.mfg_date else None,
            "expiry_date": str(p.expiry_date),
            "days_remaining": days_until,
            "stock_quantity": p.stock_quantity,
        }
        if 0 <= days_until <= 30:
            alerts_30.append(entry)
        elif 31 <= days_until <= 60:
            alerts_60.append(entry)
        elif 61 <= days_until <= 90:
            alerts_90.append(entry)

    return {
        "message": f"Found {len(alerts_30)} products expiring within 30 days, {len(alerts_60)} within 60 days, {len(alerts_90)} within 90 days",
        "alerts": {
            "30_days": sorted(alerts_30, key=lambda x: x["days_remaining"]),
            "60_days": sorted(alerts_60, key=lambda x: x["days_remaining"]),
            "90_days": sorted(alerts_90, key=lambda x: x["days_remaining"]),
        },
    }
