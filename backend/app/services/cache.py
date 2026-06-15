import json
from typing import Any

from app.config import settings

try:
    import redis.asyncio as aioredis

    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
except Exception:
    _redis = None

_available: bool | None = None  # None = unchecked, True/False = verified


async def is_available() -> bool:
    global _available
    if _available is False:
        return False
    if _redis is None:
        _available = False
        return False
    if _available is True:
        return True
    # First call: verify connectivity
    try:
        await _redis.ping()
        _available = True
        return True
    except Exception:
        _available = False
        return False


async def get(key: str) -> Any | None:
    if not _available:
        return None
    try:
        val = await _redis.get(key)
        if val is None:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return val
    except Exception:
        return None


async def set(key: str, value: Any, ttl: int = 300) -> None:
    if not _available:
        return
    try:
        val = json.dumps(value) if not isinstance(value, str) else value
        await _redis.set(key, val, ex=ttl)
    except Exception:
        pass


async def delete(key: str) -> None:
    if not _available:
        return
    try:
        await _redis.delete(key)
    except Exception:
        pass


async def invalidate_pattern(pattern: str) -> None:
    if not _available:
        return
    try:
        keys = await _redis.keys(pattern)
        if keys:
            await _redis.delete(*keys)
    except Exception:
        pass
