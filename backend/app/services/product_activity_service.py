from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_activity import ActivityType, ProductActivity


async def log_activity(
    db: AsyncSession,
    product_id: int,
    shopkeeper_id: int,
    activity_type: ActivityType,
    previous_value: float | None = None,
    new_value: float | None = None,
    quantity: int | None = None,
    reference: str | None = None,
    notes: str | None = None,
) -> ProductActivity:
    activity = ProductActivity(
        product_id=product_id,
        shopkeeper_id=shopkeeper_id,
        activity_type=activity_type,
        previous_value=previous_value,
        new_value=new_value,
        quantity=quantity,
        reference=reference,
        notes=notes,
    )
    db.add(activity)
    return activity
