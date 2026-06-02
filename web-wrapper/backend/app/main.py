
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models import ScanRequest, EvaluateRequest, PdfRequest, ScriptRequest
from app.services import career_ops

app = FastAPI(title="career-ops Web API", version="0.1.0")

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
        return {"ok": True, "career_ops_root": str(root)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/modes")
def modes():
    try:
        return {"modes": career_ops.list_modes()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
def scan(req: ScanRequest):
    try:
        return career_ops.scan(req.dry_run, req.verify, req.company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
def evaluate(req: EvaluateRequest):
    try:
        return career_ops.evaluate_jd(req.jd_text, req.model, req.no_save)
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
