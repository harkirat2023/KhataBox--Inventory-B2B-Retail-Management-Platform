import logging

import socketio
from app.config import settings

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS.split(","),
)

socket_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ, auth):
    logger.info("SocketIO client connected: %s", sid)


@sio.event
async def disconnect(sid):
    logger.info("SocketIO client disconnected: %s", sid)


@sio.event
async def subscribe(sid, user_id: str):
    sio.enter_room(sid, f"user_{user_id}")


async def emit_order_created(user_id: int, data: dict):
    await sio.emit("order_created", data, room=f"user_{user_id}")


async def emit_order_status_changed(user_id: int, order_id: int, status: str):
    await sio.emit("order_status_changed", {"order_id": order_id, "status": status}, room=f"user_{user_id}")


async def emit_inventory_update(user_id: int, data: dict):
    await sio.emit("inventory_update", data, room=f"user_{user_id}")


async def emit_low_stock_alert(user_id: int, products: list):
    await sio.emit("low_stock_alert", {"products": products}, room=f"user_{user_id}")
