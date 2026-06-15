"""Pytest fixtures for KhataBox API tests — auto-starts the server."""
import asyncio
import subprocess
import sys
import time
from pathlib import Path
from typing import AsyncGenerator

import httpx
import pytest_asyncio

BACKEND_DIR = Path(__file__).resolve().parent.parent
PORT = 18999
BASE_URL = f"http://localhost:{PORT}"


@pytest_asyncio.fixture(scope="session")
async def event_loop():
    """
    Provide a session-scoped event loop for the test suite.

    Note: We intentionally do NOT close the loop here because httpx/anyio
    transport cleanup during fixture teardown can attempt to interact with
    the loop; closing early leads to `RuntimeError: Event loop is closed`.
    """
    loop = asyncio.new_event_loop()
    yield loop
    await loop.shutdown_asyncgens()
    # Intentionally no loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
def server():
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(BACKEND_DIR),
        text=True,
    )
    time.sleep(10)
    # Check if server is ready
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


@pytest_asyncio.fixture(scope="session")
async def headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}
