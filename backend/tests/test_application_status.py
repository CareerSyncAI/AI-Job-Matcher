from __future__ import annotations

import pytest

from app.models.enums import ApplicationStatus as Status
from app.services.application_status import can_transition_application_status


@pytest.mark.parametrize(
    ("current", "next_status"),
    [
        (Status.NEW, Status.UNDER_REVIEW),
        (Status.UNDER_REVIEW, Status.SHORTLISTED),
        (Status.SHORTLISTED, Status.INTERVIEWING),
        (Status.INTERVIEWING, Status.OFFERED),
        (Status.OFFERED, Status.HIRED),
        (Status.NEW, Status.REJECTED),
        (Status.UNDER_REVIEW, Status.REJECTED),
        (Status.SHORTLISTED, Status.REJECTED),
        (Status.INTERVIEWING, Status.REJECTED),
        (Status.OFFERED, Status.REJECTED),
    ],
)
def test_valid_application_status_transitions(current, next_status):
    assert can_transition_application_status(current, next_status)


@pytest.mark.parametrize(
    ("current", "next_status"),
    [
        (Status.NEW, Status.SHORTLISTED),
        (Status.UNDER_REVIEW, Status.OFFERED),
        (Status.SHORTLISTED, Status.UNDER_REVIEW),
        (Status.OFFERED, Status.SHORTLISTED),
        (Status.HIRED, Status.REJECTED),
        (Status.REJECTED, Status.UNDER_REVIEW),
    ],
)
def test_invalid_application_status_transitions(current, next_status):
    assert not can_transition_application_status(current, next_status)
