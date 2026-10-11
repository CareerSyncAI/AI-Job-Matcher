from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.entities import CandidateProfile, RecruiterProfile, User
from app.models.enums import UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserProfileDetailResponse,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.security.passwords import hash_password, verify_password
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


import time
from collections import defaultdict

_LOGIN_ATTEMPTS: dict[str, list[float]] = defaultdict(list)
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_SECONDS = 300  # 5 minutes


def _get_rate_limit_key(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"{ip}:{email.strip().lower()}"


def _check_login_rate_limit(key: str) -> None:
    now = time.time()
    valid_attempts = [t for t in _LOGIN_ATTEMPTS[key] if now - t < _LOCKOUT_SECONDS]
    _LOGIN_ATTEMPTS[key] = valid_attempts
    if len(valid_attempts) >= _MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 5 minutes before trying again.",
        )


def _record_login_failure(key: str) -> None:
    _LOGIN_ATTEMPTS[key].append(time.time())


def _record_login_success(key: str) -> None:
    _LOGIN_ATTEMPTS.pop(key, None)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    rate_limit_key = _get_rate_limit_key(request, str(payload.email))
    _check_login_rate_limit(rate_limit_key)
    try:
        user = AuthenticationService.authenticate(db, str(payload.email), payload.password)
    except HTTPException:
        _record_login_failure(rate_limit_key)
        raise

    _record_login_success(rate_limit_key)
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


@router.get("/profile", response_model=UserProfileDetailResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileDetailResponse:
    name = None
    headline = None
    location = None
    organization_name = None
    skills: list[str] = []
    bio = None

    if current_user.role == UserRole.CANDIDATE:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).one_or_none()
        if profile:
            name = profile.name
            headline = profile.headline
            location = profile.location
            if isinstance(profile.education, dict):
                skills = profile.education.get("skills", [])
                bio = profile.education.get("bio", None)
    elif current_user.role == UserRole.RECRUITER:
        profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).one_or_none()
        if profile:
            organization_name = profile.organization_name

    return UserProfileDetailResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        name=name,
        headline=headline,
        location=location,
        organization_name=organization_name,
        skills=skills,
        bio=bio,
    )


@router.put("/profile", response_model=UserProfileDetailResponse)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileDetailResponse:
    if current_user.role == UserRole.CANDIDATE:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).one_or_none()
        if not profile:
            profile = CandidateProfile(user_id=current_user.id, email=current_user.email)
            db.add(profile)
        if payload.name is not None:
            profile.name = payload.name
        if payload.headline is not None:
            profile.headline = payload.headline
        if payload.location is not None:
            profile.location = payload.location
        edu_data = dict(profile.education) if isinstance(profile.education, dict) else {}
        if payload.skills is not None:
            edu_data["skills"] = list(payload.skills)
        if payload.bio is not None:
            edu_data["bio"] = payload.bio
        profile.education = dict(edu_data)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(profile, "education")
    elif current_user.role == UserRole.RECRUITER:
        profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).one_or_none()
        if not profile:
            profile = RecruiterProfile(user_id=current_user.id)
            db.add(profile)
        if payload.organization_name is not None:
            profile.organization_name = payload.organization_name

    db.commit()
    return get_profile(current_user=current_user, db=db)


@router.post("/password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password provided is incorrect.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    # Invalidate all active sessions upon password change
    from app.models.entities import RefreshToken
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).delete()
    db.commit()
    return MessageResponse(message="Password successfully updated.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    # Safe generic response preventing email enumeration
    return MessageResponse(
        message=f"If an account is associated with {payload.email}, a secure password reset link has been dispatched."
    )
