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


def test_change_password_success_and_invalidation(client):
    email = "passchange@example.com"
    old_pw = "OldPassword123!"
    new_pw = "NewSecurePassword456!"

    # 1. Register and login
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": old_pw, "role": "candidate"},
    )
    assert reg_res.status_code == 201

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": old_pw},
    )
    assert login_res.status_code == 200
    access_token = login_res.json()["access_token"]
    old_refresh_cookie = login_res.cookies.get("careersync_refresh")
    assert old_refresh_cookie is not None

    # 2. Change password successfully
    change_res = client.post(
        "/api/v1/auth/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"current_password": old_pw, "new_password": new_pw},
    )
    assert change_res.status_code == 200
    assert change_res.json() == {"message": "Password successfully updated."}

    # 3. Old refresh token must be invalidated (revoked)
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"careersync_refresh": old_refresh_cookie},
    )
    assert refresh_res.status_code == 401

    # 4. Login with old password must fail
    old_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": old_pw},
    )
    assert old_login_res.status_code == 401

    # 5. Login with new password must succeed
    new_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": new_pw},
    )
    assert new_login_res.status_code == 200
    assert "access_token" in new_login_res.json()


def test_change_password_wrong_current_password(client):
    email = "wrongpw@example.com"
    pw = "CorrectPassword123!"

    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": pw, "role": "candidate"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pw},
    )
    access_token = login_res.json()["access_token"]

    change_res = client.post(
        "/api/v1/auth/password",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"current_password": "IncorrectPassword999!", "new_password": "SomeOtherPassword!"},
    )
    assert change_res.status_code == 400
    assert "incorrect" in change_res.json()["error"]["message"].lower()


def test_change_password_unauthenticated(client):
    change_res = client.post(
        "/api/v1/auth/password",
        json={"current_password": "OldPassword123!", "new_password": "NewPassword123!"},
    )
    assert change_res.status_code == 401
