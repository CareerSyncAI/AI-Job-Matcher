from __future__ import annotations

import logging


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def mask_email(email: str | None) -> str:
    """Mask email address for privacy-safe logging (e.g. j***e@example.com)."""
    if not email or "@" not in email:
        return "***"
    local_part, domain = email.split("@", 1)
    if len(local_part) <= 1:
        masked_local = "*"
    elif len(local_part) == 2:
        masked_local = local_part[0] + "*"
    else:
        masked_local = local_part[0] + "***" + local_part[-1]
    return f"{masked_local}@{domain}"
