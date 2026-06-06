"""Agent sandboxing primitives for multi-tenant safety.

Two mechanisms, both bound to a single user's workspace `root`:

1. ``build_career_mcp_server(root)`` — an in-process MCP server exposing a
   ``run_script`` tool. It replaces the agent's ``Bash`` tool: the agent can no
   longer run an arbitrary shell (which could ``cat`` another user's files), only
   a fixed allowlist of repository scripts, inside its own workspace.

2. ``build_workspace_hooks(root)`` — a PreToolUse hook that gates *every* tool
   call (``allowed_tools`` auto-approves built-ins without a prompt, so a hook is
   the only place to enforce this). It denies the built-in file tools
   (Read/Write/Edit/Glob/Grep/NotebookEdit) when their path argument resolves
   outside the workspace, and denies any disabled tool (Bash) outright.
"""

from pathlib import Path
from typing import Any

from claude_agent_sdk import HookMatcher, create_sdk_mcp_server, tool

# Scripts the agent may run beyond career_ops.ALLOWED_SCRIPTS (the /api/script
# route deliberately does not expose these; the agent needs them for pipelines).
_EXTRA_SCRIPTS: dict[str, list[str]] = {
    "gemini-eval": ["node", "gemini-eval.mjs"],
    "generate-pdf": ["node", "generate-pdf.mjs"],
}

# Tools whose path argument(s) must stay inside the workspace.
_PATH_FIELDS: dict[str, list[str]] = {
    "Read": ["file_path"],
    "Write": ["file_path"],
    "Edit": ["file_path"],
    "MultiEdit": ["file_path"],
    "NotebookEdit": ["notebook_path"],
    "Glob": ["path"],
    "Grep": ["path"],
}

# Tools the agent must never use (shell removed in favour of run_script).
_BLOCKED_TOOLS = {"Bash", "BashOutput", "KillBash"}


def script_key_list() -> list[str]:
    """Sorted allowlist of script keys the agent may run via run_script."""
    from app.services.career_ops import ALLOWED_SCRIPTS  # lazy: avoid import cycle

    return sorted(set(ALLOWED_SCRIPTS) | set(_EXTRA_SCRIPTS))


def _resolve_inside(root: Path, raw: str) -> bool:
    """True if `raw` (a path) resolves inside `root`. Follows symlinks, so an
    escape via a symlinked dir (e.g. node_modules) is denied too."""
    try:
        p = Path(raw)
        target = (p if p.is_absolute() else root / p).resolve()
        target.relative_to(root.resolve())
        return True
    except (ValueError, OSError, RuntimeError):
        return False


def _arg_escapes(root: Path, arg: str) -> bool:
    """True if a script argument is a path pointing outside the workspace.
    Flags (``-x``) and plain tokens (no separator) are treated as safe values."""
    if arg.startswith("-") or ("/" not in arg and "\\" not in arg):
        return False
    return not _resolve_inside(root, arg)


def build_career_mcp_server(root: Path):
    """In-process MCP server exposing run_script bound to this user's workspace."""

    @tool(
        "run_script",
        "Run an allowed career-ops repository script inside your workspace. Use this "
        "instead of a shell (no shell is available). `name` is the script key, `args` "
        "are command-line arguments.",
        {"name": str, "args": list[str]},
    )
    async def run_script(args: dict[str, Any]) -> dict[str, Any]:
        from app.services.career_ops import ALLOWED_SCRIPTS, run_command  # lazy

        name = str(args.get("name", "")).strip()
        script_args = [str(a) for a in (args.get("args") or [])]
        script_map = {**ALLOWED_SCRIPTS, **_EXTRA_SCRIPTS}

        if name not in script_map:
            allowed = ", ".join(sorted(script_map))
            return _err(f"허용되지 않은 스크립트: {name!r}. 허용 키: {allowed}")
        bad = next((a for a in script_args if _arg_escapes(root, a)), None)
        if bad is not None:
            return _err(f"워크스페이스 밖 경로 인자 거부: {bad!r}")

        try:
            result = run_command(script_map[name] + script_args, root)
        except Exception as exc:  # timeout, spawn failure, etc.
            return _err(f"스크립트 실행 실패: {exc}")

        text = result.stdout or ""
        if result.stderr:
            text += f"\n[stderr]\n{result.stderr}"
        return {
            "content": [{"type": "text", "text": text or f"(exit {result.returncode})"}],
            "is_error": result.returncode != 0,
        }

    return create_sdk_mcp_server("career", tools=[run_script])


def build_workspace_hooks(root: Path) -> dict:
    """PreToolUse hooks dict that jails file tools to `root` and blocks the shell."""
    root_resolved = root.resolve()

    async def pre_tool(input_data: dict, tool_use_id: str | None, context: Any) -> dict:
        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input") or {}
        reason = _deny_reason(root_resolved, tool_name, tool_input)
        if reason:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }
        return {}

    return {"PreToolUse": [HookMatcher(matcher=None, hooks=[pre_tool])]}


def _deny_reason(root: Path, tool_name: str, tool_input: dict) -> str | None:
    if tool_name in _BLOCKED_TOOLS:
        return f"{tool_name} 도구는 비활성화되어 있습니다. 스크립트는 run_script 툴을 사용하세요."
    for field in _PATH_FIELDS.get(tool_name, []):
        raw = tool_input.get(field)
        if raw and not _resolve_inside(root, str(raw)):
            return f"워크스페이스 밖 경로 접근 차단: {raw!r}"
    if tool_name == "Glob":
        pattern = str(tool_input.get("pattern", ""))
        if pattern.startswith("/") or (len(pattern) > 1 and pattern[1] == ":"):
            return f"절대경로 패턴 차단: {pattern!r}"
    return None


def _err(message: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": message}], "is_error": True}
