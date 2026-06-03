
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models import CareerOpsInputRequest, CareerOpsRequest, ScanRequest, EvaluateRequest, PdfRequest, ScriptRequest
from app.services import career_ops

app = FastAPI(title="career-ops Web API", version="0.1.0")

CAREER_OPS_COMMANDS = [
    {"command": "/career-ops {JD}", "mode": "auto-pipeline", "description": "AUTO-PIPELINE: evaluate + report + PDF + tracker"},
    {"command": "/career-ops pipeline", "mode": "pipeline", "description": "Process pending URLs from inbox"},
    {"command": "/career-ops oferta", "mode": "oferta", "description": "Evaluation only A-G"},
    {"command": "/career-ops ofertas", "mode": "ofertas", "description": "Compare and rank multiple offers"},
    {"command": "/career-ops contacto", "mode": "contacto", "description": "LinkedIn power move: find contacts + draft message"},
    {"command": "/career-ops deep", "mode": "deep", "description": "Deep research prompt about company"},
    {"command": "/career-ops interview-prep", "mode": "interview-prep", "description": "Generate company-specific interview prep doc"},
    {"command": "/career-ops pdf", "mode": "pdf", "description": "PDF only, ATS-optimized CV"},
    {"command": "/career-ops training", "mode": "training", "description": "Evaluate course/cert against North Star"},
    {"command": "/career-ops project", "mode": "project", "description": "Evaluate portfolio project idea"},
    {"command": "/career-ops tracker", "mode": "tracker", "description": "Application status overview"},
    {"command": "/career-ops apply", "mode": "apply", "description": "Live application assistant"},
    {"command": "/career-ops scan", "mode": "scan", "description": "Scan portals and discover new offers"},
    {"command": "/career-ops batch", "mode": "batch", "description": "Batch processing with parallel workers"},
    {"command": "/career-ops patterns", "mode": "patterns", "description": "Analyze rejection patterns and improve targeting"},
    {"command": "/career-ops followup", "mode": "followup", "description": "Follow-up cadence tracker: flag overdue, generate drafts"},
]

CAREER_OPS_ROUTE_MODES = {item["mode"] for item in CAREER_OPS_COMMANDS}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    try:
        root = career_ops.career_root()
        return {"ok": True, "career_ops_root": str(root), "onboarding": career_ops.onboarding_status()}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/modes")
def modes():
    try:
        return {"modes": career_ops.list_modes()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/career-ops/commands")
def career_ops_commands():
    return {"commands": CAREER_OPS_COMMANDS}

@app.get("/api/tracker")
def tracker():
    try:
        rows = career_ops.read_tracker()
        stats = {}
        for row in rows:
            stats[row.status or "Unknown"] = stats.get(row.status or "Unknown", 0) + 1
        return {"rows": rows, "stats": stats, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pipeline")
def pipeline():
    try:
        items = career_ops.read_pipeline()
        return {"items": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan")
async def scan(req: ScanRequest):
    try:
        details = [
            f"dry_run={req.dry_run}",
            f"verify={req.verify}",
            f"company={req.company or 'all'}",
        ]
        return await career_ops.run_agent("scan", "\n".join(details))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest):
    try:
        return await career_ops.run_agent("", req.jd_text, model=req.model, no_save=req.no_save)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/career-ops")
async def career_ops_agent(req: CareerOpsRequest):
    try:
        return await career_ops.run_agent(
            req.mode,
            req.input,
            model=req.model,
            max_turns=req.max_turns,
            max_budget_usd=req.max_budget_usd,
            no_save=req.no_save,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/career-ops/{mode}")
async def career_ops_mode(mode: str, req: CareerOpsInputRequest):
    if mode not in CAREER_OPS_ROUTE_MODES:
        allowed = ", ".join(sorted(CAREER_OPS_ROUTE_MODES))
        raise HTTPException(status_code=400, detail=f"Unsupported career-ops mode: {mode}. Allowed: {allowed}")
    try:
        router_mode = "" if mode == "auto-pipeline" else mode
        return await career_ops.run_agent(
            router_mode,
            req.input,
            model=req.model,
            max_turns=req.max_turns,
            max_budget_usd=req.max_budget_usd,
            no_save=req.no_save,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf")
def pdf(req: PdfRequest):
    try:
        result, path = career_ops.generate_pdf(req.html, req.filename, req.format)
        return {"result": result, "pdf_path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/patterns")
def patterns():
    try:
        return career_ops.run_allowed_script("patterns", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/script")
def script(req: ScriptRequest):
    try:
        return career_ops.run_allowed_script(req.script, req.args)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
