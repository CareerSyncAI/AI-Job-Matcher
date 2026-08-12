from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt

from app.core.config import get_settings
from app.models.enums import UserRole


def create_access_token(user_id: UUID, role: UserRole) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.access_token_minutes)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "role": role.value,
            "iat": now,
            "exp": expires_at,
            "iss": "careersync-api",
            "aud": "careersync-frontend",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, settings.access_token_minutes * 60


def decode_access_token(token: str) -> dict[str, str]:
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience="careersync-frontend",
        issuer="careersync-api",
    )


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
