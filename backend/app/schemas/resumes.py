from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.models.enums import AttentionReason, ProcessingStatus
from app.schemas.common import APIModel


class ResumeResponse(APIModel):
    id: UUID
    mime_type: str
    byte_size: int
    processing_status: ProcessingStatus
    needs_attention_reason: AttentionReason | None
    uploaded_at: datetime

