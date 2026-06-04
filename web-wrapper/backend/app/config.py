
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    career_ops_root: str
    database_url: str = ""
    backend_cors_origins: str = "http://localhost:5173"
    backend_cors_origin_regex: str = r"https://.*\.vercel\.app"
    command_timeout_seconds: int = 180
    session_cookie_samesite: str = ""
    session_cookie_secure: str = ""

    @property
    def root_path(self) -> Path:
        return Path(self.career_ops_root).expanduser().resolve()

    @property
    def cors_origins(self) -> list[str]:
        return [x.strip() for x in self.backend_cors_origins.split(",") if x.strip()]

settings = Settings()
