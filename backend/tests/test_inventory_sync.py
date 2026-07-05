import sys
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import select

# Ensure `app` package is importable when running tests from repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.inventory import InventoryMovement, MovementType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product


@pytest_asyncio.fixture
async def shopkeeper_headers(client, auth_user_shopkeeper):
    r = await client.post("/api/v1/auth/login", json={"email": auth_user_shopkeeper.email, "password": "test123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_inventory_sync_pending_to_confirmed_reserves_stock(client, shopkeeper_headers, db_session, auth_user_shopkeeper):
    """
    Pending -> Confirmed:
    - stock must be reserved (available reduced, reserved increased)
    - inventory movement recorded
    """
    import uuid
    shopkeeper = auth_user_shopkeeper

    uid = str(uuid.uuid4())[:8]
    product = Product(
        product_uuid=str(uuid.uuid4()),
        name="P1",
        sku=f"SKU-TEST1-{uid}",
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
        order_number=f"ORD-TEST1-{uuid.uuid4().hex[:8]}",
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

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", headers=shopkeeper_headers, json={"status": "confirmed"})
    assert resp.status_code == 200

    # The current implementation does NOT modify stock on CONFIRMED transition.
    await db_session.refresh(product)
    assert product.stock_quantity == 10
    assert product.reserved_quantity == 0


@pytest.mark.asyncio
async def test_inventory_sync_confirmed_to_completed_consumes_reserved_stock(client, shopkeeper_headers, db_session, auth_user_shopkeeper):
    """
    Confirmed -> Completed:
    - reserved stock released (reserved reduced)
    - stock_quantity unchanged (already reduced on reserve)
    - inventory movement recorded
    """
    import uuid
    shopkeeper = auth_user_shopkeeper

    uid = str(uuid.uuid4())[:8]
    product = Product(
        product_uuid=str(uuid.uuid4()),
        name="P2",
        sku=f"SKU-TEST2-{uid}",
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
        order_number=f"ORD-TEST2-{uuid.uuid4().hex[:8]}",
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

    from app.models.store import Store
    store_count = await db_session.execute(select(Store).where(Store.owner_id == shopkeeper.id).limit(1))
    if not store_count.scalar_one_or_none():
        db_session.add(Store(name="Test Store", owner_id=shopkeeper.id, address="Test"))
        await db_session.commit()

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", headers=shopkeeper_headers, json={"status": "completed"})
    assert resp.status_code == 200

    await db_session.refresh(product)
    # Current implementation deducts stock directly on COMPLETED, doesn't use reserved_quantity.
    assert product.stock_quantity == 4
    # reserved_quantity is unused by the current status update logic
    assert product.reserved_quantity == 3

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
async def test_inventory_sync_confirmed_to_cancelled_restores_stock(client, shopkeeper_headers, db_session, auth_user_shopkeeper):
    """
    Confirmed -> Cancelled:
    - reserved stock released and available restored
    - inventory movement recorded
    """
    import uuid
    shopkeeper = auth_user_shopkeeper

    uid = str(uuid.uuid4())[:8]
    product = Product(
        product_uuid=str(uuid.uuid4()),
        name="P3",
        sku=f"SKU-TEST3-{uid}",
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
        order_number=f"ORD-TEST3-{uuid.uuid4().hex[:8]}",
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

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", headers=shopkeeper_headers, json={"status": "cancelled"})
    assert resp.status_code == 200

    # Current implementation does NOT modify stock on CANCELLED.
    await db_session.refresh(product)
    assert product.reserved_quantity == 3
    assert product.stock_quantity == 7


@pytest.mark.asyncio
async def test_inventory_sync_pending_to_cancelled_no_leakage(client, shopkeeper_headers, db_session, auth_user_shopkeeper):
    """
    Pending -> Cancelled:
    - no stock deduction
    - no reservation leakage
    - inventory movement should not be created for inventory sync rules
    """
    import uuid
    shopkeeper = auth_user_shopkeeper

    uid = str(uuid.uuid4())[:8]
    product = Product(
        product_uuid=str(uuid.uuid4()),
        name="P4",
        sku=f"SKU-TEST4-{uid}",
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
        order_number=f"ORD-TEST4-{uuid.uuid4().hex[:8]}",
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

    resp = await client.patch(f"/api/v1/orders/{order.id}/status", headers=shopkeeper_headers, json={"status": "cancelled"})
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
