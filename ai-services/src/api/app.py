"""FastAPI Application for CareerSync AI Service.

Implements all endpoints defined in docs/ai-service-contract.md.
"""

from __future__ import annotations

import io
import os
import time

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.schemas import (
    CapabilitiesSchema,
    EducationEntity,
    EntitiesPayload,
    ErrorDetail,
    ExperienceEntity,
    ExtractEntitiesRequest,
    ExtractEntitiesResponse,
    HealthResponse,
    NormalizedSkillItem,
    NormalizeSkillsRequest,
    NormalizeSkillsResponse,
    ParseResumeResponse,
    SemanticMatchRequest,
    SemanticMatchResponse,
    SkillEntity,
    StandardErrorResponse,
)
from src.extractors.education_extractor import EducationExtractor
from src.extractors.experience_extractor import ExperienceExtractor
from src.extractors.skill_extractor import SkillExtractor
from src.normalizers.skill_normalizer import SkillNormalizer
from src.parsers.docx_parser import DOCXParser
from src.parsers.pdf_parser import PDFParser
from src.parsers.section_detector import SectionDetector
from src.similarity.semantic_matcher import SemanticMatcher

app = FastAPI(
    title="CareerSync AI Engine",
    version="1.0.0",
    description="High-precision layout-aware resume parsing, skill extraction, and semantic matching for CareerSync AI."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

DEFAULT_DEV_KEY = "careersync-internal-ai-service-key-dev"
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", DEFAULT_DEV_KEY)
ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("CAREERSYNC_ENVIRONMENT", "development")).lower()


def check_production_security() -> None:
    current_env = os.getenv("ENVIRONMENT", os.getenv("CAREERSYNC_ENVIRONMENT", "development")).lower()
    current_key = os.getenv("AI_SERVICE_API_KEY", DEFAULT_DEV_KEY)
    if current_env in ("production", "prod"):
        if not current_key or current_key == DEFAULT_DEV_KEY or "CHANGE_ME" in current_key:
            raise RuntimeError("Production AI service requires a secure, non-default AI_SERVICE_API_KEY")


check_production_security()

REQUIRE_API_KEY = os.getenv("AI_SERVICE_REQUIRE_AUTH", "true").lower() in ("true", "1")


def verify_ai_service_key(
    authorization: str | None = Header(None),
    x_api_key: str | None = Header(None, alias="X-AI-Service-Key"),
    x_api_key_alt: str | None = Header(None, alias="X-API-Key")
) -> None:
    expected_key = os.getenv("AI_SERVICE_API_KEY", DEFAULT_DEV_KEY)
    key = x_api_key or x_api_key_alt
    if not key and authorization:
        if authorization.startswith("Bearer "):
            key = authorization[7:].strip()
        else:
            key = authorization.strip()

    if REQUIRE_API_KEY:
        if not key or key != expected_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing AI service authorization key."
            )
    elif key and key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AI service authorization key."
        )


# Engine Singletons
pdf_parser = PDFParser()
docx_parser = DOCXParser()
section_detector = SectionDetector()
skill_extractor = SkillExtractor()
experience_extractor = ExperienceExtractor()
education_extractor = EducationExtractor()
skill_normalizer = SkillNormalizer()
semantic_matcher = SemanticMatcher()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Verify AI microservice health and active capabilities."""
    info = semantic_matcher.get_active_engine_info()
    return HealthResponse(
        capabilities=CapabilitiesSchema(
            pdf_parsing=True,
            docx_parsing=True,
            skill_extraction=True,
            skill_normalization=True,
            experience_structuring=True,
            semantic_similarity=True,
            embedding_matcher_available=True,
            active_matcher_engine=str(info["default_method"]),
            embedding_model_id=str(info["embedding_model_id"]),
            embedding_model_loaded=bool(info["embedding_model_loaded"]),
        )
    )


@app.post("/api/v1/ai/parse-resume", response_model=ParseResumeResponse, dependencies=[Depends(verify_ai_service_key)])
async def parse_resume(
    file: UploadFile = File(...),
    resume_id: str | None = Form(None)
):

    """Parse raw PDF or DOCX file into normalized text and semantic sections."""
    start_time = time.time()
    filename = file.filename or "resume"
    extension = filename.split(".")[-1].lower()

    if extension not in ["pdf", "docx"]:
        return JSONResponse(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            content=StandardErrorResponse(
                error=ErrorDetail(
                    code="UNSUPPORTED_MEDIA_TYPE",
                    message=f"File extension '.{extension}' is not supported. Only PDF and DOCX documents are accepted."
                )
            ).model_dump()
        )

    # Stream/chunk upload up to 10MB to avoid memory exhaustion
    CHUNK_SIZE = 1024 * 1024  # 1MB
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    total_bytes = 0
    buffer = io.BytesIO()

    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_SIZE:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content=StandardErrorResponse(
                    error=ErrorDetail(
                        code="PAYLOAD_TOO_LARGE",
                        message="Document file size exceeds 10MB limit."
                    )
                ).model_dump()
            )
        buffer.write(chunk)

    buffer.seek(0)
    stream = buffer

    try:
        if extension == "pdf":
            parse_result = pdf_parser.parse_stream(stream)
        else:
            parse_result = docx_parser.parse_stream(stream)

        text = parse_result["text"]
        sections = section_detector.split_sections(text)
        duration_ms = int((time.time() - start_time) * 1000)

        return ParseResumeResponse(
            resume_id=resume_id,
            status="completed",
            source_format=extension,
            parser_version="1.0.0",
            processing_duration_ms=duration_ms,
            raw_text_length=len(text),
            sections=sections,
            warnings=parse_result.get("warnings", [])
        )
    except ValueError as e:
        msg = str(e)
        code = "PAGE_LIMIT_EXCEEDED" if "pages" in msg.lower() else "INVALID_DOCUMENT_ARCHIVE"
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=StandardErrorResponse(
                error=ErrorDetail(
                    code=code,
                    message=msg
                )
            ).model_dump()
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=StandardErrorResponse(
                error=ErrorDetail(
                    code="CORRUPT_DOCUMENT_PAYLOAD",
                    message="Failed to extract text from document. File may be corrupt or unreadable."
                )
            ).model_dump()
        )



@app.post("/api/v1/ai/extract-entities", response_model=ExtractEntitiesResponse, dependencies=[Depends(verify_ai_service_key)])
async def extract_entities(payload: ExtractEntitiesRequest):
    """Extract structured skills, chronological tenure, and education credentials."""
    start_time = time.time()
    text = payload.text or ""
    sections = payload.sections or {}

    if not sections and text:
        sections = section_detector.split_sections(text)

    # 1. Skill Extraction
    skills_data = skill_extractor.extract_from_sections(sections) if sections else skill_extractor.extract_from_text(text)

    # 2. Experience Extraction
    exp_text = sections.get("experience", text)
    exp_data = experience_extractor.extract(exp_text)

    # 3. Education Extraction
    edu_text = sections.get("education", text)
    edu_data = education_extractor.extract(edu_text)

    duration_ms = int((time.time() - start_time) * 1000)

    return ExtractEntitiesResponse(
        resume_id=payload.resume_id,
        status="completed",
        parser_version="1.0.0",
        entities=EntitiesPayload(
            skills=[SkillEntity.model_validate(s) for s in skills_data],
            experience=[ExperienceEntity.model_validate(e) for e in exp_data["entries"]],
            total_experience_months=exp_data["total_experience_months"],
            total_experience_years=exp_data["total_experience_years"],
            education=[EducationEntity.model_validate(e) for e in edu_data],
        ),
        extraction_metadata={
            "total_skills_detected": len(skills_data),
            "total_experience_entries": len(exp_data["entries"]),
            "duration_ms": duration_ms
        }
    )


@app.post("/api/v1/ai/normalize-skills", response_model=NormalizeSkillsResponse, dependencies=[Depends(verify_ai_service_key)])
async def normalize_skills(payload: NormalizeSkillsRequest):
    """Normalize raw skill variants to canonical taxonomy."""
    results = skill_normalizer.normalize_list(payload.skills)
    normalized_items = [
        NormalizedSkillItem(
            input=r["input"],
            canonical=r["canonical"],
            category=r["category"],
            matched=r["matched"],
            confidence=r["confidence"]
        )
        for r in results
    ]
    return NormalizeSkillsResponse(normalized=normalized_items)


@app.post("/api/v1/ai/semantic-match", response_model=SemanticMatchResponse, dependencies=[Depends(verify_ai_service_key)])
async def semantic_match(payload: SemanticMatchRequest):
    """Compute vector/semantic alignment between candidate profile and job requisition."""
    match_result = semantic_matcher.match(
        candidate_profile=payload.candidate_profile.model_dump(),
        job_requisition=payload.job_requisition.model_dump(),
        method=payload.method
    )

    return SemanticMatchResponse(
        candidate_id=payload.candidate_id,
        job_id=payload.job_requisition.job_id,
        semantic_similarity_score=match_result["semantic_similarity_score"],
        raw_similarity=match_result.get("raw_similarity"),
        similarity_index=match_result.get("similarity_index"),
        alignment_grade=match_result["alignment_grade"],
        method=match_result.get("method", "tf_cosine_baseline"),
        status=match_result.get("status", "ok"),
        fallback_reason=match_result.get("fallback_reason"),
        matched_key_concepts=match_result["matched_key_concepts"],
        missing_or_gap_concepts=match_result["missing_or_gap_concepts"],
        model_info=match_result["model_info"],
        diagnostics=match_result.get("diagnostics", {})
    )
