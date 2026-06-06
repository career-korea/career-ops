
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Any

# Friendly aliases the Claude CLI/SDK resolves to a concrete model. Pinned
# "claude-*" IDs are also allowed for API power users. Anything else is rejected
# so an arbitrary string can't be forwarded into a billed agent run.
ALLOWED_MODEL_ALIASES = {"haiku", "sonnet", "opus"}


def _validate_model(cls, v: Optional[str]) -> Optional[str]:
    if v in (None, ""):
        return None
    if v in ALLOWED_MODEL_ALIASES or v.startswith("claude-"):
        return v
    allowed = ", ".join(sorted(ALLOWED_MODEL_ALIASES))
    raise ValueError(f"Unsupported model: {v}. Allowed: {allowed} (or a claude-* id)")

class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=200)

class UserResponse(BaseModel):
    id: int
    email: str

class SetupRequest(BaseModel):
    cv_md: str = ""
    profile_yml: str = ""
    mode_profile_md: str = ""
    portals_yml: str = ""

class SetupResponse(SetupRequest):
    updated_at: str = ""
    onboarding: dict[str, bool]

class CommandResult(BaseModel):
    ok: bool
    command: list[str]
    cwd: str
    returncode: int
    stdout: str
    stderr: str

class ScanRequest(BaseModel):
    dry_run: bool = False
    verify: bool = False
    company: Optional[str] = None

class EvaluateRequest(BaseModel):
    jd_text: str = Field(..., min_length=10)
    model: Optional[str] = None
    no_save: bool = False

    _vm = field_validator("model")(_validate_model)

class CareerOpsRequest(BaseModel):
    mode: str = ""
    input: str = ""
    model: Optional[str] = None
    max_turns: int = 20
    max_budget_usd: Optional[float] = None
    no_save: bool = False

    _vm = field_validator("model")(_validate_model)

class CareerOpsInputRequest(BaseModel):
    input: str = ""
    model: Optional[str] = None
    max_turns: int = 20
    max_budget_usd: Optional[float] = None
    no_save: bool = False

    _vm = field_validator("model")(_validate_model)

class PdfRequest(BaseModel):
    html: str = Field(..., min_length=20)
    filename: str = "cv-web"
    format: str = "a4"

class ScriptRequest(BaseModel):
    script: str
    args: list[str] = []

class TrackerRow(BaseModel):
    index: str = ""
    date: str = ""
    company: str = ""
    role: str = ""
    score: str = ""
    status: str = ""
    pdf: str = ""
    report: str = ""
    raw: list[str] = []

class PipelineItem(BaseModel):
    checked: bool
    url: str
    company: str = ""
    title: str = ""
    raw: str
