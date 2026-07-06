import uuid

import pytest
import pytest_asyncio


def _email(role: str) -> str:
    return f"phase2_{role}_{str(uuid.uuid4()).replace('-', '')[:10]}@khatabox.com"


async def _register_and_get_tokens(client, *, role: str, email: str, password: str = "Phase2@123") -> str:
    # backend/app/api/v1/auth.py: /api/v1/auth/register
    payload = {
        "email": email,
        "password": password,
        "name": "Phase2 User",
        "role": role,
    }

    # shopkeeper registration creates a store in register endpoint if store_name present.
    if role == "shopkeeper":
        payload.update(
            {
                "store_name": f"Phase2 Store {email.split('@')[0][:6]}",
                "store_type": "retail",
                "address": "Phase2 Address",
                "city": "Test City",
                "state": "Test State",
                "pin_code": "110001",
                "gst_number": "GSTTEST0000",
                "monthly_revenue": 100000,
                "business_description": "Phase2 shop",
                "phone": "9999999999",
            }
        )

    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"

    data = r.json()
    assert "access_token" in data
    return data["access_token"]


async def _login(client, *, email: str, password: str) -> str:
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


async def _create_product(client, token: str, *, name: str, sku: str, store_id: int | None = None, stock: int = 50):
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": name,
        "sku": sku,
        "category": "electronics",
        "brand": "test-brand",
        "cost_price": 10,
        "selling_price": 15,
        "stock_quantity": stock,
        "reorder_threshold": 5,
    }

    if store_id is not None:
        payload["store_id"] = store_id

    r = await client.post("/api/v1/products/", headers=headers, json=payload)
    assert r.status_code == 201, f"create_product failed: {r.status_code} {r.text}"
    return r.json()


async def _ensure_store_public_id(client, token: str) -> int | None:
    headers = {"Authorization": f"Bearer {token}"}
    r = await client.get("/api/v1/stores/", headers=headers)
    assert r.status_code == 200, f"stores list failed: {r.status_code} {r.text}"
    items = r.json()
    if not items:
        return None
    return items[0]["id"]


@pytest.mark.asyncio
async def test_phase2_customer_shopkeeper_admin_e2e(client):
    password = "Phase2@123"

    # ===== Register: customer + shopkeeper + admin via existing seeded accounts =====
    admin_login = await _login(client, email="admin@khatabox.com", password="Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_login}"}

    customer_email = _email("customer")
    customer_token = await _register_and_get_tokens(client, role="customer", email=customer_email, password=password)
    customer_headers = {"Authorization": f"Bearer {customer_token}"}

    shopkeeper_email = _email("shopkeeper")
    shopkeeper_token = await _register_and_get_tokens(client, role="shopkeeper", email=shopkeeper_email, password=password)
    shopkeeper_headers = {"Authorization": f"Bearer {shopkeeper_token}"}

    # ===== Shopkeeper: create product =====
    store_id = await _ensure_store_public_id(client, shopkeeper_token)
    assert store_id is not None, "Expected shopkeeper registration to create a store"

    product = await _create_product(
        client,
        shopkeeper_token,
        name="Phase2 Widget",
        sku=f"PH2-{str(uuid.uuid4()).replace('-', '')[:8]}",
        store_id=store_id,
        stock=10,
    )
    product_id = product["id"]

    # ===== Customer: browse catalog (public stores/products) =====
    r = await client.get("/api/v1/catalog/products", headers=customer_headers)
    assert r.status_code == 200, f"catalog list failed: {r.status_code} {r.text}"
    assert isinstance(r.json(), list)

    # ===== Customer: place B2C order =====
    # B2C expects products by integer id.
    validate_payload = {
        "store_id": store_id,
        "items": [{"product_id": product_id, "quantity": 2, "unit_price": product["selling_price"]}],
        "payment_method": "cash",
        "discount": 0,
        "gst": 18,
        "notes": "Phase2 order",
    }

    rv = await client.post("/api/v1/b2c/orders/validate", headers=customer_headers, json=validate_payload)
    assert rv.status_code == 200, f"b2c validate failed: {rv.status_code} {rv.text}"

    rp = await client.post("/api/v1/b2c/orders", headers=customer_headers, json=validate_payload)
    assert rp.status_code in (200, 201), f"b2c place order failed: {rp.status_code} {rp.text}"
    b2c_order = rp.json()
    b2c_order_id = b2c_order["id"]
    assert b2c_order["status"] in ("pending", "confirmed", "completed", "processing", "received", "completed"), b2c_order

    # ===== Customer: my orders includes pending/active =====
    my_orders = await client.get("/api/v1/b2c/orders", headers=customer_headers)
    assert my_orders.status_code == 200
    my_orders_json = my_orders.json()
    assert isinstance(my_orders_json, list)
    assert any(o["id"] == b2c_order_id for o in my_orders_json)

    # ===== Shopkeeper: approve pending B2C order =====
    ra = await client.post(f"/api/v1/b2c/shopkeeper/orders/{b2c_order_id}/approve", headers=shopkeeper_headers)
    assert ra.status_code == 200, f"approve failed: {ra.status_code} {ra.text}"
    assert ra.json()["status"] in ("confirmed", "processing", "completed", "pending")

    # ===== Shopkeeper: confirm (completes, deducts stock, generates receipt) =====
    rc = await client.post(f"/api/v1/b2c/shopkeeper/orders/{b2c_order_id}/confirm", headers=shopkeeper_headers)
    assert rc.status_code == 200, f"confirm failed: {rc.status_code} {rc.text}"
    assert rc.json()["status"] in ("completed", "received"), rc.json()

    # ===== Customer: invoice generation should be available after completion =====
    inv = await client.post(f"/api/v1/invoices/generate/{b2c_order_id}", headers=customer_headers)
    assert inv.status_code == 200, f"invoice generate failed: {inv.status_code} {inv.text}"
    assert inv.headers.get("content-disposition", "").startswith("attachment")

    # ===== Customer: view my receipts/orders =====
    # For B2C, customer receipts UI likely uses /receipts/my.
    # receipts API is protected by role customer.
    r_hist = await client.get("/api/v1/receipts/my", headers=customer_headers)
    assert r_hist.status_code == 200, f"receipts/my failed: {r_hist.status_code} {r_hist.text}"
    receipts = r_hist.json()
    assert isinstance(receipts, list)
    assert len(receipts) >= 1

    # ===== Shopkeeper: order-history should include completed order =====
    sh_hist = await client.get("/api/v1/b2c/shopkeeper/order-history", headers=shopkeeper_headers)
    assert sh_hist.status_code == 200, f"shopkeeper order-history failed: {sh_hist.status_code} {sh_hist.text}"
    history = sh_hist.json()
    assert isinstance(history, list)
    assert any(o["id"] == b2c_order_id for o in history)

    # ===== Admin: platform analytics + monitor endpoints exist and should not error =====
    ra_stats = await client.get("/api/v1/dashboard/stats", headers=admin_headers)
    assert ra_stats.status_code == 200, f"admin dashboard stats failed: {ra_stats.status_code} {ra_stats.text}"

    # Monitor/system endpoints: use audit logs as a proxy in this Phase.
    ra_audit = await client.get("/api/v1/audit/logs", headers=admin_headers)
    assert ra_audit.status_code == 200, f"admin audit logs failed: {ra_audit.status_code} {ra_audit.text}"

    # ===== Sync check: receipt download should succeed for shopkeeper =====
    # download receipt PDF requires admin/shopkeeper auth.
    # receipts/my returns list with receipt_number/id.
    receipt_id = receipts[0]["id"]
    dl = await client.get(f"/api/v1/receipts/{receipt_id}/pdf", headers=shopkeeper_headers)
    assert dl.status_code == 200
    assert dl.headers.get("content-type", "").startswith("application/pdf")

