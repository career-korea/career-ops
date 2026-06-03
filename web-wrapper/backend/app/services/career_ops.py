
import os
import re
import subprocess
import tempfile
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any

from app.config import settings
from app.models import CommandResult, TrackerRow, PipelineItem

ALLOWED_SCRIPTS = {
    "doctor": ["node", "doctor.mjs"],
    "verify": ["node", "verify-pipeline.mjs"],
    "normalize": ["node", "normalize-statuses.mjs"],
    "dedup": ["node", "dedup-tracker.mjs"],
    "merge": ["node", "merge-tracker.mjs"],
    "scan": ["node", "scan.mjs"],
    "patterns": ["node", "analyze-patterns.mjs"],
    "liveness": ["node", "check-liveness.mjs"],
    "sync-check": ["node", "cv-sync-check.mjs"],
}

MODE_PATTERN = re.compile(r"\| `([^`]+)` \| `([^`]+)` \|")
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)
JD_KEYWORDS = (
    "responsibilities",
    "requirements",
    "qualifications",
    "about the role",
    "we're looking for",
    "what you'll do",
    "job description",
)
SHARED_MODES = {
    "auto-pipeline",
    "oferta",
    "ofertas",
    "pdf",
    "contacto",
    "apply",
    "pipeline",
    "scan",
    "batch",
}
STANDALONE_MODES = {
    "tracker",
    "deep",
    "interview-prep",
    "training",
    "project",
    "patterns",
    "followup",
}
DELEGATED_MODES = {"scan", "apply", "pipeline"}


def career_root() -> Path:
    root = settings.root_path
    if not root.exists():
        raise FileNotFoundError(f"CAREER_OPS_ROOT does not exist: {root}")
    if not (root / "package.json").exists():
        raise FileNotFoundError(f"CAREER_OPS_ROOT is not a career-ops repo: {root}")
    return root


def onboarding_status() -> dict[str, bool]:
    root = career_root()
    return {
        "cv": (root / "cv.md").exists(),
        "profile": (root / "config" / "profile.yml").exists(),
        "mode_profile": (root / "modes" / "_profile.md").exists(),
        "portals": (root / "portals.yml").exists(),
    }


def run_command(command: list[str], timeout: int | None = None) -> CommandResult:
    root = career_root()
    env = os.environ.copy()
    # Keep env from wrapper, but allow the original repo's .env to be loaded by Node scripts too.
    proc = subprocess.run(
        command,
        cwd=str(root),
        text=True,
        capture_output=True,
        # Node scripts emit UTF-8 (emoji, box-drawing chars). On a non-UTF-8
        # locale (e.g. cp949 on Korean Windows) the default decoder crashes the
        # reader threads and stdout/stderr come back empty/None. Force UTF-8.
        encoding="utf-8",
        errors="replace",
        timeout=timeout or settings.command_timeout_seconds,
        shell=False,
        env=env,
    )
    return CommandResult(   
        ok=proc.returncode == 0,
        command=command,
        cwd=str(root),
        returncode=proc.returncode,
        stdout=proc.stdout or "",
        stderr=proc.stderr or "",
    )


def scan(dry_run: bool = False, verify: bool = False, company: str | None = None) -> CommandResult:
    cmd = ["node", "scan.mjs"]
    if dry_run:
        cmd.append("--dry-run")
    if verify:
        cmd.append("--verify")
    if company:
        cmd.extend(["--company", company])
    return run_command(cmd, timeout=max(settings.command_timeout_seconds, 300 if verify else 180))


def evaluate_jd(jd_text: str, model: str | None = None, no_save: bool = False) -> CommandResult:
    root = career_root()
    (root / "jds").mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".txt", encoding="utf-8", delete=False, dir=root / "jds") as f:
        f.write(jd_text)
        jd_path = f.name
    cmd = ["node", "gemini-eval.mjs", "--file", jd_path]
    if model:
        cmd.extend(["--model", model])
    if no_save:
        cmd.append("--no-save")
    return run_command(cmd, timeout=max(settings.command_timeout_seconds, 300))


def generate_pdf(html: str, filename: str = "cv-web", fmt: str = "a4") -> tuple[CommandResult, str]:
    root = career_root()
    safe = re.sub(r"[^a-zA-Z0-9_.-]+", "-", filename).strip("-_") or "cv-web"
    tmp_dir = root / "tmp" / "web"
    out_dir = root / "output"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    html_path = tmp_dir / f"{safe}.html"
    pdf_path = out_dir / f"{safe}.pdf"
    html_path.write_text(html, encoding="utf-8")
    result = run_command(["node", "generate-pdf.mjs", str(html_path), str(pdf_path), f"--format={fmt}"], timeout=180)
    return result, str(pdf_path)


def run_allowed_script(script: str, args: list[str]) -> CommandResult:
    if script not in ALLOWED_SCRIPTS:
        allowed = ", ".join(sorted(ALLOWED_SCRIPTS))
        raise ValueError(f"Script not allowed: {script}. Allowed: {allowed}")
    return run_command(ALLOWED_SCRIPTS[script] + args)


def list_modes() -> list[dict[str, str]]:
    root = career_root()
    skill = root / ".agents" / "skills" / "career-ops" / "SKILL.md"
    if not skill.exists():
        skill = root / ".claude" / "skills" / "career-ops" / "SKILL.md"
    text = skill.read_text(encoding="utf-8") if skill.exists() else ""
    modes = [
        {"input": "(empty / no args)", "mode": "discovery"},
        {"input": "JD text or URL (no sub-command)", "mode": "auto-pipeline"},
    ]
    seen = {item["input"] for item in modes}
    for input_name, mode in MODE_PATTERN.findall(text):
        if input_name in {"Input", "-------"} or input_name in seen:
            continue
        modes.append({"input": input_name, "mode": mode})
        seen.add(input_name)
    return modes


def resolve_mode(raw_mode: str, invocation: str = "") -> str:
    text = (raw_mode or "").strip()
    known = {item["input"]: item["mode"] for item in list_modes()}
    known.pop("(empty / no args)", None)
    if not text and not invocation.strip():
        return "discovery"
    if text in known:
        return known[text]
    combined = f"{text}\n{invocation}".strip()
    if URL_PATTERN.search(combined) or _looks_like_jd(combined):
        return "auto-pipeline"
    return "discovery"


def _looks_like_jd(text: str) -> bool:
    lower = text.lower()
    if any(keyword in lower for keyword in JD_KEYWORDS):
        return True
    return len(text) > 1200 and ("role" in lower or "company" in lower)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _mode_file(mode: str) -> Path:
    root = career_root()
    path = root / "modes" / f"{mode}.md"
    if not path.exists():
        raise ValueError(f"Unsupported career-ops mode: {mode}")
    return path


def build_discovery_text() -> str:
    return """career-ops -- Command Center

Available commands:
  /career-ops {JD}             AUTO-PIPELINE: evaluate + report + PDF + tracker
  /career-ops pipeline         Process pending URLs from inbox
  /career-ops oferta           Evaluation only A-G
  /career-ops ofertas          Compare and rank multiple offers
  /career-ops contacto         LinkedIn outreach
  /career-ops deep             Deep company research
  /career-ops interview-prep   Company-specific interview prep
  /career-ops pdf              ATS-optimized CV PDF
  /career-ops training         Evaluate course/cert
  /career-ops project          Evaluate portfolio project idea
  /career-ops tracker          Application status overview
  /career-ops apply            Live application assistant
  /career-ops scan             Scan portals for new offers
  /career-ops batch            Batch process offers
  /career-ops patterns         Analyze rejection patterns
  /career-ops followup         Follow-up cadence tracker
"""


def build_agent_prompt(mode: str, invocation: str = "", no_save: bool = False) -> str:
    if mode == "discovery":
        return build_discovery_text()

    root = career_root()
    sections: list[str] = []
    if mode in SHARED_MODES:
        sections.append("# Shared Instructions\n\n" + _read_text(root / "modes" / "_shared.md"))
        profile = root / "modes" / "_profile.md"
        if profile.exists():
            sections.append("# User Profile Overrides\n\n" + _read_text(profile))
    elif mode not in STANDALONE_MODES:
        raise ValueError(f"Unsupported career-ops mode: {mode}")

    sections.append(f"# Mode Instructions: {mode}\n\n" + _read_text(_mode_file(mode)))
    sections.append("# Invocation Data\n\n" + (invocation.strip() or "(no additional input)"))
    if no_save:
        sections.append("# Runtime Constraint\n\nDo not save files or update trackers unless explicitly required to answer.")
    sections.append(
        "# Execution Contract\n\n"
        "Follow the loaded career-ops mode instructions. Use the repository files as source of truth. "
        "Never submit applications; stop at drafts or prepared artifacts for user review."
    )
    return "\n\n---\n\n".join(sections)


def _message_to_dict(message: Any) -> dict[str, Any]:
    if is_dataclass(message):
        return asdict(message)
    if hasattr(message, "__dict__"):
        return dict(message.__dict__)
    return {"repr": repr(message)}


def _assistant_text(message: Any) -> str:
    parts: list[str] = []
    for block in getattr(message, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            parts.append(text)
    return "\n".join(parts)


async def run_agent(
    raw_mode: str = "",
    invocation: str = "",
    model: str | None = None,
    max_turns: int = 20,
    max_budget_usd: float | None = None,
    no_save: bool = False,
) -> dict[str, Any]:
    try:
        from claude_agent_sdk import (
            AgentDefinition,
            AssistantMessage,
            ClaudeAgentOptions,
            ResultMessage,
            SystemMessage,
            query,
        )
    except ImportError as exc:
        raise RuntimeError(
            "claude-agent-sdk is not installed. Run `pip install -r web-wrapper/backend/requirements.txt`."
        ) from exc

    root = career_root()
    mode = resolve_mode(raw_mode, invocation)
    prompt = build_agent_prompt(mode, invocation, no_save=no_save)
    if mode == "discovery":
        return {
            "ok": True,
            "command": ["career-ops", "discovery"],
            "cwd": str(root),
            "returncode": 0,
            "stdout": prompt,
            "stderr": "",
            "mode": mode,
            "session_id": None,
            "messages": [],
        }

    allowed_tools = ["Read", "Glob", "Grep", "WebFetch", "WebSearch"]
    disallowed_tools: list[str] = []
    if no_save:
        allowed_tools.extend(["Bash"])
        disallowed_tools.extend(["Write", "Edit"])
        permission_mode = None
    else:
        allowed_tools.extend(["Write", "Edit", "Bash"])
        permission_mode = "acceptEdits"

    agents = None
    if mode in DELEGATED_MODES:
        worker_prompt = (
            "You are a focused career-ops worker. Execute the injected mode instructions and "
            "return concise, evidence-backed results."
        )
        agents = {
            "career-ops-worker": AgentDefinition(
                description=f"career-ops {mode} worker",
                prompt=worker_prompt,
                tools=allowed_tools,
            )
        }
        allowed_tools.append("Agent")
        prompt = (
            f"Delegate this {mode} run to the career-ops-worker agent with the full instructions below. "
            "Return the worker result and any files changed.\n\n"
            + prompt
        )

    options = ClaudeAgentOptions(
        allowed_tools=allowed_tools,
        permission_mode=permission_mode,
        cwd=str(root),
        model=model,
        max_turns=max_turns,
        max_budget_usd=max_budget_usd,
        disallowed_tools=disallowed_tools,
        agents=agents,
    )

    stdout_parts: list[str] = []
    stderr_parts: list[str] = []
    messages: list[dict[str, Any]] = []
    session_id = None
    returncode = 0

    async for message in query(prompt=prompt, options=options):
        messages.append(_message_to_dict(message))
        if isinstance(message, SystemMessage) and getattr(message, "subtype", None) == "init":
            session_id = getattr(message, "data", {}).get("session_id")
        elif isinstance(message, AssistantMessage):
            text = _assistant_text(message)
            if text:
                stdout_parts.append(text)
        elif isinstance(message, ResultMessage):
            result = getattr(message, "result", None)
            if result:
                stdout_parts.append(str(result))
            subtype = getattr(message, "subtype", None)
            if subtype and subtype not in {"success", "completion"}:
                returncode = 1
                stderr_parts.append(str(subtype))

    return {
        "ok": returncode == 0,
        "command": ["claude-agent-sdk", "career-ops", mode],
        "cwd": str(root),
        "returncode": returncode,
        "stdout": "\n\n".join(part for part in stdout_parts if part),
        "stderr": "\n".join(stderr_parts),
        "mode": mode,
        "session_id": session_id,
        "messages": messages,
        "onboarding": onboarding_status(),
    }


def read_tracker() -> list[TrackerRow]:
    root = career_root()
    path = root / "data" / "applications.md"
    if not path.exists():
        return []
    rows: list[TrackerRow] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.startswith("|"):
            continue
        parts = [p.strip() for p in line.strip().strip("|").split("|")]
        if not parts or parts[0] in {"#", "---", ":---"} or set(parts[0]) <= {"-", ":"}:
            continue
        # Expected: # | Date | Company | Role | Score | Status | PDF | Report
        padded = parts + [""] * (8 - len(parts))
        rows.append(TrackerRow(
            index=padded[0], date=padded[1], company=padded[2], role=padded[3],
            score=padded[4], status=padded[5], pdf=padded[6], report=padded[7], raw=parts
        ))
    return rows


def read_pipeline() -> list[PipelineItem]:
    root = career_root()
    path = root / "data" / "pipeline.md"
    if not path.exists():
        return []
    items: list[PipelineItem] = []
    pattern = re.compile(r"^- \[([ xX])\] (https?://\S+)(?:\s*\|\s*([^|]+))?(?:\s*\|\s*(.+))?")
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = pattern.match(line.strip())
        if not m:
            continue
        items.append(PipelineItem(
            checked=m.group(1).lower() == "x",
            url=m.group(2),
            company=(m.group(3) or "").strip(),
            title=(m.group(4) or "").strip(),
            raw=line,
        ))
    return items
