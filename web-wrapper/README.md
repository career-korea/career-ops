# career-ops FastAPI + TypeScript Web Service

This is a web wrapper for an existing `career-ops` checkout. It does **not** rewrite the original project. FastAPI calls the original `.mjs` scripts through `node`, while the TypeScript frontend gives you a browser UI.

## Why this structure

```txt
frontend/ React + TypeScript UI
    ↓ HTTP
backend/ FastAPI API wrapper
    ↓ subprocess
CAREER_OPS_ROOT/ original career-ops repo
    ├─ scan.mjs
    ├─ gemini-eval.mjs
    ├─ generate-pdf.mjs
    ├─ analyze-patterns.mjs
    ├─ data/applications.md
    └─ data/pipeline.md
```

So the original CLI still works, but now you also get web endpoints.

## Windows local setup, no Docker

### 1. Prepare original career-ops

Put the original repo somewhere, for example:

```powershell
D:\career-ops
```

Inside that original repo, install Node dependencies once:

```powershell
cd D:\career-ops
npm install
```

Make sure your original repo has the files it expects:

```txt
cv.md
config/profile.yml
portals.yml
.env with GEMINI_API_KEY if using gemini-eval.mjs
```

### 2. Configure this wrapper

In this project:

```powershell
cp .env.example .env
```

Edit `.env`:

```env
CAREER_OPS_ROOT=D:\career-ops
BACKEND_CORS_ORIGINS=http://localhost:5173
```

### 3. Run backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open docs:

```txt
http://localhost:8000/docs
```

### 4. Run frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Main API endpoints

```txt
GET  /api/health
GET  /api/modes
GET  /api/tracker
GET  /api/pipeline
POST /api/scan
POST /api/evaluate
POST /api/pdf
POST /api/patterns
POST /api/script
```

## Notes

- `Scan Portals` reads `portals.yml` from the original `CAREER_OPS_ROOT`.
- `Evaluate JD` calls `gemini-eval.mjs`, so it needs `GEMINI_API_KEY` in the original repo `.env` or in this wrapper environment.
- `PDF` calls `generate-pdf.mjs`, which needs Playwright installed in the original repo.
- No Docker is required.
