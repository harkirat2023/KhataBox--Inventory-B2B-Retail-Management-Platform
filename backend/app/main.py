import time

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import posthog

from app.api.v1 import router as v1_router
from app.config import settings
from app.services.rate_limiter import rate_limit_middleware
from app.services.socketio_manager import socket_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    from app.core.database import engine
    await engine.dispose()
    from app.services.cache import close as close_redis
    await close_redis()


sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=0.2,
    send_default_pii=False,
    environment="production" if settings.SENTRY_DSN else "development",
)

if settings.SENTRY_DSN:
    sentry_sdk.set_tag("service", "khatabox-api")

posthog.project_api_key = settings.POSTHOG_API_KEY
posthog.host = settings.POSTHOG_HOST

app = FastAPI(title="KhataBox API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/ws", socket_app)
app.include_router(v1_router)


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    return await rate_limit_middleware(request, call_next)


@app.middleware("http")
async def add_performance_headers(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = round((time.time() - start) * 1000)
    response.headers["X-Response-Time"] = f"{elapsed}ms"
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "service": "KhataBox API"}
