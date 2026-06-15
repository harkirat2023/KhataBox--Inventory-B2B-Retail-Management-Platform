"""Integration tests for KhataBox API v1 endpoints."""
import pytest


class TestAuth:
    async def test_health(self, client):
        r = await client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    async def test_login_admin(self, admin_token):
        assert len(admin_token) > 20

    async def test_me(self, client, headers):
        r = await client.get("/api/v1/auth/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@khatabox.com"

    async def test_login_invalid(self, client):
        r = await client.post("/api/v1/auth/login", json={"email": "x@x.com", "password": "wrong"})
        assert r.status_code == 401


class TestProducts:
    async def test_list_products(self, client, headers):
        r = await client.get("/api/v1/products/", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 50

    async def test_get_product(self, client, headers):
        r = await client.get("/api/v1/products/2", headers=headers)
        assert r.status_code == 200
        assert r.json()["id"] == 2

    async def test_create_product(self, client, headers):
        r = await client.post("/api/v1/products/", headers=headers, json={
            "name": "Test Widget",
            "sku": "TST-999",
            "category": "electronics",
            "cost_price": 50,
            "selling_price": 80,
            "stock_quantity": 100,
        })
        assert r.status_code == 201
        assert r.json()["name"] == "Test Widget"

    async def test_update_product(self, client, headers):
        r = await client.put("/api/v1/products/2", headers=headers, json={"name": "Updated Product"})
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Product"

    async def test_delete_product(self, client, headers):
        r = await client.post("/api/v1/products/", headers=headers, json={
            "name": "To Delete", "sku": "DEL-001", "category": "groceries", "cost_price": 10, "selling_price": 15
        })
        pid = r.json()["id"]
        r = await client.delete(f"/api/v1/products/{pid}", headers=headers)
        assert r.status_code == 200
        assert r.json()["is_active"] is False


class TestOrders:
    async def test_list_orders(self, client, headers):
        r = await client.get("/api/v1/orders/", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 30

    async def test_get_order(self, client, headers):
        r = await client.get("/api/v1/orders/1", headers=headers)
        assert r.status_code == 200
        assert "items" in r.json()

    async def test_create_order(self, client, headers):
        r = await client.post("/api/v1/orders/", headers=headers, json={
            "items": [{"product_id": 3, "product_name": "LED Bulb", "quantity": 2, "unit_price": 150}],
            "payment_method": "cash",
            "discount": 0,
        })
        assert r.status_code == 201

    async def test_update_order_status(self, client, headers):
        r = await client.patch("/api/v1/orders/1/status", headers=headers, json={"status": "confirmed"})
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"


class TestSuppliers:
    async def test_list_suppliers(self, client, headers):
        r = await client.get("/api/v1/suppliers/", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 8

    async def test_create_supplier(self, client, headers):
        r = await client.post("/api/v1/suppliers/", headers=headers, json={
            "name": "New Supplier", "contact_person": "Test", "email": "new@supplier.com"
        })
        assert r.status_code == 201


class TestCustomers:
    async def test_list_customers(self, client, headers):
        r = await client.get("/api/v1/customers/", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    async def test_create_customer(self, client, headers):
        r = await client.post("/api/v1/customers/", headers=headers, json={
            "company_name": "New Corp", "credit_limit": 10000
        })
        assert r.status_code == 201


class TestDashboard:
    async def test_dashboard_stats(self, client, headers):
        r = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total_products"] > 0
        assert data["total_inventory_value"] > 0


class TestInventory:
    async def test_list_movements(self, client, headers):
        r = await client.get("/api/v1/inventory/movements", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 30

    async def test_movements_by_product(self, client, headers):
        r = await client.get("/api/v1/inventory/movements/2", headers=headers)
        assert r.status_code == 200


class TestPurchaseOrders:
    async def test_list_pos(self, client, headers):
        r = await client.get("/api/v1/purchase-orders/", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 10


class TestForecasting:
    async def test_forecast(self, client, headers):
        r = await client.get("/api/v1/forecasting/demand/2", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "predicted_demand" in data
        assert "confidence_score" in data


class TestNotifications:
    async def test_list_notifications(self, client, headers):
        r = await client.get("/api/v1/notifications/", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 6


class TestExpiry:
    async def test_expiry_upcoming(self, client, headers):
        r = await client.get("/api/v1/expiry/upcoming", headers=headers)
        assert r.status_code == 200


class TestAudit:
    async def test_audit_logs(self, client, headers):
        r = await client.get("/api/v1/audit/logs", headers=headers)
        assert r.status_code == 200


class TestInvoice:
    async def test_generate_invoice(self, client, headers):
        r = await client.post("/api/v1/invoices/generate/1", headers=headers)
        assert r.status_code == 200


class TestQRCode:
    async def test_generate_qr(self, client, headers):
        r = await client.get("/api/v1/qrcodes/product/2", headers=headers)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"

    async def test_batch_qr_labels(self, client, headers):
        r = await client.get("/api/v1/qrcodes/batch?ids=2,3,4", headers=headers)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"


class TestUserManagement:
    async def test_list_users(self, client, headers):
        r = await client.get("/api/v1/auth/users", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    async def test_list_users_search(self, client, headers):
        r = await client.get("/api/v1/auth/users?search=admin", headers=headers)
        assert r.status_code == 200


class TestCatalog:
    async def test_catalog_products(self, client, headers):
        r = await client.get("/api/v1/catalog/products", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    async def test_catalog_search(self, client, headers):
        r = await client.get("/api/v1/catalog/products?search=LED", headers=headers)
        assert r.status_code == 200


class TestBulkOrder:
    async def test_bulk_order_no_items(self, client, headers):
        r = await client.post("/api/v1/orders/bulk", headers=headers, json={"items": []})
        assert r.status_code == 400

    async def test_bulk_order_invalid_customer(self, client, headers):
        r = await client.post("/api/v1/orders/bulk", headers=headers, json={
            "items": [{"product_id": 3, "product_name": "LED Bulb", "quantity": 2, "unit_price": 150}],
        })
        assert r.status_code == 404


class TestCustomerReports:
    async def test_top_customers(self, client, headers):
        r = await client.get("/api/v1/reports/customers/top?limit=5", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    async def test_repeat_purchases(self, client, headers):
        r = await client.get("/api/v1/reports/customers/repeat-purchases?limit=5", headers=headers)
        assert r.status_code == 200

    async def test_clv(self, client, headers):
        r = await client.get("/api/v1/reports/customers/clv", headers=headers)
        assert r.status_code == 200


class TestDataBackup:
    async def test_backup_export(self, client, headers):
        r = await client.get("/api/v1/data/backup/export", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "version" in data
        assert "data" in data


class TestStores:
    async def test_list_stores(self, client, headers):
        r = await client.get("/api/v1/stores/", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
