from __future__ import annotations

from uuid import UUID

from pydantic import EmailStr, Field

from app.models.enums import UserRole
from app.schemas.common import APIModel


class RegisterRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.CANDIDATE
    organization_name: str | None = Field(default=None, max_length=255)


class LoginRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(APIModel):
    id: UUID
    email: EmailStr
    role: UserRole
    is_active: bool


class TokenResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class ForgotPasswordRequest(APIModel):
    email: EmailStr


class ChangePasswordRequest(APIModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class UpdateProfileRequest(APIModel):
    name: str | None = Field(default=None, max_length=255)
    headline: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    organization_name: str | None = Field(default=None, max_length=255)
    skills: list[str] | None = Field(default=None)
    bio: str | None = Field(default=None, max_length=1000)


class UserProfileDetailResponse(APIModel):
    id: UUID
    email: EmailStr
    role: UserRole
    is_active: bool
    name: str | None = None
    headline: str | None = None
    location: str | None = None
    organization_name: str | None = None
    skills: list[str] = Field(default_factory=list)
    bio: str | None = None
