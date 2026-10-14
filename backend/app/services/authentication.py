from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import CandidateProfile, RecruiterProfile, RefreshSession, User
from app.models.enums import UserRole
from app.schemas.auth import RegisterRequest
from app.security.passwords import hash_password, verify_password
from app.security.tokens import create_access_token, hash_refresh_token, new_refresh_token


class AuthenticationService:
    @staticmethod
    def register(db: Session, payload: RegisterRequest) -> User:
        email = str(payload.email).casefold()
        if payload.role is UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin accounts cannot be self-registered.")
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email.")
        user = User(email=email, password_hash=hash_password(payload.password), role=payload.role)
        db.add(user)
        db.flush()
        if payload.role is UserRole.RECRUITER:
            db.add(RecruiterProfile(user_id=user.id, organization_name=payload.organization_name))
        else:
            db.add(CandidateProfile(user_id=user.id, email=email))
        return user

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> User:
        user = db.query(User).filter(User.email == email.casefold()).one_or_none()
        if not user or not user.is_active or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
        return user

    @staticmethod
    def create_session(db: Session, user: User) -> tuple[str, str, int]:
        settings = get_settings()
        refresh_token = new_refresh_token()
        session = RefreshSession(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
        db.add(session)
        access_token, expires_in = create_access_token(user.id, user.role)
        return access_token, refresh_token, expires_in

    @staticmethod
    def rotate_refresh_token(db: Session, refresh_token: str) -> tuple[User, str, str, int]:
        now = datetime.now(UTC)
        existing = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(refresh_token))
            .one_or_none()
        )
        if not existing or existing.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is invalid or expired.")
        expires_at = existing.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is invalid or expired.")
        user = existing.user
        existing.revoked_at = now
        access_token, next_refresh, expires_in = AuthenticationService.create_session(db, user)
        db.flush()
        replacement = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(next_refresh))
            .one()
        )
        existing.replaced_by_id = replacement.id
        return user, access_token, next_refresh, expires_in

    @staticmethod
    def revoke_refresh_token(db: Session, refresh_token: str) -> None:
        existing = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(refresh_token))
            .one_or_none()
        )
        if existing and existing.revoked_at is None:
            existing.revoked_at = datetime.now(UTC)

    @staticmethod
    def revoke_all_user_sessions(db: Session, user_id: UUID) -> int:
        now = datetime.now(UTC)
        sessions = (
            db.query(RefreshSession)
            .filter(RefreshSession.user_id == user_id, RefreshSession.revoked_at.is_(None))
            .all()
        )
        for s in sessions:
            s.revoked_at = now
        return len(sessions)
