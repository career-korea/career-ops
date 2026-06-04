
from pydantic import BaseModel, Field
from typing import Optional, Any

class AuthRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)

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

class CareerOpsRequest(BaseModel):
    mode: str = ""
    input: str = ""
    model: Optional[str] = None
    max_turns: int = 20
    max_budget_usd: Optional[float] = None
    no_save: bool = False

class CareerOpsInputRequest(BaseModel):
    input: str = ""
    model: Optional[str] = None
    max_turns: int = 20
    max_budget_usd: Optional[float] = None
    no_save: bool = False

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
