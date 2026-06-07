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
    return {
        "cv": bool(cv_md.strip()),
        "profile": bool(profile_yml.strip()),
        "mode_profile": bool(mode_profile_md.strip()),
        "portals": bool(portals_yml.strip()),
    }
