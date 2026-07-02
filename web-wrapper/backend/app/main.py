
import asyncio
import json
import re
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from app.config import settings
from app import db
from app.models import (
    AuthRequest,
    GoogleAuthRequest,
    CareerOpsInputRequest,
    CareerOpsRequest,
    EvaluateRequest,
    PdfRequest,
    ScanRequest,
    ScriptRequest,
    SetupRequest,
)
from app.services import career_ops
from app import workspace

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
    allow_origin_regex=settings.backend_cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_origin_regex = re.compile(settings.backend_cors_origin_regex) if settings.backend_cors_origin_regex else None
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _origin_allowed(origin: str) -> bool:
    if origin in settings.cors_origins:
        return True
    return bool(_origin_regex and _origin_regex.fullmatch(origin))


@app.middleware("http")
async def csrf_origin_guard(request: Request, call_next):
    # Session cookies are SameSite=None (cross-site Vercel→Railway), so a browser
    # will attach them to forged cross-site requests. Reject state-changing
    # requests whose Origin is not allowlisted. Absent Origin (non-browser /
    # same-origin) is allowed; browsers always send Origin on cross-site writes.
    if request.method not in SAFE_METHODS:
        origin = request.headers.get("origin")
        if origin and not _origin_allowed(origin):
            return JSONResponse(status_code=403, content={"detail": "Cross-origin request rejected"})
    return await call_next(request)


# Lightweight in-memory brute-force guard for auth endpoints (per client IP).
_AUTH_WINDOW_SECONDS = 300
_AUTH_MAX_ATTEMPTS = 10
_auth_hits: dict[str, deque] = defaultdict(deque)


def auth_rate_limit(request: Request) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    now = time.monotonic()
    hits = _auth_hits[ip]
    while hits and now - hits[0] > _AUTH_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= _AUTH_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    hits.append(now)


@app.on_event("startup")
def startup():
    if settings.database_url:
        db.init_db()


def public_user(row):
    return {"id": row["id"], "email": row["email"], "plan": row.get("plan", "free")} if row else None


# When DATABASE_URL is not set, run in dev mode: all requests are treated as a
# local superuser so the full LLM pipeline can be tested without Google OAuth or Postgres.
_DEV_USER = {"id": 0, "email": "dev@local", "plan": "paid"}


def require_user(request: Request):
    if not settings.database_url:
        return _DEV_USER
    user = db.user_from_session(request.cookies.get(SESSION_COOKIE))
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def optional_user(request: Request):
    if not settings.database_url:
        return _DEV_USER
    return db.user_from_session(request.cookies.get(SESSION_COOKIE))


def gate_agent(user=Depends(require_user)):
    """Block LLM-cost endpoints once a user hits their plan's daily budget (resets
    at UTC midnight). Free users are prompted to buy a pass; paid users wait for
    the reset. The per-run ceiling (MAX_AGENT_BUDGET_USD) bounds overshoot."""
    if not settings.database_url:
        return user  # dev mode: no usage metering
    is_paid = user.get("plan") == "paid"
    limit = settings.paid_daily_budget_usd if is_paid else settings.daily_budget_usd
    if db.usage_today_usd(user["id"]) >= limit:
        if is_paid:
            detail = {"code": "paid_quota_exceeded", "message": "오늘 한도를 모두 사용했어요. 내일 다시 이용해 주세요."}
        else:
            detail = {"code": "free_quota_exceeded", "message": "오늘 무료 한도를 다 쓰셨어요. 이용권을 확인해 주세요."}
        raise HTTPException(status_code=402, detail=detail)
    return user


def _is_secure_request(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto == "https"


def _cookie_options(request: Request) -> dict:
    secure = settings.session_cookie_secure.lower()
    samesite = settings.session_cookie_samesite.lower()
    is_secure = _is_secure_request(request)
    return {
        "httponly": True,
        "secure": secure == "true" if secure else is_secure,
        "samesite": samesite if samesite else ("none" if is_secure else "lax"),
        "max_age": 60 * 60 * 24 * 14,
    }


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


def _run_title(mode: str, input_text: str, stdout: str) -> str:
    """Short label for the history sidebar. Prefer a report heading, else the first
    line of the user's input, else the mode name. Capped at 80 chars."""
    for pattern in (r"(?m)^#\s*Evaluation:\s*(.+)$", r"(?m)^#{1,3}\s+(.+)$"):
        m = re.search(pattern, stdout or "")
        if m:
            return m.group(1).strip()[:80]
    first = next((line.strip() for line in (input_text or "").splitlines() if line.strip()), "")
    return (first or mode or "분석")[:80]


def _record_run(user, result: dict, input_text: str) -> None:
    """Persist a finished agent run into the history table. Skips discovery (static
    help, no SDK call). Never raises into the user-facing response."""
    mode = result.get("mode", "")
    if mode == "discovery":
        return
    try:
        db.create_run(
            user["id"],
            mode,
            _run_title(mode, input_text, result.get("stdout", "")),
            input_text,
            result.get("stdout", ""),
            result.get("ok", False),
            result.get("cost_usd", 0.0),
        )
    except Exception:
        pass  # history persistence must never break the user-facing response


async def run_and_meter(user, coro, input_text: str = "") -> dict:
    """Await an agent run, record its cost for usage metering, and persist it to the
    history sidebar."""
    result = await coro
    try:
        db.record_usage(user["id"], result.get("mode", ""), result.get("cost_usd", 0.0), result.get("ok", False))
    except Exception:
        pass  # metering must never break the user-facing response
    _record_run(user, result, input_text)
    persist_user_files(user)
    return result


# SSE headers: defeat proxy buffering so deltas reach the browser as they are
# produced (Railway/nginx honor X-Accel-Buffering).
_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


_AITER_DONE = object()  # sentinel for an exhausted async iterator


async def _anext_or_done(ait) -> object:
    try:
        return await ait.__anext__()
    except StopAsyncIteration:
        return _AITER_DONE


async def stream_and_meter(user, agen, input_text: str = ""):
    """Relay agent stream events as SSE frames with 20-second keep-alive pings.

    HTTP/2 gateways drop idle SSE connections; pings (SSE comment lines) prevent
    that without touching the client-side parser, which only handles `data:` lines.
    """
    PING_INTERVAL = 20  # seconds between heartbeats when agent is silent
    final_result = None
    pending: asyncio.Task | None = None
    try:
        ait = agen.__aiter__()
        pending = asyncio.create_task(_anext_or_done(ait))
        while True:
            try:
                result = await asyncio.wait_for(asyncio.shield(pending), timeout=PING_INTERVAL)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            if result is _AITER_DONE:
                break
            event = result
            pending = asyncio.create_task(_anext_or_done(ait))
            if event.get("type") == "done":
                final_result = event.get("result")
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    except Exception as e:  # surface failures to the client instead of a dead stream
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
    finally:
        if pending is not None and not pending.done():
            pending.cancel()
        if final_result is not None:
            try:
                db.record_usage(
                    user["id"],
                    final_result.get("mode", ""),
                    final_result.get("cost_usd", 0.0),
                    final_result.get("ok", False),
                )
            except Exception:
                pass  # metering must never break the user-facing response
            _record_run(user, final_result, input_text)
            persist_user_files(user)


def sync_user_setup(user) -> dict[str, bool]:
    if not settings.database_url:
        # Dev mode: there's no DB-backed per-user setup to pull from. Materialize
        # the per-user workspace straight from the base repo's own cv.md /
        # profile.yml / etc. (the original career-ops checkout at CAREER_OPS_ROOT)
        # so it isn't left empty — provision_workspace() deliberately skips these
        # user-specific files, expecting the DB to supply them.
        base = career_ops.career_root(None)

        def _read(rel: str) -> str:
            path = base / rel
            return path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""

        return workspace.materialize_setup(
            user["id"],
            _read("cv.md"),
            _read("config/profile.yml"),
            _read("modes/_profile.md"),
            _read("portals.yml"),
        )
    setup = db.get_setup(user["id"])
    onboarding = workspace.materialize_setup(
        user["id"],
        setup["cv_md"],
        setup["profile_yml"],
        setup["mode_profile_md"],
        setup["portals_yml"],
    )
    # Restore DB-backed generated files (tracker, follow-ups, reports, interview prep)
    # so the agent reads its prior context even on a fresh/redeployed container.
    try:
        workspace.restore_files(user["id"], db.list_user_files(user["id"]))
    except Exception:
        pass  # restore is best-effort; never block the run on it
    return onboarding


def persist_user_files(user) -> None:
    """Snapshot the agent-generated workspace files into the DB after a run. Never
    raises into the user-facing response."""
    try:
        db.upsert_user_files(user["id"], workspace.snapshot_files(user["id"]))
    except Exception:
        pass


@app.post("/api/auth/register")
def register(req: AuthRequest, request: Request, response: Response):
    auth_rate_limit(request)
    if db.find_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = db.create_user(req.email, req.password)
    workspace.provision_workspace(user["id"])
    token = db.create_session(user["id"])
    response.set_cookie(SESSION_COOKIE, token, **_cookie_options(request))
    return {"user": public_user(user)}


@app.post("/api/auth/login")
def login(req: AuthRequest, request: Request, response: Response):
    auth_rate_limit(request)
    user = db.find_user_by_email(req.email)
    if not user or not db.verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = db.create_session(user["id"])
    response.set_cookie(SESSION_COOKIE, token, **_cookie_options(request))
    return {"user": public_user(user)}


@app.post("/api/auth/google")
def google_login(req: GoogleAuthRequest, request: Request, response: Response):
    auth_rate_limit(request)
    if not settings.google_oauth_client_id:
        raise HTTPException(status_code=400, detail="Google login is not configured")
    # Verify the ID token locally against Google's public keys: checks signature,
    # expiry, issuer, and that the audience matches our Client ID. We never trust
    # the client-supplied claims directly.
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        claims = id_token.verify_oauth2_token(
            req.credential, google_requests.Request(), settings.google_oauth_client_id
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = claims.get("sub")
    email = claims.get("email")
    if not google_id or not email:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    user = db.find_user_by_google_id(google_id)
    if not user:
        existing = db.find_user_by_email(email)
        if existing:
            db.link_google_id(existing["id"], google_id)
            user = existing
        else:
            user = db.create_google_user(email, google_id)
            workspace.provision_workspace(user["id"])

    token = db.create_session(user["id"])
    response.set_cookie(SESSION_COOKIE, token, **_cookie_options(request))
    return {"user": public_user(user)}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    db.delete_session(request.cookies.get(SESSION_COOKIE) or "")
    response.delete_cookie(
        SESSION_COOKIE,
        secure=_cookie_options(request)["secure"],
        samesite=_cookie_options(request)["samesite"],
    )
    return {"ok": True}


@app.get("/api/auth/me")
def me(user=Depends(optional_user)):
    return {"user": public_user(user)}


def _dev_mode_setup_payload() -> dict:
    """No DB in dev mode, so there's no per-user setup row to read/write. Show
    the base repo's own files (same source sync_user_setup() falls back to)
    instead of 500ing — read-only here, since there's nowhere to persist edits."""
    base = career_ops.career_root(None)

    def _read(rel: str) -> str:
        path = base / rel
        return path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""

    row = {
        "cv_md": _read("cv.md"),
        "profile_yml": _read("config/profile.yml"),
        "mode_profile_md": _read("modes/_profile.md"),
        "portals_yml": _read("portals.yml"),
        "updated_at": None,
    }
    return setup_payload(row)


@app.get("/api/setup")
def get_setup(user=Depends(require_user)):
    if not settings.database_url:
        return _dev_mode_setup_payload()
    return setup_payload(db.get_setup(user["id"]))


@app.put("/api/setup")
def put_setup(req: SetupRequest, user=Depends(require_user)):
    if not settings.database_url:
        # Dev mode: nothing to persist to (no DB). Return the base repo's
        # actual files unchanged rather than pretending the edit was saved.
        return _dev_mode_setup_payload()
    setup = db.update_setup(user["id"], req.cv_md, req.profile_yml, req.mode_profile_md, req.portals_yml)
    onboarding = sync_user_setup(user)
    payload = setup_payload(setup)
    payload["onboarding"] = onboarding
    return payload


@app.get("/api/health")
def health(user=Depends(optional_user)):
    try:
        root = career_ops.career_root()
        if user and settings.database_url:
            onboarding = setup_payload(db.get_setup(user["id"]))["onboarding"]
        else:
            onboarding = career_ops.onboarding_status()
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
    if not settings.database_url:
        try:
            rows = career_ops.read_tracker(None)
            stats = {}
            for row in rows:
                stats[row.status or "Unknown"] = stats.get(row.status or "Unknown", 0) + 1
            return {"rows": rows, "stats": stats, "total": len(rows)}
        except Exception:
            return {"rows": [], "stats": {}, "total": 0}
    try:
        sync_user_setup(user)
        rows = career_ops.read_tracker(user["id"])
        stats = {}
        for row in rows:
            stats[row.status or "Unknown"] = stats.get(row.status or "Unknown", 0) + 1
        return {"rows": rows, "stats": stats, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pipeline")
def pipeline(user=Depends(require_user)):
    if not settings.database_url:
        try:
            items = career_ops.read_pipeline(None)
            return {"items": items, "total": len(items)}
        except Exception:
            return {"items": [], "total": 0}
    try:
        sync_user_setup(user)
        items = career_ops.read_pipeline(user["id"])
        return {"items": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan")
async def scan(req: ScanRequest, user=Depends(gate_agent)):
    try:
        sync_user_setup(user)
        details = [
            f"dry_run={req.dry_run}",
            f"verify={req.verify}",
            f"company={req.company or 'all'}",
        ]
        return await run_and_meter(
            user,
            career_ops.run_agent(user["id"], "scan", "\n".join(details)),
            input_text=f"스캔: {req.company}" if req.company else "포털 스캔",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest, user=Depends(gate_agent)):
    try:
        sync_user_setup(user)
        return await run_and_meter(
            user,
            career_ops.run_agent(user["id"], "", req.jd_text, model=req.model, no_save=req.no_save),
            input_text=req.jd_text,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/career-ops")
async def career_ops_agent(req: CareerOpsRequest, user=Depends(gate_agent)):
    try:
        sync_user_setup(user)
        return await run_and_meter(user, career_ops.run_agent(
            user["id"],
            req.mode,
            req.input,
            model=req.model,
            max_turns=req.max_turns,
            max_budget_usd=req.max_budget_usd,
            no_save=req.no_save,
        ), input_text=req.input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

_MOCK_OFERTA = """\
```ats-summary
score: 82
grade: 경쟁력 있음
legitimacy: High Confidence
archetype: LLMOps / Agentic AI
match_keywords: Python, LLM, FastAPI, RAG, Claude API
missing_keywords: Kubernetes, MLflow, Terraform
highlight_skills: Claude Agent SDK, SSE Streaming, FastAPI
deductions: [-5점] 정량적 성과 수치 부족|[-3점] 클라우드 인프라 경험 명시 필요
summary: 핵심 AI 스택 일치, 인프라 경험 보강 필요
hooks: 'LLM 에이전트 파이프라인을 직접 설계·운영한 경험을 이 포지션에 즉시 적용할 수 있습니다.'|'Claude API 기반 스트리밍 아키텍처를 실무에 구현한 몇 안 되는 엔지니어입니다.'|'RAG 시스템 구축부터 배포까지 end-to-end를 담당한 경험이 있습니다.'
```

## A. 역할 분류
**아키타입:** LLMOps / Agentic AI — Claude API, FastAPI 기반 실시간 추론 파이프라인을 다루는 포지션입니다.

## B. 이력서 매핑
| JD 요구사항 | CV 항목 | 갭 |
|---|---|---|
| Python 3.10+ | ✅ 주력 언어 | — |
| LLM API 연동 | ✅ Claude Agent SDK 사용 | — |
| FastAPI | ✅ 프로젝트 경험 | — |
| Kubernetes | ⚠️ 미언급 | 보완 필요 |

## C. 시니어리티 분석
JD는 **Senior** 레벨을 요구합니다. 현재 이력서의 자연 레벨은 **Mid-Senior**입니다. 에이전트 파이프라인 설계 경험을 전면에 배치하면 시니어로 어필 가능합니다.

## D. 보상 데이터
Glassdoor 기준 해당 포지션 연봉: 데이터 없음 (스타트업 비공개)

## E. 최적화 제안
1. `cv.md` — "Claude Agent SDK 기반 스트리밍 파이프라인 구축" 수치 추가
2. LinkedIn — 'LLMOps' 키워드를 헤드라인에 포함

## F. STAR 스토리
**[S]** 다수의 LLM 호출을 SSE로 클라이언트에 실시간 전달해야 했음
**[T]** 지연 없이 토큰 단위 스트리밍 구현
**[A]** FastAPI StreamingResponse + claude-agent-sdk stream_agent() 조합 설계
**[R]** 평균 응답 체감 속도 3배 단축

## G. 공고 신뢰도
**High Confidence** — 회사 도메인 검증 완료, 레이오프 신호 없음.
"""

_MOCK_JASOSEO = """\
### 1. 성장과정 및 지원동기
저는 대학교 재학 중 처음 접한 자동화 프로젝트를 계기로 AI 엔지니어링의 길을 걷기 시작했습니다. 팀 내 반복 업무를 Python 스크립트로 자동화하며 **월 40시간**의 공수를 절감한 경험은, 기술이 실질적인 가치를 만들어낼 수 있다는 확신을 심어주었습니다.

귀사의 LLM 파이프라인 포지션에 지원하는 이유는 단순합니다. Claude API 기반 에이전트를 직접 설계·운영하며 쌓은 경험을 귀사의 프로덕션 환경에 즉시 적용할 수 있기 때문입니다. 스타트업 특유의 빠른 의사결정 구조에서 end-to-end 시스템을 담당하고 싶습니다.

### 2. 직무 역량 및 경험
FastAPI와 Claude Agent SDK를 결합해 **SSE 스트리밍 파이프라인**을 구축한 경험이 있습니다. 토큰 단위 응답을 클라이언트에 실시간 전달하는 아키텍처를 설계하여 사용자 체감 응답 속도를 **3배** 개선했습니다.

또한 RAG(Retrieval-Augmented Generation) 시스템을 직접 구현한 경험이 있습니다. 벡터 DB 선택부터 청킹 전략, 리랭킹 로직까지 전 과정을 담당하며 검색 정확도를 **F1 기준 0.71 → 0.89**로 높였습니다.

### 3. 입사 후 포부
입사 첫 3개월은 기존 파이프라인의 병목을 파악하고 측정 가능한 개선안을 제시하는 데 집중하겠습니다. 이후 6개월 내로 모델 평가 자동화 체계를 구축해 팀의 실험 주기를 단축하는 데 기여하고 싶습니다.

장기적으로는 LLMOps 분야의 내부 전문가로 성장하며, 팀이 더 빠르게 실험하고 더 안정적으로 배포할 수 있는 인프라를 만드는 사람이 되겠습니다.

### 4. 성격의 장단점
**장점:** 문서화를 습관화합니다. 구현한 내용을 바로 README와 ADR로 정리해 팀 지식이 개인에게 종속되지 않도록 합니다. 전 팀에서 이 습관 덕분에 온보딩 기간이 **2주 → 4일**로 단축된 사례가 있습니다.

**단점:** 완성도에 집착하는 경향이 있습니다. 이를 보완하기 위해 PR 단위를 작게 유지하고, 리뷰어에게 "이 정도면 충분한가요?"를 명시적으로 물어보는 루틴을 만들었습니다.
"""


async def _mock_stream(mode: str):
    text = _MOCK_JASOSEO if mode == "jasoseo" else _MOCK_OFERTA
    yield f"data: {json.dumps({'type': 'status', 'text': '📄 프로필 읽는 중…'})}\n\n"
    await asyncio.sleep(0.4)
    yield f"data: {json.dumps({'type': 'status', 'text': '🔍 분석 중…'})}\n\n"
    await asyncio.sleep(0.6)
    for i in range(0, len(text), 12):
        chunk = text[i:i+12]
        yield f"data: {json.dumps({'type': 'delta', 'text': chunk})}\n\n"
        await asyncio.sleep(0.02)
    resolved_mode = "jasoseo" if mode == "jasoseo" else "oferta"
    yield f"data: {json.dumps({'type': 'done', 'result': {'ok': True, 'returncode': 0, 'stdout': text, 'mode': resolved_mode}})}\n\n"


@app.post("/api/career-ops/stream")
async def career_ops_stream(req: CareerOpsRequest, user=Depends(gate_agent)):
    if not settings.anthropic_api_key:
        return StreamingResponse(
            _mock_stream(req.mode or "oferta"),
            media_type="text/event-stream",
            headers=_SSE_HEADERS,
        )
    # Defined before /api/career-ops/{mode} so "stream" is not captured as a mode.
    # The frontend passes the resolved mode in the body (auto-pipeline -> "").
    sync_user_setup(user)
    agen = career_ops.stream_agent(
        user["id"],
        req.mode,
        req.input,
        model=req.model,
        max_turns=req.max_turns,
        max_budget_usd=req.max_budget_usd,
        no_save=req.no_save,
    )
    return StreamingResponse(
        stream_and_meter(user, agen, input_text=req.input),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )

@app.post("/api/career-ops/{mode}")
async def career_ops_mode(mode: str, req: CareerOpsInputRequest, user=Depends(gate_agent)):
    if mode not in CAREER_OPS_ROUTE_MODES:
        allowed = ", ".join(sorted(CAREER_OPS_ROUTE_MODES))
        raise HTTPException(status_code=400, detail=f"Unsupported career-ops mode: {mode}. Allowed: {allowed}")
    try:
        sync_user_setup(user)
        router_mode = "" if mode == "auto-pipeline" else mode
        return await run_and_meter(user, career_ops.run_agent(
            user["id"],
            router_mode,
            req.input,
            model=req.model,
            max_turns=req.max_turns,
            max_budget_usd=req.max_budget_usd,
            no_save=req.no_save,
        ), input_text=req.input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/runs")
def runs_list(user=Depends(require_user)):
    if not settings.database_url:
        return {"runs": []}
    rows = db.list_runs(user["id"])
    return {"runs": [
        {
            "id": r["id"],
            "mode": r["mode"],
            "title": r["title"],
            "ok": r["ok"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
        }
        for r in rows
    ]}

@app.get("/api/runs/{run_id}")
def runs_get(run_id: int, user=Depends(require_user)):
    row = db.get_run(user["id"], run_id)
    if not row:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": row["id"],
        "mode": row["mode"],
        "title": row["title"],
        "input": row["input"],
        "stdout": row["stdout"],
        "ok": row["ok"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else "",
    }

@app.delete("/api/runs/{run_id}")
def runs_delete(run_id: int, user=Depends(require_user)):
    if not db.delete_run(user["id"], run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}

@app.post("/api/pdf")
def pdf(req: PdfRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
        result, path = career_ops.generate_pdf(user["id"], req.html, req.filename, req.format)
        return {"result": result, "pdf_path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/patterns")
def patterns(user=Depends(require_user)):
    try:
        sync_user_setup(user)
        return career_ops.run_allowed_script(user["id"], "patterns", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/script")
def script(req: ScriptRequest, user=Depends(require_user)):
    try:
        sync_user_setup(user)
        return career_ops.run_allowed_script(user["id"], req.script, req.args)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
