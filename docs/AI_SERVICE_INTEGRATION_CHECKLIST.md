# AI Service Integration Checklist & Operational Status

**Status:** Diagnostic Integration Operational (Contract v1.1.0) | Production Ranking Promotion: Deferred by Design  
**Authoritative Contract:** [`docs/ai-service-contract.md`](ai-service-contract.md)  
**Verified In Code:** `backend/app/services/semantic_matcher.py` & `ai-services/src/api/app.py`  

---

## 1. Operational Integration Architecture

The integration between the FastAPI backend monolith (port 8000) and the standalone AI microservice (port 8001) conforms to **Contract v1.1.0**.

```text
Backend Scoring Request
  │
  ├── [CAREERSYNC_SEMANTIC_MATCHER="baseline"] (Default)
  │     └── SublinearTFCosineMatcher (Local CPU Execution, 0.06 ms)
  │
  └── [CAREERSYNC_SEMANTIC_MATCHER="embedding"] (Diagnostic Mode)
        └── AIServiceDiagnosticMatcher
              ├── Computes Baseline Score (for authoritative ranking)
              ├── Dispatches POST /api/v1/ai/semantic-match (X-AI-Service-Key)
              ├── Receives 384-d MiniLM cosine & similarity_index
              └── Logs diagnostics['ai_service'] with used_for_ranking=False
```

---

## 2. Checklist Status Matrix

### A. Contract Versioning & Schemas
- [x] **Contract v1.1.0 Ratified:** Documented in `docs/ai-service-contract.md`.
- [x] **Raw Similarity Excluded From Uncalibrated Ranking:** `raw_similarity` returned as unscaled cosine; authoritative ranking uses calibrated baseline.
- [x] **Model Revision Immutability:** `all-MiniLM-L6-v2` pinned to commit `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
- [x] **Explicit Status & Method Codes:** Returns `tf_cosine_baseline`, `sentence_embedding`, or `fallback`.

### B. Fallback & Failure Resilience
- [x] **Timeout Protection:** Backend calls to AI service wrapped in `httpx.Timeout(10.0)`.
- [x] **Graceful Degradation:** Service outage or malformed responses gracefully degrade to local baseline matcher with `status="fallback"`.
- [x] **Zero Fabricated Scores:** Service errors never generate random or synthetic similarity numbers.
- [x] **Authentication:** AI service rejects requests lacking valid `X-AI-Service-Key` header with HTTP 401.

### C. Validation Tests
- [x] Backend contract tests pass: `tests/test_ai_service_semantic_integration.py` (5 tests).
- [x] AI service contract tests pass: `ai-services/tests/test_contract_api.py` (14 tests).
- [x] Document security and payload ceiling tests pass: `test_document_security.py` (both backend and AI suites).
