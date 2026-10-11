from __future__ import annotations

import logging
from app.db.session import engine, SessionLocal
from app.db.base import Base
import app.models.entities  # noqa: F401
from app.models.entities import User

logger = logging.getLogger(__name__)

def init_db() -> None:
    """Ensure all database tables exist and optionally seed default demo data if enabled."""
    from app.core.config import get_settings

    settings = get_settings()
    Base.metadata.create_all(bind=engine)

    if settings.is_production:
        logger.info("Production mode: automatic demo data seeding is strictly disabled.")
        return

    if not settings.auto_seed_demo_data:
        logger.debug("Database auto-seeding is disabled (auto_seed_demo_data=False).")
        return

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Database is empty and auto_seed_demo_data is enabled. Running development seed...")
            from seed import seed_database
            seed_database()
            logger.info("Database auto-seeded successfully!")
    except Exception as e:
        logger.warning(f"Database auto-init check encountered error: {e}")
    finally:
        db.close()

