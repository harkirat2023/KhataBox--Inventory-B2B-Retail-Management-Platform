from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.models.product import Product
from app.models.user import User
from app.services.email import send_email

MAX_NOTIFICATIONS_PER_USER = 50


async def create_notification(
    db: AsyncSession,
    user_id: int,
    type: NotificationType,
    title: str,
    message: str,
    reference_id: int | None = None,
    send_email_to: str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        reference_id=reference_id,
    )
    db.add(notification)

    # Enforce max 50 per user — delete oldest if over limit
    count = (await db.execute(select(func.count()).select_from(Notification).where(Notification.user_id == user_id))).scalar()
    if count > MAX_NOTIFICATIONS_PER_USER:
        excess = count - MAX_NOTIFICATIONS_PER_USER
        old = (await db.execute(
            select(Notification.id)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.asc())
            .limit(excess)
        )).scalars().all()
        if old:
            from sqlalchemy import delete as sa_delete
            await db.execute(sa_delete(Notification).where(Notification.id.in_(old)))

    if send_email_to:
        await send_email(
            to=send_email_to,
            subject=title,
            html=f"<h2>{title}</h2><p>{message}</p>",
        )

    return notification


async def check_low_stock(product_id: int, shopkeeper_id: int, db: AsyncSession) -> Notification | None:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        return None
    if product.stock_quantity > product.reorder_threshold:
        return None

    existing = await db.execute(
        select(Notification).where(
            Notification.reference_id == product_id,
            Notification.type == NotificationType.LOW_STOCK,
            Notification.user_id == shopkeeper_id,
            Notification.is_read == False,
        )
    )
    if existing.scalar_one_or_none():
        return None

    notification = await create_notification(
        db=db,
        user_id=shopkeeper_id,
        type=NotificationType.LOW_STOCK,
        title="Low Stock Alert",
        message=f"{product.name} ({product.sku}) is running low — only {product.stock_quantity} units remaining (threshold: {product.reorder_threshold})",
        reference_id=product_id,
    )

    user_result = await db.execute(select(User).where(User.id == shopkeeper_id))
    user = user_result.scalar_one_or_none()
    if user and user.email:
        await send_email(
            to=user.email,
            subject=f"Low Stock Alert: {product.name}",
            html=f"""
            <h2>Low Stock Alert</h2>
            <p><strong>{product.name}</strong> (SKU: {product.sku}) is running low.</p>
            <p>Current stock: <strong>{product.stock_quantity}</strong> units</p>
            <p>Reorder threshold: <strong>{product.reorder_threshold}</strong> units</p>
            <p>Please restock soon to avoid stockouts.</p>
            """,
        )

    return notification
