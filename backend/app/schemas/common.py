from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(APIModel):
    message: str


class ErrorBody(APIModel):
    code: str
    message: str
    request_id: str | None = None


class ErrorResponse(APIModel):
    error: ErrorBody


class Identifier(APIModel):
    id: UUID
