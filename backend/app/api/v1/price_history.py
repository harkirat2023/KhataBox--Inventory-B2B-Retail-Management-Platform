from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.price_history import PriceHistory
from app.models.user import User
from app.schemas.price_history import PriceHistoryListResponse, PriceHistoryResponse

router = APIRouter()


@router.get("/{product_id}", response_model=PriceHistoryListResponse)
async def get_product_price_history(
    product_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    base = select(PriceHistory).where(
        PriceHistory.product_id == product_id,
        PriceHistory.shopkeeper_id == current_user.id,
    )
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    rows = (await db.execute(base.order_by(PriceHistory.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return PriceHistoryListResponse(
        history=[PriceHistoryResponse.model_validate(r) for r in rows],
        total=total,
    )
