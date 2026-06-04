# career-ops backend — Python 3.12 + Node.js 20 + Playwright Chromium
# Deploy target: Railway (backend) + Vercel (frontend)

FROM python:3.12-slim

# ── System packages + Node.js 20 ──────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Python deps (layer cached until requirements.txt changes) ─────────────────
COPY web-wrapper/backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# ── Application source ────────────────────────────────────────────────────────
# node_modules and .venv are excluded via .dockerignore
WORKDIR /app
COPY . /app/

# ── Node.js deps + Playwright Chromium ───────────────────────────────────────
# Must run AFTER COPY so npm reads package.json from the repo root
RUN npm install --omit=dev
RUN npx playwright install chromium --with-deps

# ── Runtime dirs (gitignored, recreated fresh each build) ────────────────────
# Mount Railway volumes at /app/data, /app/config, /app/reports, /app/output
# for persistence across redeploys.
RUN mkdir -p \
    data \
    config \
    output \
    reports \
    jds \
    interview-prep \
    batch/tracker-additions

# ── Environment ───────────────────────────────────────────────────────────────
ENV CAREER_OPS_ROOT=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Railway injects $PORT at runtime; fall back to 8000 for local use
ENV PORT=8000

WORKDIR /app/web-wrapper/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
