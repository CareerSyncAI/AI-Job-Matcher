from __future__ import annotations

import logging
from app.db.session import engine, SessionLocal
from app.db.base import Base
import app.models.entities  # noqa: F401
from app.models.entities import User

logger = logging.getLogger(__name__)

def init_db() -> None:
    """Ensure all database tables exist and seed default demo data if empty."""
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Database is empty. Running automatic seed...")
            from seed import seed_database
            seed_database()
            logger.info("Database auto-seeded successfully!")
    except Exception as e:
        logger.warning(f"Database auto-init check encountered error: {e}")
    finally:
        db.close()
