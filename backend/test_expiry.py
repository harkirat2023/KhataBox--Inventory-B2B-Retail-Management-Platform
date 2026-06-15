"""Test expiry endpoint by starting server inline."""
import asyncio
import httpx


async def test():
    async with httpx.AsyncClient(base_url="http://localhost:8001", timeout=10) as client:
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@khatabox.com", "password": "Admin@123"},
        )
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("=== Expiry endpoint ===")
        r = await client.get("/api/v1/expiry/upcoming", headers=headers)
        data = r.json()
        print(f"Message: {data['message']}")
        for period in ["30_days", "60_days", "90_days"]:
            items = data["alerts"][period]
            print(f"  {period}: {len(items)} items")
            for item in items[:3]:
                print(f"    {item['name']} - expires {item['expiry_date']} ({item['days_remaining']} days)")

        print("\n=== Create product with expiry ===")
        r = await client.post(
            "/api/v1/products/",
            json={
                "name": "Test Medicine",
                "sku": "TEST-MED-001",
                "category": "medicines",
                "brand": "TestBrand",
                "cost_price": 50.0,
                "selling_price": 80.0,
                "stock_quantity": 100,
                "reorder_threshold": 10,
                "batch_number": "BATCH-TEST-001",
                "mfg_date": "2026-01-01",
                "expiry_date": "2026-07-01",
            },
            headers=headers,
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 201:
            p = r.json()
            print(f"Created: {p['name']} (batch: {p['batch_number']}, mfg: {p['mfg_date']}, exp: {p['expiry_date']})")
        else:
            print(f"Error: {r.json()}")


asyncio.run(test())
