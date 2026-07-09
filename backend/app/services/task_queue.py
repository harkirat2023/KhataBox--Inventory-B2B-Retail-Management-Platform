import json
from datetime import datetime, timezone

from app.config import settings

try:
    import redis.asyncio as aioredis

    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
    _available = True
except Exception:
    _redis = None
    _available = False


async def enqueue(queue: str, task_type: str, payload: dict) -> bool:
    if not _available:
        return False
    try:
        task = {
            "type": task_type,
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await _redis.lpush(f"queue:{queue}", json.dumps(task))
        return True
    except Exception:
        return False


async def dequeue(queue: str) -> dict | None:
    if not _available:
        return None
    try:
        data = await _redis.rpop(f"queue:{queue}")
        if data is None:
            return None
        return json.loads(data)
    except Exception:
        return None


async def queue_length(queue: str) -> int:
    if not _available:
        return 0
    try:
        return await _redis.llen(f"queue:{queue}")
    except Exception:
        return 0
