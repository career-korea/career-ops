# Local Development Setup Guide (Redis + Hono + Celery)

This guide helps you set up and run the local development environment for `career-ops`. By following these steps, you will run a local Redis container, configure the TypeScript backend (Hono), and run the Python worker (Celery) inside WSL2.

---

## 1. Prerequisites

Before starting, ensure you have the following installed and running:
* **Docker Desktop** (with WSL2 integration enabled in Settings -> Resources -> WSL Integration)
* **Node.js** (v20.6.0 or higher for native `.env` file support)
* **pnpm** (installed globally: `npm install -g pnpm`)
* **Python 3.11** and **Poetry** installed inside your WSL2 Ubuntu environment.

---

## 2. Step-by-Step Setup

### Step A: Pull the Code and Checkout the Branch
Checkout the working branch containing the integration changes:
```bash
# Fetch latest changes
git fetch origin

# Switch to the feature branch
git checkout feature/task-1.2.2
```

### Step B: Start Local Redis (Docker Compose)
From the root of the project (where `docker-compose.yml` is located), spin up the Redis and RedisInsight containers:
```bash
# Spin up containers in the background
docker compose up -d

# Verify containers are running (ports 6379 and 8001 should be bound)
docker compose ps

# Test Redis connection (should output 'PONG')
docker exec career-ops-redis redis-cli ping
```
* **Redis GUI**: You can access **RedisInsight** (Web GUI) by visiting `http://localhost:8001` in your browser.

### Step C: Configure Local Environment Variables (`.env`)

You need to copy the template environment files and fill in your details (Supabase credentials).

1. **Hono Backend Configuration**:
   * Navigate to `career-ops-workspace/apps/backend/`
   * Copy the template:
     ```bash
     cd career-ops-workspace/apps/backend
     cp .env.example .env
     ```
   * Fill in the Supabase details in `.env` (obtain your developer credentials from your Supabase console):
     ```bash
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
     DATABASE_URL=postgresql://postgres.your-id:your-db-password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
     
     # Local Redis Broker configuration (already defined)
     REDIS_URL=redis://127.0.0.1:6379/0
     ```

2. **Celery Worker Configuration**:
   * Navigate to `career-ops-workspace/apps/worker/`
   * Copy the template:
     ```bash
     cd ../worker
     cp .env.example .env
     ```
   * The variables are already set up to point to the local Redis container:
     ```bash
     CELERY_ENV=development
     CELERY_CONCURRENCY=2
     CELERY_BROKER_URL=redis://127.0.0.1:6379/0
     CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
     ```

### Step D: Install Dependencies

1. **Monorepo Node.js Dependencies (Windows or WSL2)**:
   Navigate to the monorepo root (`career-ops-workspace/`) and run:
   ```bash
   cd ../../
   pnpm install
   ```

2. **Python Worker Dependencies (Inside WSL2)**:
   Open your WSL2 Ubuntu terminal, navigate to the worker directory, and install the poetry packages:
   ```bash
   cd /mnt/c/Users/user/OneDrive/바탕 화면/enacProject/career-ops/career-ops-workspace/apps/worker
   poetry install
   ```

---

## 3. Running and Verifying the Environment

Once setup is completed, open three separate terminal tabs to run and test the 비동기 E2E flow:

### Tab 1: Start Celery Worker (Inside WSL2)
Run the Celery worker process:
```bash
cd career-ops-workspace/apps/worker
poetry run celery -A src.celery_app.app worker --loglevel=info
```
* *Verify*: You should see `Connected to redis://127.0.0.1:6379/0` and `celery@... ready.` in the startup logs.

### Tab 2: Start Hono Backend Dev Server
Start the backend API server:
```bash
cd career-ops-workspace
pnpm --filter backend dev
```
* *Verify*: The console will output `Backend server is running on http://localhost:8000` and `Connecting to Celery Broker at: redis://127.0.0.1:6379/0`.

### Tab 3: Trigger Test Task (curl)
Send an HTTP POST request to backend API to trigger a background Celery task:
```bash
curl.exe -i -X POST http://localhost:8000/api/tasks/test \
  -H "Content-Type: application/json" \
  -d '{"x": 105, "y": 202}'
```

* **Expected Outcome**:
  1. Hono API immediately responds with `202 Accepted` and a unique `taskId`.
  2. The Celery worker console (Tab 1) instantly receives the task, executes the addition, and prints:
     ```txt
     Received request to compute sum of: 105 and 202
     Calculation finished. Result: 307
     Task src.tasks.test_tasks.add_numbers[...] succeeded ...: 307
     ```
