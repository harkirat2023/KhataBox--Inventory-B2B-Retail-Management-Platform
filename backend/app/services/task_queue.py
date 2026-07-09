import json
from datetime import datetime, timezone

from app.config import settings

try:
    import redis.asyncio as aioredis

    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    _available = True
except Exception:
    _redis = None
    _available = False


async def enqueue(queue: str, task_type: str, payload: dict) -> bool:
    if not _available:
        return False
    task = {
        "type": task_type,
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _redis.lpush(f"queue:{queue}", json.dumps(task))
    return True


async def dequeue(queue: str) -> dict | None:
    if not _available:
        return None
    data = await _redis.rpop(f"queue:{queue}")
    if data is None:
        return None
    return json.loads(data)


async def queue_length(queue: str) -> int:
    if not _available:
        return 0
    return await _redis.llen(f"queue:{queue}")
