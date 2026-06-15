import socketio
from app.config import settings

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS.split(","),
)

socket_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ, auth):
    print(f"[SocketIO] Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[SocketIO] Client disconnected: {sid}")


@sio.event
async def subscribe(sid, user_id: str):
    sio.enter_room(sid, f"user_{user_id}")
