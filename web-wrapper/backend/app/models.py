
from pydantic import BaseModel, Field
from typing import Optional, Any

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
