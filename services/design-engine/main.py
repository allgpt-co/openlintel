"""
Design Engine — AI design generation service for OpenLintel.

Uses LangGraph + LiteLLM for VLM-powered room design generation.
Users bring their own API keys (stored encrypted, decrypted at call time).
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from pydantic import BaseModel

from openlintel_shared.config import get_settings
from openlintel_shared.db import dispose_engine
from openlintel_shared.middleware import configure_logging, setup_middleware
from openlintel_shared.redis_client import close_redis

from src.routers import designs

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler.

    Startup:
        - Configure structured logging.
        - Use the S3 bucket provisioned and verified by the deployment operator.

    Shutdown:
        - Dispose of the async DB engine.
        - Close the Redis connection pool.
    """
    settings = get_settings()
    configure_logging(settings)

    logger.info(
        "design_engine_startup",
        service="design-engine",
        log_level=settings.LOG_LEVEL,
    )

    yield  # ── App is running ──

    # Shutdown
    logger.info("design_engine_shutdown")
    await dispose_engine()
    await close_redis()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpenLintel Design Engine",
    description=(
        "VLM-powered room design generation — users bring their own API keys. "
        "Uses LangGraph for agent orchestration and LiteLLM for multi-provider VLM access."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# ── Middleware ─────────────────────────────────────────────────────────────
setup_middleware(app)


# ── Health check ──────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Liveness probe — returns 200 if the service is running."""
    return HealthResponse(status="ok", service="design-engine")


# ── Include routers ───────────────────────────────────────────────────────
app.include_router(designs.router)
