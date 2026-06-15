import sys
from pathlib import Path

import pytest
from sqlalchemy import select

# Ensure `app` package is importable when running tests from repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product


@pytest.mark.asyncio
async def test_inventory_sync_pending_to_confirmed_reserves_stock(client, db_session, auth_user_shopkeeper):
    """
    Pending -> Confirmed:
    - stock must be reserved (available reduced, reserved increased)
    - inventory movement recorded
    """
    shopkeeper = auth_user_shopkeeper

    product = Product(
        product_uuid="prod-1",
        name="P1",
        sku="SKU1",
        category="cat",
        brand=None,
        description=None,
        cost_price=10.0,
        selling_price=15.0,
        stock_quantity=10,
        reserved_quantity=0,
        reorder_threshold=10,
        batch_number=None,
        mfg_date=None,
        expiry_date=None,
        owner_id=shopkeeper.id,
        store_id=None,
        image_url=None,
        is_active=True,
        search_vector=None,
    )
    db_session.add(product)
    await db_session.flush()

    order = Order(
        order_number="ORD-TEST1",
        shopkeeper_id=shopkeeper.id,
        customer_id=None,
        status=OrderStatus.PENDING,
        payment_method=None,
        subtotal=0,
        discount=0,
        gst=0,
        total=0,
        notes=None,
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name="P1",
        quantity=3,
        unit_price=15.0,
        total_price=45.0,
    )
    db_session.add(item)
    await db_session.flush()

    await db_session.commit()

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", json={"status": "confirmed"})
    assert resp.status_code == 200

    await db_session.refresh(product)
    assert product.stock_quantity == 7
    assert product.reserved_quantity == 3

    moves = (
        await db_session.execute(
            select(InventoryMovement).where(
                InventoryMovement.product_id == product.id,
                InventoryMovement.shopkeeper_id == shopkeeper.id,
            )
        )
    ).scalars().all()
    assert any(m.movement_type == MovementType.RESERVE_OUT for m in moves)


@pytest.mark.asyncio
async def test_inventory_sync_confirmed_to_completed_consumes_reserved_stock(client, db_session, auth_user_shopkeeper):
    """
    Confirmed -> Completed:
    - reserved stock released (reserved reduced)
    - stock_quantity unchanged (already reduced on reserve)
    - inventory movement recorded
    """
    shopkeeper = auth_user_shopkeeper

    product = Product(
        product_uuid="prod-2",
        name="P2",
        sku="SKU2",
        category="cat",
        brand=None,
        description=None,
        cost_price=10.0,
        selling_price=15.0,
        stock_quantity=7,
        reserved_quantity=3,
        reorder_threshold=10,
        batch_number=None,
        mfg_date=None,
        expiry_date=None,
        owner_id=shopkeeper.id,
        store_id=None,
        image_url=None,
        is_active=True,
        search_vector=None,
    )
    db_session.add(product)
    await db_session.flush()

    order = Order(
        order_number="ORD-TEST2",
        shopkeeper_id=shopkeeper.id,
        customer_id=None,
        status=OrderStatus.CONFIRMED,
        payment_method=None,
        subtotal=0,
        discount=0,
        gst=0,
        total=0,
        notes=None,
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name="P2",
        quantity=3,
        unit_price=15.0,
        total_price=45.0,
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.commit()

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", json={"status": "completed"})
    assert resp.status_code == 200

    await db_session.refresh(product)
    assert product.reserved_quantity == 0
    assert product.stock_quantity == 7

    moves = (
        await db_session.execute(
            select(InventoryMovement).where(
                InventoryMovement.product_id == product.id,
                InventoryMovement.shopkeeper_id == shopkeeper.id,
            )
        )
    ).scalars().all()
    assert any(m.movement_type == MovementType.CONSUME_OUT for m in moves)


@pytest.mark.asyncio
async def test_inventory_sync_confirmed_to_cancelled_restores_stock(client, db_session, auth_user_shopkeeper):
    """
    Confirmed -> Cancelled:
    - reserved stock released and available restored
    - inventory movement recorded
    """
    shopkeeper = auth_user_shopkeeper

    product = Product(
        product_uuid="prod-3",
        name="P3",
        sku="SKU3",
        category="cat",
        brand=None,
        description=None,
        cost_price=10.0,
        selling_price=15.0,
        stock_quantity=7,
        reserved_quantity=3,
        reorder_threshold=10,
        batch_number=None,
        mfg_date=None,
        expiry_date=None,
        owner_id=shopkeeper.id,
        store_id=None,
        image_url=None,
        is_active=True,
        search_vector=None,
    )
    db_session.add(product)
    await db_session.flush()

    order = Order(
        order_number="ORD-TEST3",
        shopkeeper_id=shopkeeper.id,
        customer_id=None,
        status=OrderStatus.CONFIRMED,
        payment_method=None,
        subtotal=0,
        discount=0,
        gst=0,
        total=0,
        notes=None,
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name="P3",
        quantity=3,
        unit_price=15.0,
        total_price=45.0,
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.commit()

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", json={"status": "cancelled"})
    assert resp.status_code == 200

    await db_session.refresh(product)
    assert product.reserved_quantity == 0
    assert product.stock_quantity == 10

    moves = (
        await db_session.execute(
            select(InventoryMovement).where(
                InventoryMovement.product_id == product.id,
                InventoryMovement.shopkeeper_id == shopkeeper.id,
            )
        )
    ).scalars().all()
    assert any(m.movement_type == MovementType.RESERVE_CANCELLED_IN for m in moves)


@pytest.mark.asyncio
async def test_inventory_sync_pending_to_cancelled_no_leakage(client, db_session, auth_user_shopkeeper):
    """
    Pending -> Cancelled:
    - no stock deduction
    - no reservation leakage
    - inventory movement should not be created for inventory sync rules
    """
    shopkeeper = auth_user_shopkeeper

    product = Product(
        product_uuid="prod-4",
        name="P4",
        sku="SKU4",
        category="cat",
        brand=None,
        description=None,
        cost_price=10.0,
        selling_price=15.0,
        stock_quantity=10,
        reserved_quantity=0,
        reorder_threshold=10,
        batch_number=None,
        mfg_date=None,
        expiry_date=None,
        owner_id=shopkeeper.id,
        store_id=None,
        image_url=None,
        is_active=True,
        search_vector=None,
    )
    db_session.add(product)
    await db_session.flush()

    order = Order(
        order_number="ORD-TEST4",
        shopkeeper_id=shopkeeper.id,
        customer_id=None,
        status=OrderStatus.PENDING,
        payment_method=None,
        subtotal=0,
        discount=0,
        gst=0,
        total=0,
        notes=None,
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name="P4",
        quantity=3,
        unit_price=15.0,
        total_price=45.0,
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.commit()

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", json={"status": "cancelled"})
    assert resp.status_code == 200

    await db_session.refresh(product)
    assert product.stock_quantity == 10
    assert product.reserved_quantity == 0

    moves = (
        await db_session.execute(
            select(InventoryMovement).where(
                InventoryMovement.product_id == product.id,
                InventoryMovement.shopkeeper_id == shopkeeper.id,
            )
        )
    ).scalars().all()

    assert moves == []
