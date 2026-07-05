"""Pytest fixtures for KhataBox API tests — auto-starts the server."""
import asyncio
import subprocess
import sys
import time
from pathlib import Path
from typing import AsyncGenerator, AsyncIterator

import pytest
import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent
# Ensure `app` package is importable
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole

PORT = 18999
BASE_URL = f"http://localhost:{PORT}"


@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.WindowsSelectorEventLoopPolicy() if sys.platform == "win32" else asyncio.DefaultEventLoopPolicy()
    asyncio.set_event_loop_policy(policy)
    loop = policy.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def server():
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(BACKEND_DIR),
        text=True,
    )
    time.sleep(10)
    import requests
    for _ in range(10):
        try:
            resp = requests.get(f"{BASE_URL}/health", timeout=2)
            if resp.status_code == 200:
                break
        except:
            pass
        time.sleep(1)
    yield
    proc.terminate()
    proc.wait()
    stdout, stderr = proc.communicate(timeout=5)
    if stderr:
        print(f"Server stderr: {stderr}")


@pytest_asyncio.fixture(scope="session")
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30) as c:
        yield c


@pytest_asyncio.fixture(scope="session")
async def admin_token(client: httpx.AsyncClient) -> str:
    r = await client.post("/api/v1/auth/login", json={"email": "admin@khatabox.com", "password": "Admin@123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


@pytest_asyncio.fixture(scope="session")
async def shop_token(client: httpx.AsyncClient) -> str:
    r = await client.post("/api/v1/auth/login", json={"email": "shop@khatabox.com", "password": "Shop@123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


# -- Database fixtures for inventory_sync tests --

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncIterator[AsyncSession]:
    from app.config import settings
    db_url = settings.DATABASE_URL
    if db_url and db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(db_url or "postgresql+asyncpg://khatabox:khatabox@localhost:5432/khatabox")
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def auth_user_shopkeeper(db_session: AsyncSession) -> User:
    import uuid
    uid = str(uuid.uuid4())[:8]
    user = User(
        email=f"test_shopkeeper_{uid}@khatabox.com",
        password_hash=hash_password("test123"),
        role=UserRole.SHOPKEEPER,
        name="Test Shopkeeper",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user
