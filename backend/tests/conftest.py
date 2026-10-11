from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure backend root is always on sys.path regardless of how pytest is invoked
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["CAREERSYNC_JWT_SECRET"] = "a" * 32
os.environ["CAREERSYNC_ENVIRONMENT"] = "testing"
os.environ["CAREERSYNC_DATABASE_URL"] = "sqlite://"

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import session as session_module
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    orig_engine = session_module.engine
    session_module.engine = engine
    session_module.SessionLocal.configure(bind=engine)
    db = session_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        session_module.engine = orig_engine
        session_module.SessionLocal.configure(bind=orig_engine)


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
