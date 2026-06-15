"""Investigate the 6 failing tests."""
import urllib.request, json

BASE = "http://localhost:8002"

def req(method, path, data=None, token=None, full=False):
    url = f"{BASE}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            if full:
                return resp.status, resp.read().decode()
            return resp.status, json.loads(resp.read().decode())
    except urllib.request.HTTPError as e:
        return e.code, e.read().decode()[:500]
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}"

# 1. Get admin token first
s, d = req("POST", "/api/v1/auth/login", {"email": "admin@khatabox.com", "password": "Admin@123"})
admin_token = d.get('access_token') if s == 200 else None
print(f"Admin token: {'OK' if admin_token else 'FAIL'}")

if admin_token:
    # 2. Check what customer emails exist
    print("\n--- Customer emails (first 5) ---")
    s, d = req("GET", "/api/v1/customers/?limit=5", token=admin_token)
    if s == 200:
        for c in (d if isinstance(d, list) else d.get('items', []))[:5]:
            print(f"  {c.get('email')}")

    # 3. Check product IDs
    print("\n--- Product IDs (first 5) ---")
    s, d = req("GET", "/api/v1/products?limit=5", token=admin_token)
    if s == 200:
        items = d if isinstance(d, list) else d.get('items', [])
        for p in items[:5]:
            print(f"  ID {p.get('id')}: {p.get('name')}")
    
    # 4. Check product ID 1 specifically
    print("\n--- Product ID=1 ---")
    s, d = req("GET", "/api/v1/products/1", token=admin_token)
    print(f"  Status: {s}")
    if s != 200:
        print(f"  Error: {d}")
    
    # 5. Check catalog endpoint
    print("\n--- Catalog ---")
    s, d = req("GET", "/api/v1/catalog/products", token=admin_token)
    print(f"  Status: {s}")

    # 6. Check QR endpoint
    print("\n--- QR Code ---")
    s, d = req("GET", "/api/v1/qrcodes/product/1", token=admin_token)
    print(f"  Status: {s}")

    # 7. Check create order endpoint
    print("\n--- Create Order (check redirect) ---")
    import http.client
    conn = http.client.HTTPConnection("localhost", 8002, timeout=10)
    conn.request("POST", "/api/v1/orders", 
                 json.dumps({"customer_id": None, "payment_method": "cash", "items": [{"product_id": 2, "quantity": 1}]}),
                 {"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    resp = conn.getresponse()
    print(f"  Status: {resp.status} {resp.reason}")
    print(f"  Location: {resp.getheader('Location', 'none')}")
    body = resp.read().decode()[:300]
    print(f"  Body: {body}")
    conn.close()

    # 8. Check if customer user login works - use a different customer
    print("\n--- Test customer user login ---")
    # Get a customer user email from the users table
    import asyncio
    from app.core.database import async_session
    from app.models.user import User, UserRole
    from sqlalchemy import select
    
    async def get_cust_email():
        async with async_session() as session:
            r = await session.execute(
                select(User).where(User.role == UserRole.CUSTOMER).limit(3)
            )
            users = r.scalars().all()
            for u in users:
                print(f"  Customer user: {u.email}")
            return users[0].email if users else None
    
    cust_email = asyncio.run(get_cust_email())
    if cust_email:
        print(f"\n  Trying login with: {cust_email}")
        s, d = req("POST", "/api/v1/auth/login", {"email": cust_email, "password": "customer123"})
        print(f"  Login status: {s}")
