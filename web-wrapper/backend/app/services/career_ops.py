
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable

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


def career_root() -> Path:
    root = settings.root_path
    if not root.exists():
        raise FileNotFoundError(f"CAREER_OPS_ROOT does not exist: {root}")
    if not (root / "package.json").exists():
        raise FileNotFoundError(f"CAREER_OPS_ROOT is not a career-ops repo: {root}")
    return root


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
    modes = []
    for input_name, mode in MODE_PATTERN.findall(text):
        if input_name in {"Input", "-------"}:
            continue
        modes.append({"input": input_name, "mode": mode})
    return modes


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
