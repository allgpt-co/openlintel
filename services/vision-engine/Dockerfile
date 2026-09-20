# ---------------------------------------------------------------------------
# Vision Engine — OpenLintel
# Multi-stage build: install shared lib first, then vision-engine
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Stage 1: Install python-shared
# ---------------------------------------------------------------------------
COPY packages/python-shared /tmp/python-shared
RUN pip install --no-cache-dir /tmp/python-shared && \
    rm -rf /tmp/python-shared

# ---------------------------------------------------------------------------
# Install the local digitizer before resolving vision-engine dependencies.
COPY ml/floor-plan-digitizer /tmp/floor-plan-digitizer
RUN pip install --no-cache-dir /tmp/floor-plan-digitizer && rm -rf /tmp/floor-plan-digitizer

# Stage 2: Install vision-engine
# ---------------------------------------------------------------------------
COPY services/vision-engine /tmp/vision-engine
RUN pip install --no-cache-dir /tmp/vision-engine && \
    rm -rf /tmp/vision-engine

# Copy the service source for uvicorn to find the app module
COPY services/vision-engine/main.py /app/main.py
COPY services/vision-engine/src /app/src

RUN useradd --system --uid 10001 --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8010

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
