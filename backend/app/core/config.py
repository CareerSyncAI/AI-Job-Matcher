from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-only configuration; no secret has a source-code default."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CAREERSYNC_",
        case_sensitive=False,
        extra="ignore",
    )

    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://careersync:careersync@localhost:5432/careersync"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = Field(default=15, ge=5, le=60)
    refresh_token_days: int = Field(default=14, ge=1, le=30)
    cors_origins: list[str] | str = ["http://localhost:3000"]
    upload_directory: Path = Path("../career-sync-storage/uploads")
    max_upload_bytes: int = 10 * 1024 * 1024
    secure_cookies: bool = False
    enable_worker: bool = False
    auto_seed_demo_data: bool = False
    ai_service_url: str = "http://localhost:8001"
    ai_service_api_key: str = "careersync-internal-ai-service-key-dev"
    semantic_matcher: str = "baseline"
    ai_semantic_timeout_seconds: float = Field(default=15.0, gt=0, le=60)

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str, info) -> str:
        env = info.data.get("environment", "development")
        if str(env).lower() == "production":
            if "CHANGE_ME" in value or "super-secret" in value:
                raise ValueError("Production environment cannot use default or placeholder JWT secret.")
        return value

    @field_validator("ai_service_api_key")
    @classmethod
    def validate_ai_service_api_key(cls, value: str, info) -> str:
        env = info.data.get("environment", "development")
        if str(env).lower() == "production":
            if "careersync-internal-ai-service-key-dev" in value or "CHANGE_ME" in value:
                raise ValueError("Production environment cannot use default or placeholder AI service API key.")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                import json
                try:
                    return json.loads(value)
                except Exception:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"



@lru_cache
def get_settings() -> Settings:
    return Settings()
