# CareerSync AI — Security Hardening and Database CI Verification Audit

**Document Identifier:** `docs/audits/SECURITY_AND_POSTGRES_CI_AUDIT.md`  
**Audit Date:** 2026-10-17  
**Status:** Audit & Prioritized Plan (Read-Only Phase Complete)  
**Baseline Commit:** `136f432` (`main`)  
**Scope:** Resume-Upload Security, PDF/DOCX Resource-Exhaustion Defenses, PostgreSQL & pgvector Migration Integrity, CI Workflow Coverage, and Recruiter Workflow Protection.

---

## 1. Executive Summary

CareerSync AI was evaluated through a rigorous, read-only security and infrastructure audit focusing on two primary areas:
1. **Document Ingestion & Processing Security:** End-to-end audit of file upload endpoints, storage isolation, text extraction (`pdfplumber`, `pypdf`, `python-docx`), memory exhaustion vulnerabilities (zip bombs, excessive page counts), and access controls.
2. **Database & CI Infrastructure Verification:** Analysis of PostgreSQL/pgvector Alembic migrations, SQLAlchemy entity configurations, test isolation, and CI workflow pipelines in `.github/workflows/ci.yml`.

### High-Level Audit Findings Matrix

| Domain | Verified Protections | Confirmed Gaps | Potential Risks | Overall Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **Upload Validation & Storage** | 5 | 1 | 1 | **Strong baseline** (magic bytes, MIME check, UUID storage, IDOR authorization). Needs streaming memory bounding & cleanup. |
| **PDF Processing & Parser** | 1 | 2 | 1 | **Moderate gap** (Unbounded page count loops and lack of processing timeouts create CPU lockup risks). |
| **DOCX Processing & Parsing** | 0 | 2 | 1 | **Moderate gap** (Uninspected ZIP container opens path to ZIP bomb / XML expansion memory exhaustion). |
| **Authorization & Privacy** | 4 | 1 | 0 | **Strong baseline** (Strict IDOR checks for candidates & recruiters, anti-hijack guard). Minor PII log masking gap. |
| **PostgreSQL & pgvector in CI** | 0 | 4 | 1 | **Critical CI coverage gap** (100% of tests run on SQLite; Alembic migrations and pgvector never execute in CI). |

---

## 2. Verified Upload-Security Controls

The following controls were inspected in source code and empirically verified:

### 2.1 Server-Generated Storage Keys and Path Traversal Neutralization
- **Classification:** `NOT AN ISSUE — EXISTING CONTROL VERIFIED`
- **Label:** `VERIFIED`
- **Location:** `backend/app/services/storage.py:30–38` (`safe_filename`), `lines 69–84` (`store_upload`)
- **Evidence:**
  ```python
  # storage.py:33-38
  normalized = filename.replace("\\", "/")
  name = Path(normalized).name
  name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
  if not name or name in {".", ".."}:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
  ...
  # storage.py:73-77
  storage_id = upload_id or uuid4()
  storage_key = f"{storage_id}{extension}"
  destination = storage_root / storage_key
  destination.write_bytes(payload)
  ```
- **Finding:** User-supplied filenames are never used for local filesystem storage. The server assigns an immutable `uuid4()` name with a validated extension. Directory traversal via `../` or absolute Windows/POSIX path tricks is completely neutralized.

### 2.2 Strict Multi-Layer Extension, MIME, and Magic-Byte Validation
- **Classification:** `NOT AN ISSUE — EXISTING CONTROL VERIFIED`
- **Label:** `VERIFIED`
- **Location:** `backend/app/services/storage.py:13–18, 41–53` (`validate_file_type`)
- **Evidence:**
  ```python
  # storage.py:41-53
  extension = Path(filename).suffix.lower()
  if extension not in {".pdf", ".docx"}:
      raise HTTPException(status_code=415, detail="Only PDF and DOCX files are supported.")
  if declared_mime not in ALLOWED_MIME_TYPES:
      raise HTTPException(status_code=415, detail="Unsupported MIME type.")
  if ALLOWED_MIME_TYPES[declared_mime] != extension:
      raise HTTPException(status_code=415, detail="File extension and MIME type disagree.")
  if extension == ".pdf" and not payload.startswith(PDF_MAGIC):  # b"%PDF-"
      raise HTTPException(status_code=415, detail="Invalid PDF signature.")
  if extension == ".docx" and not payload.startswith(ZIP_MAGIC):  # b"PK\x03\x04"
      raise HTTPException(status_code=415, detail="Invalid DOCX signature.")
  ```
- **Finding:** Files must pass a 4-tier check: allowed extension list, allowed MIME whitelist, strict extension-to-MIME agreement, and valid binary magic headers.

### 2.3 Upload Size Ceiling (10 MB Enforcement)
- **Classification:** `NOT AN ISSUE — EXISTING CONTROL VERIFIED`
- **Label:** `VERIFIED`
- **Location:** `backend/app/services/storage.py:59–64`
- **Evidence:**
  ```python
  payload = await upload.read(settings.max_upload_bytes + 1)
  if len(payload) > settings.max_upload_bytes:
      raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")
  ```
- **Finding:** Files exceeding 10,485,760 bytes are halted and rejected with HTTP 413. The read operation reads at most `max_upload_bytes + 1` bytes, preventing a single multi-gigabyte upload stream from reading indefinitely.

### 2.4 Empty File Handling
- **Classification:** `NOT AN ISSUE — EXISTING CONTROL VERIFIED`
- **Label:** `VERIFIED`
- **Location:** `backend/app/services/storage.py:61–62`
- **Evidence:**
  ```python
  if not payload:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
  ```
- **Finding:** Zero-byte files are caught immediately and rejected before parsing or database record generation.

### 2.5 Strict IDOR Authorization Boundaries
- **Classification:** `NOT AN ISSUE — EXISTING CONTROL VERIFIED`
- **Label:** `VERIFIED`
- **Location:** `backend/app/api/v1/resumes.py:277–315` (`verify_resume_access`), `backend/tests/test_api.py:89–168` (`test_resume_idor_protection`)
- **Evidence:**
  - Candidates can only access resumes where `resume.candidate_id == cand_profile.id`.
  - Recruiters can only access resumes uploaded directly to jobs they own or attached to applications for jobs they own.
  - Verified by passing unit test `test_resume_idor_protection` (asserting HTTP 403 on all unauthorized cross-tenant and candidate-to-candidate access attempts).

---

## 3. Confirmed Gaps and Potential Risks

### 3.1 Unbounded PDF Page Count Processing
- **Classification:** `CONFIRMED HARDENING GAP`
- **Severity:** High
- **Rationale:** Processing thousands of pages via `pdfplumber` layout analysis consumes 100% CPU on backend worker threads, causing denial of service.
- **Location:** `backend/app/services/text_extraction.py:36–39`, `ai-services/src/parsers/pdf_parser.py:47–55`
- **Evidence:**
  ```python
  # backend/app/services/text_extraction.py:36-39
  with pdfplumber.open(str(path)) as pdf:
      for page in pdf.pages:
          page_text = page.extract_text(layout=True) or page.extract_text() or ""
          text_pages.append(page_text)
  ```
- **Impact:** An adversary can upload a valid 10MB PDF containing 1,000+ pages of dense text. Each page takes ~100–300ms in `pdfplumber.extract_text(layout=True)`, locking the process/thread for 2–5 minutes.
- **Recommended Resolution:** Enforce `MAX_RESUME_PAGES = 15` (configurable). If `len(pdf.pages) > max_pages`, truncate parsing at `max_pages` and record a warning, or reject with HTTP 422 if page count exceeds an absolute hard limit (e.g., 30 pages).
- **Verification Method:** Create a test PDF with 50 pages; verify that processing terminates at the configured page ceiling without freezing the process.
- **Approval Required:** No (defensive hardening within existing parser contract).

### 3.2 Uninspected DOCX ZIP Container (ZIP Bomb / Resource Exhaustion)
- **Classification:** `CONFIRMED HARDENING GAP`
- **Severity:** High
- **Rationale:** `.docx` files are ZIP archives. Passing uninspected streams directly to `docx.Document()` leaves the server vulnerable to ZIP decompression bombs.
- **Location:** `backend/app/services/text_extraction.py:64`, `ai-services/src/parsers/docx_parser.py:27`
- **Evidence:**
  ```python
  # text_extraction.py:64
  doc = docx.Document(str(path))
  # docx_parser.py:27
  doc = docx.Document(stream)
  ```
- **Impact:** An attacker uploads a crafted 100KB DOCX archive with nested repetitive XML expanding to 2GB+ in memory. Python's `zipfile` and `xml` parsers will exhaust memory and crash the worker process.
- **Recommended Resolution:** Inspect the ZIP archive using `zipfile.ZipFile` before passing to `docx.Document`:
  1. Entry count check: `len(zf.infolist()) <= 500`.
  2. Maximum uncompressed total size: `sum(info.file_size for info in zf.infolist()) <= 30 * 1024 * 1024` (30MB).
  3. Compression ratio check: `file_size / compress_size <= 50.0` for any entry with `compress_size > 1024`.
- **Verification Method:** Create a test fixture with high compression ratio or excessive entries; assert HTTP 422 / `AttentionReason.FILE_CORRUPTED` without memory spike.
- **Approval Required:** No.

### 3.3 Lack of Synchronous Parsing Timeouts
- **Classification:** `CONFIRMED HARDENING GAP`
- **Severity:** Medium
- **Rationale:** When `enable_worker=false`, resume parsing runs synchronously via `asyncio.to_thread(_process_resume_inline)`. A stalled or pathological document parser blocks the thread pool indefinitely.
- **Location:** `backend/app/api/v1/resumes.py:147`, `backend/app/api/v1/applications.py:258`
- **Evidence:**
  ```python
  await asyncio.to_thread(_process_resume_inline, resume.id, job_id)
  ```
  Neither `asyncio.wait_for` nor process-level timeouts guard this invocation.
- **Impact:** Complex vector rendering or corrupted regex state in parsers will hang worker threads.
- **Recommended Resolution:** Wrap synchronous inline thread execution in `asyncio.wait_for(..., timeout=30.0)`. On timeout, mark resume as `NEEDS_ATTENTION` (`AttentionReason.PARSE_FAILED`) and log structured warning. For Celery worker tasks (`app/workers/tasks.py`), set `time_limit=45, soft_time_limit=30`.
- **Verification Method:** Inject a dummy 40-second sleep into `extract_text_from_file`; assert timeout triggers cleanly after 30s.
- **Approval Required:** No.

### 3.4 Hidden & Micro-Text Manipulation (Keyword Stuffing Bypass)
- **Classification:** `CONFIRMED HARDENING GAP`
- **Severity:** Medium
- **Rationale:** `pdfplumber` layout extraction extracts all text streams indiscriminately, allowing 1pt or white-on-white text to inject unearned keywords into matching algorithms.
- **Location:** `backend/app/services/text_extraction.py:38`, `ai-services/src/parsers/pdf_parser.py:49`
- **Evidence:** Extracted text is fed directly into `taxonomy.extract_skills_from_text(extracted_text)`. Candidates can embed invisible text blocks to trigger skills match.
- **Impact:** Compromises recruiter scoring integrity and fair candidate comparison.
- **Recommended Resolution:** In `pdfplumber` character extraction, filter out characters with `char["size"] < 3.5` (micro-text) or where font color matches background color (`char.get("non_stroking_color") == (1, 1, 1)` on white backgrounds).
- **Verification Method:** Test PDF containing 1pt white keywords; verify keywords are not extracted into plain text.
- **Approval Required:** Requires review from recruiting pipeline team to ensure legitimate low-size footer text (e.g. copyright/page numbers) isn't improperly discarded.

### 3.5 Potential Storage Orphan Leaks on Database Transaction Abort
- **Classification:** `CONFIRMED HARDENING GAP`
- **Severity:** Low
- **Rationale:** `store_upload()` writes the file to disk before `db.commit()` in `upload_resume()`. If an unhandled exception or database error occurs between disk write and commit, the file remains on disk permanently.
- **Location:** `backend/app/api/v1/resumes.py:128–142`, `backend/app/services/resumes.py:35–53`
- **Evidence:** While `ResumeService.ingest` catches `IntegrityError` and calls `delete_storage_key()`, other runtime exceptions (e.g., unexpected network failure, broker disconnect, or worker abort) leave orphaned files in `career-sync-storage/`.
- **Impact:** Gradual disk storage accumulation of unreferenced files over time.
- **Recommended Resolution:** Implement a safe context-manager or cleanup hook on endpoint failure, plus a scheduled maintenance task (or CLI command) to scan storage for files with no matching database `Resume.storage_key` older than 24 hours.
- **Verification Method:** Mock an exception during `db.commit()`; verify storage file is unlinked.
- **Approval Required:** No.

### 3.6 PII Logging in Exception and Hijack Warning Logs
- **Classification:** `CONFIRMED HARDENING GAP`
- **Severity:** Low
- **Rationale:** Raw email addresses and local disk paths appear in server logs.
- **Location:** `backend/app/api/v1/resumes.py:62–66`, `backend/app/services/text_extraction.py:25`
- **Evidence:**
  ```python
  # resumes.py:62-66
  logger.warning("Resume email %s belongs to a registered user account...", email)
  # text_extraction.py:25
  logger.warning("Text extraction failed for %s: %s", file_path, exc)
  ```
- **Impact:** Exposure of candidate email addresses in plaintext log aggregators; exposure of internal directory paths in audit logs.
- **Recommended Resolution:** Mask emails in log output (e.g. `j***@example.com`) and log `resume.id` / `storage_key` rather than absolute host filesystem paths.
- **Verification Method:** Code inspection and unit test asserting log output does not contain unmasked emails or absolute paths.
- **Approval Required:** No.

---

## 4. PDF Processing Findings

| Check | Status | Line References | Detail |
| :--- | :--- | :--- | :--- |
| **PDF Page Limit** | `CONFIRMED HARDENING GAP` | `text_extraction.py:37`, `pdf_parser.py:47` | No page count limit is enforced. Loops over all pages. |
| **PDF Extraction Timeout** | `CONFIRMED HARDENING GAP` | `resumes.py:147`, `pdf_parser.py:36` | Synchronous execution runs without deadline. |
| **Micro-Text / Color Filtering** | `CONFIRMED HARDENING GAP` | `text_extraction.py:38`, `pdf_parser.py:49` | Invisible font sizes and white-on-white text are extracted. |
| **Malformed PDF Handling** | `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `text_extraction.py:44, 54`, `pdf_parser.py:56` | Caught cleanly; falls back or marks `PARSE_FAILED`. |
| **Multi-Engine Fallback** | `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `text_extraction.py:33–57`, `pdf_parser.py:41–72` | Dual-engine fallback (`pdfplumber` $\rightarrow$ `pypdf`) verified. |

---

## 5. DOCX Processing Findings

| Check | Status | Line References | Detail |
| :--- | :--- | :--- | :--- |
| **ZIP Bomb / Ratio Defense** | `CONFIRMED HARDENING GAP` | `text_extraction.py:64`, `docx_parser.py:27` | Direct invocation of `docx.Document()` without ZIP entry inspection. |
| **ZIP Entry Count Ceiling** | `CONFIRMED HARDENING GAP` | `text_extraction.py:64`, `docx_parser.py:27` | No limit on total number of internal archive entries. |
| **Table & Paragraph Extraction**| `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `text_extraction.py:66–78`, `docx_parser.py:32–47` | Paragraphs and cell deduplication for tables properly handled. |
| **DOCX Signature Validation** | `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `storage.py:51–52` | Checks `PK\x03\x04` magic header before opening. |
| **Malformed DOCX Handling** | `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `text_extraction.py:82–84`, `docx_parser.py:52` | Catches exceptions and logs warning without application crash. |

---

## 6. Authorization and Privacy Findings

| Check | Status | Line References | Detail |
| :--- | :--- | :--- | :--- |
| **Candidate Access Boundaries**| `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `resumes.py:282–286`, `test_api.py:127` | Candidate cannot access another candidate's resume (403). |
| **Recruiter Access Boundaries** | `NOT AN ISSUE — EXISTING CONTROL VERIFIED` | `resumes.py:288–313`, `test_api.py:165` | Recruiter cannot access resumes uploaded to other recruiters' jobs (403). |
| **Candidate Profile Hijack Guard**| `NOT AN ISSUE — EXISTING CONTROL VERIFIED`| `resumes.py:60–67`, `test_api.py:538` | Registered candidate accounts cannot be hijacked by resume upload. |
| **Cross-Recruiter Profile Leak** | `NOT AN ISSUE — EXISTING CONTROL VERIFIED`| `resumes.py:68–85` | Resumes uploaded by Recruiter A cannot alter candidate data of Recruiter B. |
| **PII Exposure in Logs** | `CONFIRMED HARDENING GAP` | `resumes.py:63`, `text_extraction.py:25` | Raw email and filesystem paths printed in server log output. |

---

## 7. PostgreSQL and pgvector Migration Findings

### 7.1 Existing Migration Architecture
- **Location:** `backend/alembic/versions/0001_initial_schema.py`
- **Revision:** `0001_initial_schema` (single initial migration)
- **Key Characteristics:**
  - Line 16: `op.execute("CREATE EXTENSION IF NOT EXISTS vector")`
  - Defines 9 PostgreSQL enums (`user_role`, `job_status`, `application_status`, `processing_status`, `attention_reason`, `evaluation_status`, `evaluated_skill_status`, `evidence_confidence`, `evidence_kind`).
  - Creates 15 relational tables with explicit foreign key cascade/restrict actions.
  - Line 255–266: Creates `resume_embeddings` table and executes:
    ```sql
    ALTER TABLE resume_embeddings ALTER COLUMN vector TYPE vector(1024) USING vector::vector
    ```
  - Line 270–281: `downgrade()` drops all 15 tables in reverse topological order, drops all 9 enums, and executes `DROP EXTENSION IF EXISTS vector`.

### 7.2 Database Deficiencies & Gaps Identified
1. **Migrations Are Untested in CI:**
   - **Classification:** `CONFIRMED HARDENING GAP`
   - **Severity:** Critical
   - **Evidence:** `.github/workflows/ci.yml` does not spin up a PostgreSQL service container. `alembic upgrade head` is never called in CI.
   - **Impact:** Syntax errors, constraint bugs, or type discrepancies in Alembic migrations can be merged to `main` without CI ever failing.
2. **PostgreSQL-Specific Types & Extensions Are Never Validated:**
   - **Classification:** `CONFIRMED HARDENING GAP`
   - **Severity:** High
   - **Evidence:** SQLite does not validate `vector(1024)` or native PostgreSQL `sa.Enum`. In SQLite, `Base.metadata.create_all()` creates generic text/varchar columns. Any incompatibility with real pgvector operations is completely masked in the test suite.
3. **Hardcoded SQLite Dependency in Conftest:**
   - **Classification:** `CONFIRMED HARDENING GAP`
   - **Severity:** Medium
   - **Evidence:** `backend/tests/conftest.py:14` hardcodes `os.environ["CAREERSYNC_DATABASE_URL"] = "sqlite://"`. Even if a test runner supplies a PostgreSQL connection string via environment variables, `conftest.py` overwrites it at module load time.

---

## 8. Existing CI Coverage

Analysis of `.github/workflows/ci.yml`:

```yaml
jobs:
  backend-tests:
    runs-on: ${{ matrix.os }}  # ubuntu-latest, windows-latest
    # NO services block (no postgres, no redis)
    steps:
      - run: python -m pytest -v
```

### Coverage Audit Checklist
- [x] Backend unit & API tests on Ubuntu & Windows (48 tests pass).
- [x] AI microservice unit tests on Ubuntu.
- [x] Frontend Next.js build verification.
- [ ] **PostgreSQL database container:** **MISSING**
- [ ] **pgvector extension verification:** **MISSING**
- [ ] **Alembic migration upgrade verification (`alembic upgrade head`):** **MISSING**
- [ ] **Alembic migration downgrade verification (`alembic downgrade base`):** **MISSING**
- [ ] **Fresh database bootstrap verification:** **MISSING**
- [ ] **Adversarial upload tests (zip bomb, page limits):** **MISSING**

---

## 9. Prioritized Remediation Plan

The remediation plan is structured into three prioritized tiers to deliver maximum risk reduction without destabilizing active features:

### Tier 1: Immediate Security Hardening (Highest Priority)
1. **DOCX Archive Validation:** Add pre-parsing ZIP container checks (`zipfile.ZipFile`) in `backend/app/services/text_extraction.py` and `ai-services/src/parsers/docx_parser.py` (entry count $\le 500$, total uncompressed size $\le 30\text{MB}$, compression ratio $\le 50:1$).
2. **PDF Page Count Cap:** Enforce `MAX_RESUME_PAGES = 15` in `text_extraction.py` and `pdf_parser.py` to prevent CPU lockup.
3. **Synchronous Extraction Timeout:** Wrap inline thread extraction in `asyncio.wait_for(..., timeout=30.0)` in `resumes.py` and `applications.py`.
4. **PostgreSQL CI Migration Job:** Add a dedicated, non-blocking CI job with `pgvector/pgvector:pg16` service verifying `alembic upgrade head` $\rightarrow$ `alembic downgrade base` $\rightarrow$ `alembic upgrade head`.

### Tier 2: Storage & Privacy Hardening (Medium Priority)
1. **Storage Orphan Cleanup Hook:** Ensure failed upload transactions cleanly unlink files stored on disk.
2. **Log Sanitization:** Mask candidate emails in logger output and sanitize filesystem paths.
3. **Micro-Text Character Filter:** Implement font-size threshold check in `pdfplumber` character extraction to guard against keyword stuffing.

### Tier 3: Database & Worker Isolation (Operational Priority)
1. **Conftest Database URL Fallback:** Update `backend/tests/conftest.py` to respect `os.environ.get("CAREERSYNC_DATABASE_URL")` rather than unconditionally forcing `sqlite://`.
2. **PostgreSQL Integration Test Suite:** Run a targeted subset of database tests in CI against the real PostgreSQL container (pgvector column storage, enum integrity, check constraints).
3. **Celery Worker Task Limits:** Configure `time_limit=45, soft_time_limit=30` in Celery task decorators.

---

## 10. Proposed Tests for Each Important Finding

| Finding | Proposed Test File | Test Description & Assertion |
| :--- | :--- | :--- |
| **DOCX Zip Bomb Defense** | `backend/tests/test_upload.py` | Create a test DOCX with 600 entries or excessive compression ratio; assert `validate_docx_archive()` raises HTTP 422 / returns `PARSE_FAILED`. |
| **PDF Page Limit Enforcement** | `backend/tests/test_upload.py` | Generate a synthetic 30-page PDF; assert parser extracts at most 15 pages and logs page truncation warning. |
| **Extraction Timeout** | `backend/tests/test_upload.py` | Mock parser with `time.sleep(35)`; assert `asyncio.wait_for` cancels cleanly, sets `NEEDS_ATTENTION`, and returns HTTP 202 without hanging. |
| **Orphan Storage Cleanup** | `backend/tests/test_upload.py` | Mock database error during `upload_resume()`; assert uncommitted file is removed from `upload_directory`. |
| **PostgreSQL Migration Cycle** | `.github/workflows/ci.yml` (`postgres-migrations` job) | Execute `alembic upgrade head`, verify exit code 0; execute `alembic downgrade base`, verify exit code 0; execute `alembic upgrade head` again. |
| **pgvector Storage & Query** | `backend/tests/test_database_postgres.py` | Insert a vector into `ResumeEmbedding` on real PostgreSQL; assert vector cosine distance operator `<->` succeeds. |

---

## 11. Compatibility and Regression Risks

1. **Recruiter Workflow & Deterministic Ranking:**
   - **Risk:** Zero. All proposed defenses operate at the raw file validation and ingestion boundary.
   - **Protection:** `EvaluationService`, `ScoringService`, `rapidfuzz` scoring, weights, and ranking attribution are untouched.
2. **Legitimate Multi-Page Resumes:**
   - **Risk:** Setting a page cap too low could reject senior executive or academic CVs.
   - **Mitigation:** Setting the limit to 15 pages comfortably accommodates 99.9% of real-world resumes (average is 1–3 pages; academic CVs rarely exceed 10 pages). Any extra pages are truncated with a visible diagnostic warning rather than hard-failing the candidate.
3. **Developer Workflow Without Docker/PostgreSQL:**
   - **Risk:** Requiring PostgreSQL for local unit tests would break lightweight developer environments.
   - **Mitigation:** Keep the default `conftest.py` fallback on SQLite for rapid local test execution (`python -m pytest -q` finishes in ~8s). PostgreSQL is only engaged in CI or when `CAREERSYNC_DATABASE_URL` is explicitly configured.

---

## 12. Explicit Decisions Requiring Approval

Before implementing Phase 2 changes, user/team approval is sought on:

1. **PDF Page Cap Threshold:**
   - *Proposal:* Truncate extraction at **15 pages** for layout-aware parsing, logging a diagnostic warning if additional pages exist.
   - *Alternative:* Hard reject documents exceeding 15 pages with HTTP 422.
   - *Recommendation:* Truncate at 15 pages to protect recruiter experience while preventing CPU exhaustion.

2. **CI PostgreSQL Strategy:**
   - *Proposal:* Add a dedicated `postgres-migrations` job to `.github/workflows/ci.yml` using `pgvector/pgvector:pg16` service container on `ubuntu-latest`.
   - *Fast Lane Preservation:* The existing `backend-tests` matrix continues to run fast SQLite tests across Ubuntu and Windows.
   - *Recommendation:* Adopt this two-track CI model (fast unit test matrix + dedicated PostgreSQL migration verifier).

3. **Micro-Text Filtering Behavior:**
   - *Proposal:* Filter characters where font size $< 3.5\text{pt}$ during PDF extraction to suppress invisible keyword stuffing.
   - *Recommendation:* Implement as an optional/configurable flag (`CAREERSYNC_FILTER_MICROTEXT=true`) defaulted to true.

---

## 13. Audit Conclusion & Repository State

- **Phase 1 Status:** Complete. All source paths verified against commit `136f432`.
- **Application Code Modified:** None (Phase 1 is strictly read-only).
- **Test Suite Status:** 48 passed in 8.02s on baseline.
- **Next Step:** Await user review and approval of the prioritized remediation plan before initiating Phase 2 implementation.
