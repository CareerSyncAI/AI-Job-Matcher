from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.schemas.common import MessageResponse
from app.services.audit import record_audit_event
from app.services.authentication import AuthenticationService

router = APIRouter(prefix="/auth", tags=["authentication"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key="careersync_refresh",
        value=refresh_token,
        httponly=True,
        secure=settings.secure_cookies or settings.is_production,
        samesite="lax",
        max_age=settings.refresh_token_days * 24 * 60 * 60,
        path=f"{settings.api_v1_prefix}/auth",
    )


def _token_response(user: User, token: str, expires_in: int) -> TokenResponse:
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> User:
    user = AuthenticationService.register(db, payload)
    record_audit_event(
        db,
        action="account_registered",
        resource_type="user",
        actor_user_id=user.id,
        resource_id=user.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    user = AuthenticationService.authenticate(db, str(payload.email), payload.password)
    access_token, refresh_token, expires_in = AuthenticationService.create_session(db, user)
    record_audit_event(
        db,
        action="login",
        resource_type="user",
        actor_user_id=user.id,
        resource_id=user.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return _token_response(user, access_token, expires_in)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    request: Request,
    refresh_token: str | None = Cookie(default=None, alias="careersync_refresh"),
    db: Session = Depends(get_db),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is required.")
    user, access_token, next_refresh, expires_in = AuthenticationService.rotate_refresh_token(db, refresh_token)
    record_audit_event(
        db,
        action="refresh_rotated",
        resource_type="user",
        actor_user_id=user.id,
        resource_id=user.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    _set_refresh_cookie(response, next_refresh)
    return _token_response(user, access_token, expires_in)


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    request: Request,
    refresh_token: str | None = Cookie(default=None, alias="careersync_refresh"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if refresh_token:
        AuthenticationService.revoke_refresh_token(db, refresh_token)
    record_audit_event(
        db,
        action="logout",
        resource_type="user",
        actor_user_id=current_user.id,
        resource_id=current_user.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    response.delete_cookie("careersync_refresh", path=f"{get_settings().api_v1_prefix}/auth")
    return MessageResponse(message="Logged out.")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
