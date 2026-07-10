import logging
import time

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError, IntegrityError
import posthog

logger = logging.getLogger(__name__)

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
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/ws", socket_app)

@app.get("/")
@app.get("/health")
@app.get("/api/v1/health")
async def health():
    # Render / Railway healthchecks ping / and /health
    return {"status": "ok", "service": "KhataBox API"}

app.include_router(v1_router)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.exception("Unhandled IntegrityError on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=409, content={"detail": "Database integrity conflict"})


@app.exception_handler(DataError)
async def data_error_handler(request: Request, exc: DataError):
    logger.exception("Unhandled DataError on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=400, content={"detail": "Invalid data in request"})


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


