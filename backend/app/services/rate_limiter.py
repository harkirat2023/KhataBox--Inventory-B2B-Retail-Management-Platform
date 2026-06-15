import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.config import settings

try:
    import redis.asyncio as aioredis

    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
    _redis_available = True
except Exception:
    _redis = None
    _redis_available = False

_memory: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 100
WINDOW = 60


async def _check_redis(key: str) -> bool:
    now = int(time.time())
    window_key = f"ratelimit:{key}:{now // WINDOW}"
    count = await _redis.get(window_key)
    if count is None:
        await _redis.setex(window_key, WINDOW, 1)
        return True
    if int(count) >= RATE_LIMIT:
        return False
    await _redis.incr(window_key)
    return True


def _check_memory(key: str) -> bool:
    now = time.time()
    window_start = now - WINDOW
    timestamps = _memory[key]
    timestamps[:] = [t for t in timestamps if t > window_start]
    if len(timestamps) >= RATE_LIMIT:
        return False
    timestamps.append(now)
    return True


async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith(("/ws", "/health", "/docs", "/redoc", "/openapi.json")):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"

    if _redis_available:
        try:
            allowed = await _check_redis(client_ip)
        except Exception:
            allowed = _check_memory(client_ip)
    else:
        allowed = _check_memory(client_ip)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT} requests per {WINDOW} seconds.",
        )

    return await call_next(request)
