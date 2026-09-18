from __future__ import annotations

from uuid import uuid4

from app.models.enums import UserRole
from app.security.passwords import hash_password, verify_password
from app.security.tokens import (
    create_access_token,
    decode_access_token,
    hash_refresh_token,
    new_refresh_token,
)


def test_password_hashing():
    pw = "SuperSecurePassword123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_token_roundtrip():
    user_id = uuid4()
    token, expires_in = create_access_token(user_id, UserRole.RECRUITER)
    assert expires_in > 0
    decoded = decode_access_token(token)
    assert decoded["sub"] == str(user_id)
    assert decoded["role"] == UserRole.RECRUITER.value


def test_refresh_token_generation():
    token1 = new_refresh_token()
    token2 = new_refresh_token()
    assert token1 != token2
    assert hash_refresh_token(token1) == hash_refresh_token(token1)
