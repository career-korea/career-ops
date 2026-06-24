"""Per-user workspace provisioning for multi-tenant isolation.

The original career-ops `.mjs` scripts resolve every data path from their own
`__dirname` (e.g. `scan.mjs`, `gemini-eval.mjs`, `merge-tracker.mjs`), so changing
the process `cwd` alone does NOT redirect their output. To isolate users we give
each one a real workspace directory that contains the scripts (copied/symlinked
from the base repo) plus their own writable `data/`, `reports/`, `output/`, etc.

System layer (scripts, fonts, templates, node_modules, shared modes) is symlinked
back to the base repo so it stays read-only and auto-updates. User layer (cv.md,
config/profile.yml, modes/_profile.md, portals.yml, and all generated output) is
materialized per user.
"""

import os
import shutil
from collections.abc import Mapping
from pathlib import Path

from app.config import settings

# Directories that hold per-user generated content. Never symlinked.
WRITABLE_DIRS = ["data", "reports", "output", "jds", "interview-prep", "batch"]
# Root-level files that come from the user's DB-stored setup.
USER_ROOT_FILES = {"cv.md", "portals.yml"}
# Entries handled specially (mixed system/user content) — not blanket-linked.
SPECIAL_ENTRIES = {"modes", "config"} | USER_ROOT_FILES
# Never copy/link these from the base repo: VCS, the web wrapper itself, build
# artifacts, and virtualenvs are irrelevant to the career-ops scripts and would
# bloat every workspace.
SKIP_ENTRIES = {
    ".git", "__pycache__", ".workspaces", "career-ops-ws",
    "web-wrapper", ".github", ".venv", "venv", "dist", "tmp",
}
# Large, read-only dependency tree: symlink it (never written by the scripts)
# instead of copying it into every workspace.
SYMLINK_ENTRIES = {"node_modules"}

PROVISION_MARKER = ".provisioned"

# Agent-generated files that are DB-backed (restored before each run, snapshotted
# after). Exact files + glob patterns, all relative to the workspace root.
PERSIST_FILES = [
    "data/applications.md",
    "data/follow-ups.md",
    "data/pipeline.md",
    "data/scan-history.tsv",
]
PERSIST_GLOBS = ["reports/*.md", "interview-prep/*.md"]
# Skip pathological blobs so a runaway file can't bloat the DB row.
MAX_PERSIST_BYTES = 1_000_000


def _scaffold_if_missing(path: Path, default: str) -> None:
    """Write default content to path only when the file doesn't already exist."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(default, encoding="utf-8")


def base_root() -> Path:
    return settings.root_path


def workspace_path(user_id: int) -> Path:
    return settings.workspaces_path / str(user_id)


def _copy(src: Path, dst: Path) -> None:
    """Copy src->dst (file or tree). Idempotent. System files are copied, not
    symlinked, so an agent writing through the workspace can only corrupt the
    user's own copy — never the shared base repo or another user's files."""
    if dst.exists() or dst.is_symlink():
        return
    if src.is_dir():
        shutil.copytree(src, dst, symlinks=True)
    else:
        shutil.copy2(src, dst)


def _symlink(src: Path, dst: Path) -> None:
    """Symlink src->dst; fall back to a copy when symlinks are unavailable
    (e.g. local Windows without privilege). Used only for node_modules."""
    if dst.exists() or dst.is_symlink():
        return
    try:
        os.symlink(src, dst, target_is_directory=src.is_dir())
    except OSError:
        _copy(src, dst)


def _provision_entry(src: Path, dst: Path) -> None:
    if src.name in SYMLINK_ENTRIES:
        _symlink(src, dst)
    else:
        _copy(src, dst)


def _provision_modes(base: Path, ws: Path) -> None:
    """modes/ mixes system files (_shared.md, oferta.md, de/, fr/, ...) with the
    user's _profile.md. Make it a real dir, link the system files, leave
    _profile.md to be materialized from the DB."""
    base_modes = base / "modes"
    ws_modes = ws / "modes"
    ws_modes.mkdir(exist_ok=True)
    if not base_modes.exists():
        return
    for entry in base_modes.iterdir():
        if entry.name == "_profile.md":
            continue
        _copy(entry, ws_modes / entry.name)


def _provision_config(base: Path, ws: Path) -> None:
    """config/ holds the user's profile.yml plus system examples."""
    ws_config = ws / "config"
    ws_config.mkdir(exist_ok=True)
    base_config = base / "config"
    if not base_config.exists():
        return
    for entry in base_config.iterdir():
        if entry.name == "profile.yml":
            continue
        _copy(entry, ws_config / entry.name)


def provision_workspace(user_id: int) -> Path:
    """Build (idempotently) the per-user workspace skeleton and return its path."""
    ws = workspace_path(user_id)
    if (ws / PROVISION_MARKER).exists():
        return ws

    base = base_root()
    ws.mkdir(parents=True, exist_ok=True)

    writable = set(WRITABLE_DIRS)
    for entry in base.iterdir():
        name = entry.name
        if name in writable or name in SPECIAL_ENTRIES or name in SKIP_ENTRIES:
            continue
        _provision_entry(entry, ws / name)

    for d in WRITABLE_DIRS:
        (ws / d).mkdir(parents=True, exist_ok=True)
    (ws / "batch" / "tracker-additions").mkdir(parents=True, exist_ok=True)

    _provision_modes(base, ws)
    _provision_config(base, ws)

    (ws / PROVISION_MARKER).write_text("1", encoding="utf-8")
    return ws


def materialize_setup(
    user_id: int,
    cv_md: str,
    profile_yml: str,
    mode_profile_md: str,
    portals_yml: str,
) -> dict[str, bool]:
    """Write the user's DB-stored setup into their workspace so the scripts and
    agent read them as repo files. Returns onboarding completeness flags."""
    ws = provision_workspace(user_id)
    writes = [
        (ws / "cv.md", cv_md),
        (ws / "config" / "profile.yml", profile_yml),
        (ws / "modes" / "_profile.md", mode_profile_md),
        (ws / "portals.yml", portals_yml),
    ]
    for path, content in writes:
        if content.strip():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
    _scaffold_if_missing(
        ws / "data" / "pipeline.md",
        "# Pipeline\n\n## Pending\n\n## Processed\n",
    )
    _scaffold_if_missing(
        ws / "data" / "applications.md",
        "# Applications Tracker\n\n"
        "| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n"
        "|---|------|---------|------|-------|--------|-----|--------|-------|\n",
    )
    _scaffold_if_missing(
        ws / "data" / "scan-history.tsv",
        "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n",
    )
    return {
        "cv": bool(cv_md.strip()),
        "profile": bool(profile_yml.strip()),
        "mode_profile": bool(mode_profile_md.strip()),
        "portals": bool(portals_yml.strip()),
    }


def _safe_workspace_target(ws: Path, rel_path: str) -> Path | None:
    """Resolve a stored relative path to a file inside the workspace, rejecting
    absolute paths, drive letters, and traversal that escapes the workspace."""
    rel = (rel_path or "").strip().replace("\\", "/")
    candidate = Path(rel)
    if not rel or candidate.is_absolute() or candidate.drive:
        return None
    target = (ws / candidate).resolve()
    ws_resolved = ws.resolve()
    if target != ws_resolved and ws_resolved not in target.parents:
        return None
    return target


def restore_files(user_id: int, items) -> None:
    """Write DB-backed files (path, content) into the user's workspace so the agent
    can read them. `items` is an iterable of mappings ({path, content}) or tuples."""
    ws = provision_workspace(user_id)
    for item in items:
        if isinstance(item, Mapping):
            rel_path, content = item.get("path"), item.get("content")
        else:
            rel_path, content = item
        target = _safe_workspace_target(ws, rel_path)
        if target is None:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content or "", encoding="utf-8")


def snapshot_files(user_id: int) -> list[tuple[str, str]]:
    """Read the tracked generated files from the workspace and return them as
    (relative-posix-path, content) for DB persistence. Skips oversized blobs."""
    ws = provision_workspace(user_id)
    out: list[tuple[str, str]] = []
    seen: set[str] = set()

    def add(path: Path) -> None:
        try:
            if not path.is_file() or path.stat().st_size > MAX_PERSIST_BYTES:
                return
            rel = path.relative_to(ws).as_posix()
        except (OSError, ValueError):
            return
        if rel in seen:
            return
        seen.add(rel)
        out.append((rel, path.read_text(encoding="utf-8", errors="replace")))

    for rel in PERSIST_FILES:
        add(ws / rel)
    for pattern in PERSIST_GLOBS:
        for match in sorted(ws.glob(pattern)):
            add(match)
    return out
