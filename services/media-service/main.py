"""
Media Service — FastAPI application for OpenLintel.

Handles file upload validation, image optimization, thumbnail generation,
and metadata extraction.  Stores assets in Amazon S3.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from openlintel_shared.middleware import setup_middleware
from pydantic import BaseModel

from openlintel_shared.config import get_settings

from src.routers import assets, upload

logger = logging.getLogger("media-service")


# ---------------------------------------------------------------------------
# Lifespan — ensure S3 bucket exists on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load settings; storage is provisioned by the deployment operator.

    Do not create AWS resources during application startup. Upload/download calls
    report storage failures; deployment smoke tests must verify real S3 access.
    """
    get_settings()

    yield  # App is running

    # Shutdown: nothing to clean up for now
    logger.info("Media service shutting down.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpenLintel Media Service",
    description=(
        "File upload validation, image optimization, thumbnail generation, "
        "and metadata extraction for the OpenLintel interior design platform."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)


# ── Health check ──────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Liveness probe — returns 200 if the service is running."""
    return HealthResponse(status="ok", service="media-service")


# ── Include routers ───────────────────────────────────────────────────────
app.include_router(upload.router)
app.include_router(assets.router)
