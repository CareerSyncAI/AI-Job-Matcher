from __future__ import annotations

from app.core.config import get_settings

try:
    from celery import Celery
    settings = get_settings()
    celery_app = Celery("careersync", broker=settings.redis_url, backend=settings.redis_url)
    celery_app.conf.task_default_queue = "resume-processing"
except ImportError:
    class DummyTask:
        def delay(self, *args, **kwargs):
            pass
    class DummyCelery:
        def task(self, *args, **kwargs):
            bind = kwargs.get("bind", False)
            def decorator(f):
                def direct_call(*a, **kw):
                    if bind:
                        return f(DummyTask(), *a, **kw)
                    return f(*a, **kw)
                direct_call.delay = direct_call
                return direct_call
            return decorator
    celery_app = DummyCelery()
