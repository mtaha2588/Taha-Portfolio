"""Application settings, read from environment variables (and a local .env file)."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # Optional regex for extra allowed origins, e.g. Vercel preview deployments:
    # ^https://your-project-[a-z0-9-]+\.vercel\.app$
    cors_origin_regex: str = ""
    trust_proxy: bool = False
    database_url: str = "sqlite:///./portfolio.db"
    admin_api_key: str = ""

    # SMTP (optional)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    contact_notify_email: str = ""

    # Real project services (optional). Empty = use the built-in demo implementation.
    avalanche_service_url: str = ""
    automation_agent_service_url: str = ""
    car_sales_service_url: str = ""

    # Abuse protection
    contact_rate_limit: int = 5  # messages per window per IP
    contact_rate_window_s: int = 600
    demo_rate_limit: int = 30  # demo calls per window per IP
    demo_rate_window_s: int = 60
    max_body_bytes: int = 64_000

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value):
        # Accept "a,b,c" from env vars as well as a JSON list.
        if isinstance(value, str) and not value.strip().startswith("["):
            return [v.strip().rstrip("/") for v in value.split(",") if v.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def email_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from and self.contact_notify_email)


@lru_cache
def get_settings() -> Settings:
    return Settings()
