
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app import db
from app.models import (
    AuthRequest,
    CareerOpsInputRequest,
    CareerOpsRequest,
    EvaluateRequest,
    PdfRequest,
    ScanRequest,
    ScriptRequest,
    SetupRequest,
)
from app.services import career_ops

app = FastAPI(title="career-ops Web API", version="0.1.0")
SESSION_COOKIE = "career_ops_session"

CAREER_OPS_COMMANDS = [
    {"command": "/career-ops {JD}", "mode": "auto-pipeline", "description": "자동 파이프라인: 평가, 보고서, PDF, 트래커 기록"},
    {"command": "/career-ops pipeline", "mode": "pipeline", "description": "인박스의 대기 URL을 순서대로 처리"},
    {"command": "/career-ops oferta", "mode": "oferta", "description": "채용공고 A-G 단독 평가"},
    {"command": "/career-ops ofertas", "mode": "ofertas", "description": "여러 공고 비교 및 지원 우선순위 산정"},
    {"command": "/career-ops contacto", "mode": "contacto", "description": "LinkedIn/네트워킹 대상 찾기와 메시지 초안"},
    {"command": "/career-ops deep", "mode": "deep", "description": "회사 심층 리서치"},
    {"command": "/career-ops interview-prep", "mode": "interview-prep", "description": "회사별 면접 준비 문서 생성"},
    {"command": "/career-ops pdf", "mode": "pdf", "description": "ATS 최적화 CV PDF 생성"},
    {"command": "/career-ops training", "mode": "training", "description": "교육/자격증의 목표 역할 대비 가치 평가"},
    {"command": "/career-ops project", "mode": "project", "description": "포트폴리오 프로젝트 아이디어 평가"},
    {"command": "/career-ops tracker", "mode": "tracker", "description": "지원 현황과 파이프라인 요약"},
    {"command": "/career-ops apply", "mode": "apply", "description": "지원서 문항 답변 초안 작성"},
    {"command": "/career-ops scan", "mode": "scan", "description": "한국/글로벌 리모트 포털 스캔"},
    {"command": "/career-ops batch", "mode": "batch", "description": "여러 공고 병렬 배치 평가"},
    {"command": "/career-ops patterns", "mode": "patterns", "description": "탈락/전환 패턴 분석과 타겟팅 개선"},
    {"command": "/career-ops followup", "mode": "followup", "description": "후속 연락 케이던스 확인과 초안 생성"},
]

CAREER_OPS_ROUTE_MODES = {item["mode"] for item in CAREER_OPS_COMMANDS}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    db.init_db()


def public_user(row):
    return {"id": row["id"], "email": row["email"]} if row else None


def require_user(request: Request):
    user = db.user_from_session(request.cookies.get(SESSION_COOKIE))
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def optional_user(request: Request):
    return db.user_from_session(request.cookies.get(SESSION_COOKIE))


def setup_payload(row):
    onboarding = {
        "cv": bool(row["cv_md"].strip()),
        "profile": bool(row["profile_yml"].strip()),
        "mode_profile": bool(row["mode_profile_md"].strip()),
        "portals": bool(row["portals_yml"].strip()),
    }
    return {
        "cv_md": row["cv_md"],
        "profile_yml": row["profile_yml"],
        "mode_profile_md": row["mode_profile_md"],
        "portals_yml": row["portals_yml"],
        "updated_at": row["updated_at"],
        "onboarding": onboarding,
    }


def sync_user_setup(user) -> dict[str, bool]:
    setup = db.get_setup(user["id"])
    return career_ops.sync_setup_files(
        setup["cv_md"],
        setup["profile_yml"],
        setup["mode_profile_md"],
        setup["portals_yml"],
    )


@app.post("/api/auth/register")
def register(req: AuthRequest, response: Response):
    if db.find_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = db.create_user(req.email, req.password)
    token = db.create_session(user["id"])
    response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 14)
    return {"user": public_user(user)}


@app.post("/api/auth/login")
def login(req: AuthRequest, response: Response):
    user = db.find_user_by_email(req.email)
    if not user or not db.verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = db.create_session(user["id"])
    response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 14)
    return {"user": public_user(user)}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    db.delete_session(request.cookies.get(SESSION_COOKIE) or "")
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@app.get("/api/auth/me")
def me(user=Depends(optional_user)):
    return {"user": public_user(user)}


@app.get("/api/setup")
def get_setup(user=Depends(require_user)):
    return setup_payload(db.get_setup(user["id"]))


@app.put("/api/setup")
def put_setup(req: SetupRequest, user=Depends(require_user)):
    setup = db.update_setup(user["id"], req.cv_md, req.profile_yml, req.mode_profile_md, req.portals_yml)
    onboarding = sync_user_setup(user)
    payload = setup_payload(setup)
    payload["onboarding"] = onboarding
    return payload


@app.get("/api/health")
def health(user=Depends(optional_user)):
    try:
        root = career_ops.career_root()
        onboarding = setup_payload(db.get_setup(user["id"]))["onboarding"] if user else career_ops.onboarding_status()
        return {"ok": True, "career_ops_root": str(root), "onboarding": onboarding, "user": public_user(user)}
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
def tracker(user=Depends(require_user)):
    try:
        sync_user_setup(user)
        rows = career_ops.read_tracker()
        stats = {}
        for row in rows:
            stats[row.status or "Unknown"] = stats.get(row.status or "Unknown", 0) + 1
        return {"rows": rows, "stats": stats, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pipeline")
def pipeline(user=Depends(require_user)):
    try:
        sync_user_setup(user)
        items = career_ops.read_pipeline()
        return {"items": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan")
async def scan(req: ScanRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
        details = [
            f"dry_run={req.dry_run}",
            f"verify={req.verify}",
            f"company={req.company or 'all'}",
        ]
        return await career_ops.run_agent("scan", "\n".join(details))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
        return await career_ops.run_agent("", req.jd_text, model=req.model, no_save=req.no_save)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/career-ops")
async def career_ops_agent(req: CareerOpsRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
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
async def career_ops_mode(mode: str, req: CareerOpsInputRequest, user=Depends(require_user)):
    if mode not in CAREER_OPS_ROUTE_MODES:
        allowed = ", ".join(sorted(CAREER_OPS_ROUTE_MODES))
        raise HTTPException(status_code=400, detail=f"Unsupported career-ops mode: {mode}. Allowed: {allowed}")
    try:
        sync_user_setup(user)
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
def pdf(req: PdfRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
        result, path = career_ops.generate_pdf(req.html, req.filename, req.format)
        return {"result": result, "pdf_path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/patterns")
def patterns(user=Depends(require_user)):
    try:
        sync_user_setup(user)
        return career_ops.run_allowed_script("patterns", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/script")
def script(req: ScriptRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
        return career_ops.run_allowed_script(req.script, req.args)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
