from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Application, ApplicationStatusHistory
from app.models.enums import ApplicationStatus

ALLOWED_STATUS_TRANSITIONS: dict[ApplicationStatus, frozenset[ApplicationStatus]] = {
    ApplicationStatus.NEW: frozenset({ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED}),
    ApplicationStatus.UNDER_REVIEW: frozenset({ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED}),
    ApplicationStatus.SHORTLISTED: frozenset({ApplicationStatus.INTERVIEWING, ApplicationStatus.REJECTED}),
    ApplicationStatus.INTERVIEWING: frozenset({ApplicationStatus.OFFERED, ApplicationStatus.REJECTED}),
    ApplicationStatus.OFFERED: frozenset({ApplicationStatus.HIRED, ApplicationStatus.REJECTED}),
    ApplicationStatus.HIRED: frozenset(),
    ApplicationStatus.REJECTED: frozenset(),
}


def can_transition_application_status(
    current_status: ApplicationStatus, next_status: ApplicationStatus
) -> bool:
    return next_status in ALLOWED_STATUS_TRANSITIONS[current_status]


def record_application_status_change(
    db: Session,
    application: Application,
    *,
    from_status: ApplicationStatus | None,
    to_status: ApplicationStatus,
    changed_by_user_id: UUID | None,
) -> None:
    application.status = to_status
    db.add(
        ApplicationStatusHistory(
            application_id=application.id,
            from_status=from_status,
            to_status=to_status,
            changed_by_user_id=changed_by_user_id,
            changed_at=datetime.now(UTC),
        )
    )
