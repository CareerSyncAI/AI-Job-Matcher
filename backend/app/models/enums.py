from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class JobStatus(StrEnum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    ARCHIVED = "archived"


class ApplicationStatus(StrEnum):
    NEW = "new"
    UNDER_REVIEW = "under_review"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"


class ProcessingStatus(StrEnum):
    QUEUED = "queued"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    NEEDS_ATTENTION = "needs_attention"


class AttentionReason(StrEnum):
    FILE_CORRUPTED = "file_corrupted"
    PARSE_FAILED = "parse_failed"
    PARTIAL_EXTRACTION = "partial_extraction"
    SCANNED_DOCUMENT = "scanned_document"
    DUPLICATE_FILE = "duplicate_file"
    ANALYSIS_FAILED = "analysis_failed"
    ANALYSIS_PARTIAL = "analysis_partial"


class EvaluationStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class EvaluatedSkillStatus(StrEnum):
    MATCHED = "matched"
    TRANSFERABLE = "transferable"
    NOT_DETECTED = "not_detected"
    NOT_PROVIDED = "not_provided"
    GAP = "gap"


class EvidenceConfidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvidenceKind(StrEnum):
    DIRECT = "direct"
    INFERRED = "inferred"
