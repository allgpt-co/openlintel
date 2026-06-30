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
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from openlintel_shared.config import get_settings
from openlintel_shared.storage import ensure_bucket

from src.routers import assets, upload

logger = logging.getLogger("media-service")


# ---------------------------------------------------------------------------
# Lifespan — ensure S3 bucket exists on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler.

    On startup: ensure the configured S3 bucket exists (create it if not).
    """
    settings = get_settings()
    bucket = settings.AWS_S3_BUCKET

    try:
        ensure_bucket(bucket, settings=settings)
        logger.info("S3 bucket '%s' is ready.", bucket)
    except Exception:
        logger.exception("Failed to initialize S3 bucket '%s'.", bucket)
        raise

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

# ── CORS middleware ────────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
