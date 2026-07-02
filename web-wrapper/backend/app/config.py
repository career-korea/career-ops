
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    career_ops_root: str
    workspaces_root: str = ""
    database_url: str = ""
    anthropic_api_key: str = ""
    backend_cors_origins: str = "http://localhost:5173"
    backend_cors_origin_regex: str = r"https://.*\.vercel\.app"
    command_timeout_seconds: int = 180
    session_cookie_samesite: str = ""
    session_cookie_secure: str = ""
    # Google Identity (ID token) sign-in. Same Client ID as the frontend's
    # VITE_GOOGLE_CLIENT_ID. Empty disables the /api/auth/google route.
    google_oauth_client_id: str = ""
    # Per-user daily LLM cost ceiling (USD), by plan. Agent endpoints are blocked
    # once a user's same-day usage reaches their plan's limit; resets at UTC
    # midnight. Free users hitting the cap are prompted to buy a pass; paid users
    # just wait for the daily reset. Env-overridable.
    daily_budget_usd: float = 2.0
    paid_daily_budget_usd: float = 10.0

    @property
    def root_path(self) -> Path:
        return Path(self.career_ops_root).expanduser().resolve()

    @property
    def workspaces_path(self) -> Path:
        # Per-user workspaces live on a persistent volume in production
        # (Railway mounts /data). Falls back to a sibling dir for local dev.
        if self.workspaces_root:
            return Path(self.workspaces_root).expanduser().resolve()
        return self.root_path.parent / "career-ops-ws"

    @property
    def cors_origins(self) -> list[str]:
        return [x.strip() for x in self.backend_cors_origins.split(",") if x.strip()]

settings = Settings()
