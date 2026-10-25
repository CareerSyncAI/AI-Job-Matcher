"""Shared test fixtures for CareerSync AI Services tests."""

from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient

from src.api.app import app, DEFAULT_DEV_KEY


@pytest.fixture
def client():
    """Environment-aware API test client fixture.

    Uses the CI/configured AI_SERVICE_API_KEY when provided in the environment,
    falling back to DEFAULT_DEV_KEY for standard local test runs.
    """
    test_key = os.getenv("AI_SERVICE_API_KEY", DEFAULT_DEV_KEY)
    return TestClient(app, headers={"X-AI-Service-Key": test_key})
