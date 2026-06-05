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
# These are the BASE repo's dirs (read-only template). Per-user data lives in
# isolated workspaces under WORKSPACES_ROOT (see below).
RUN mkdir -p \
    data \
    config \
    output \
    reports \
    jds \
    interview-prep \
    batch/tracker-additions

# ── Environment ───────────────────────────────────────────────────────────────
# /app          = base repo (system layer: scripts, modes, templates, node_modules)
# /data/ws/{id} = per-user isolated workspace (persistent). Mount a Railway
#                 volume at /data so user data (cv, tracker, reports, PDFs)
#                 survives redeploys and never mixes between accounts.
ENV CAREER_OPS_ROOT=/app \
    WORKSPACES_ROOT=/data/ws \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Railway injects $PORT at runtime; fall back to 8000 for local use
ENV PORT=8000

WORKDIR /app/web-wrapper/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
