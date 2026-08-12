from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import AuditEvent


def record_audit_event(
    db: Session,
    *,
    action: str,
    resource_type: str,
    actor_user_id: UUID | None = None,
    resource_id: UUID | None = None,
    request_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    """Append an event; callers commit it in their own transaction."""

    event = AuditEvent(
        action=action,
        resource_type=resource_type,
        actor_user_id=actor_user_id,
        resource_id=resource_id,
        request_id=request_id,
        metadata_json=metadata,
    )
    db.add(event)
    return event
