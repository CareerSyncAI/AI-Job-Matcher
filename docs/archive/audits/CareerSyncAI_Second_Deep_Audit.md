# CareerSync AI — Second Deep Audit of Commit `1be7900`

**Repository:** `CareerSyncAI/AI-Job-Matcher`  
**Reviewed commit:** `1be79001575e20f4f1bc5779d007fa27f564ae31`  
**Review date:** 11 October 2026  
**Review type:** Static source inspection plus direct inspection of the GitHub Actions run associated with this commit.  
**Important limitation:** This is not a production penetration test and I did not run the whole service stack against a real PostgreSQL/Redis deployment. Findings below distinguish confirmed implementation defects from risks that need runtime verification.

## Executive verdict

**Do not treat this commit as final or as a fully verified “all findings fixed” submission.** Several of the claimed fixes are valuable, but there are confirmed security, correctness, benchmarking, frontend integration, and CI problems still present.

The strongest fresh evidence is the actual GitHub Actions run for this commit: backend CI fails on both Ubuntu and Windows before any backend test executes (`ModuleNotFoundError: No module named 'app'`). The AI-service tests and frontend build pass, but that does not make the complete CI green.

The highest-priority items are:

1. Resume ATS endpoint authorization is missing, creating a cross-user data exposure risk.
2. AI-service API-key authentication fails open when a request omits the key under the default configuration; the known development key is also the default on both sides.
3. The benchmark reports perfect experience and education metrics without measuring those predictions correctly.
4. Candidate “Apply” UI only changes local state; it does not submit an application to the backend.
5. Recruiter job status and education labels do not match backend enums, causing rejected updates and incorrect scoring.
6. Unknown experience is converted into zero years and can be reported as a high-confidence gap.
7. The request-scoped SQLAlchemy session is handed to `asyncio.to_thread`, which is not a safe session-sharing pattern.
8. Migration history was replaced with a new initial revision while application startup also calls `create_all`; existing database compatibility is unproven and at risk.

---

## 1. Verified CI outcome

**Severity: P1 — blocks acceptance of this commit as CI-verified.**

GitHub Actions run: https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/38121876465

Recorded outcomes for commit `1be7900`:

| Workflow job | Result | What actually happened |
|---|---|---|
| Backend tests — Ubuntu | Failed | Pytest stopped while loading `backend/tests/conftest.py`; no backend tests ran. |
| Backend tests — Windows | Failed | Same import failure before test execution. |
| AI services tests | Passed | AI-service tests completed. This does not prove production auth is enabled. |
| Frontend build | Passed | Next.js build completed, but a build cannot validate runtime API behavior. |

The backend failure is:

```text
ImportError while loading conftest.py
from app.db.base import Base
ModuleNotFoundError: No module named 'app'
```

The workflow uses `working-directory: backend` and invokes the `pytest` console script. Fix import discovery reproducibly, for example by using `python -m pytest -v` from `backend`, or by configuring pytest’s Python path/package setup appropriately. Then rerun the real workflow on both operating systems and address any errors that appear after collection.

The command history says local backend tests passed, but the public CI result shows the repository’s advertised CI workflow is not currently passing. Both facts can coexist: the local environment may set paths or environment variables that the CI runner does not.

**Additional CI configuration issue:** the workflow sets `JWT_SECRET`, `ENVIRONMENT`, and `AUTO_SEED_DEMO_DATA`, whereas the backend `Settings` class uses the `CAREERSYNC_` environment prefix. The test `conftest.py` sets some prefixed variables before importing the app, which partly masks this mismatch. Use the actual prefixed names in CI so the workflow represents the intended configuration.

---

## 2. Security and privacy findings

### SEC-01 — ATS analysis endpoint has no resource-ownership check

**Severity: P1 / high priority**  
**File:** `backend/app/api/v1/resumes.py`, `analyze_stored_resume_ats()` around lines 282–319.

The function requires a logged-in user, loads a resume by UUID, and analyzes its stored extracted text, but it does not verify whether that user owns the resume or has recruiter access to the associated job. It returns contact details and other ATS analysis output. By comparison, `get_resume()` immediately above does perform candidate/recruiter ownership checks.

**Fix:** share a single, tested authorization helper across resume metadata, ATS analysis, and any future resume-content endpoints. Candidates must only access their own profile resumes; recruiters must only access resumes attached to jobs they own (or to applications they are explicitly authorized to view); admin policy should be explicit.

**Required tests:** user A’s resume is inaccessible to candidate B; recruiter A cannot analyze recruiter B’s applicant; a recruiter cannot obtain ATS data for a candidate profile resume merely by knowing its UUID; authorized owner access still succeeds.

### SEC-02 — AI-service authentication fails open

**Severity: P1 / high priority**  
**File:** `ai-services/src/api/app.py`, approximately lines 57–78.

The code defaults `AI_SERVICE_REQUIRE_AUTH` to `false`, and checks credentials only when `REQUIRE_API_KEY or key` is truthy. If the key is omitted and auth-required mode is not enabled, neither condition runs and protected endpoints accept the request without credentials.

The expected key also defaults to the public source-code value `careersync-internal-ai-service-key-dev`. The backend `Settings.ai_service_api_key` uses the same known default and does not reject it in production. Setting “require auth” without also replacing the key therefore does not establish a secret boundary.

The existing AI contract tests call endpoints without passing an API key, and the successful CI AI tests are not evidence that missing credentials are rejected.

**Fix:** authentication must be mandatory by default for all protected AI endpoints. Fail startup in production if the secret is missing or equals the development value. Keep only explicitly designated health endpoints public. Add 401 tests for missing and incorrect keys, plus a success test for the correct key. Apply production environment validation on both the AI service and backend caller.

### SEC-03 — Direct AI-service requests have no apparent upload-size guard

**Severity: P1 when exposed publicly; otherwise P2**  
**File:** `ai-services/src/api/app.py`, `parse_resume()`.

The endpoint reads the uploaded file into memory with `await file.read()` and the service does not appear to enforce the backend’s 10 MB limit. Because API-key checks currently fail open, direct requests can bypass the backend’s upload limit and authentication boundary and submit large payloads to the parsing service.

**Fix:** enforce size limits inside the AI service itself, reject oversized documents before expensive parsing, set proxy/server request limits and timeouts, and test oversized streamed uploads. Do not rely on every caller using the backend first.

### SEC-04 — Resume removed from current tree may remain in public Git history

**Severity: P1 if the document contains real personal information; otherwise P2 cleanup.**

Removing `career-sync-storage/sample_real_resume.docx` from the current index and adding `.gitignore` rules does not erase the file blob from older commits. Verify whether it contains real name, contact details, or other personal information. If it does, remove it from repository history with a controlled history rewrite and inspect all historical commits for other resumes, secrets, `.env` files, or personal data.

Do not assume that a current `git ls-files`/clean status proves historical removal.

### SEC-05 — Login rate limit is process-local and can grow without bound

**Severity: P2**  
**File:** `backend/app/api/v1/auth.py`.

`_LOGIN_ATTEMPTS` is an in-memory dictionary keyed by IP plus email. It is not shared across multiple worker processes or instances, resets on restart, and does not coordinate across deployment replicas. Entries for arbitrary keys are only cleaned when those exact keys are revisited, so a stream of unique IP/email combinations can cause memory growth. IP rotation or multiple replicas can bypass the effective global limit.

**Fix:** use a shared limiter (e.g. Redis or edge gateway), bound key storage/TTL, distinguish failed attempts from successful login, consider per-IP and per-account limits, and test across replicas or the shared limiter abstraction. Protect registration and password-reset endpoints as appropriate too.

### SEC-06 — Password change does not revoke existing sessions

**Severity: P2**  
**File:** `backend/app/api/v1/auth.py`, `change_password()`.

The route updates the password hash but does not revoke outstanding `RefreshSession` records. If an attacker already holds a refresh token, changing the password does not necessarily invalidate that token.

**Fix:** revoke existing refresh sessions after a password change (or define and test a deliberate session-preservation policy). Consider session-family reuse detection for refresh-token rotation.

### SEC-07 — Forgot-password endpoint promises an email that is never sent

**Severity: P1 for feature truthfulness; P2 operationally**  
**File:** `backend/app/api/v1/auth.py`, `forgot_password()`.

The endpoint returns text saying a secure password-reset link “has been dispatched,” but the implementation shown only constructs a response. It creates no reset token, persists no challenge, and sends no email.

**Fix:** implement a secure, expiring, single-use reset flow and email delivery, with generic response and rate limiting, or label the route clearly as not implemented and do not claim that an email was sent.

### SEC-08 — Recruiter access to a profile resume can cause a 500 in metadata route

**Severity: P2**  
**File:** `backend/app/api/v1/resumes.py`, `get_resume()` around lines 253–279.

The recruiter ownership check dereferences `resume.ingestion_job.recruiter_id`. Candidate profile resumes are ingested with no `ingestion_job_id`, so `resume.ingestion_job` may be `None`; this condition can raise an `AttributeError` rather than produce a controlled 403/404. Fix it with an explicit null-safe authorization path for profile resumes.

### SEC-09 — Known development key and default infrastructure credentials

**Severity: P1 on an internet-accessible deployment; P2 for local-only development**  
**Files:** `backend/app/core/config.py`, `backend/.env.example`, `ai-services/src/api/app.py`, `docker-compose.yml`.

The backend and AI service contain a known default inter-service key. `Settings` validates the JWT secret length and a few placeholder strings in production, but does not reject the default AI-service key. `docker-compose.yml` publishes PostgreSQL and Redis ports and configures a known PostgreSQL username/password; Redis has no password. This may be acceptable for a laptop demo, but not for a publicly reachable deployment.

**Fix:** remove production-capable secrets from code defaults; validate all secrets on production startup; bind infrastructure ports to loopback for local development or use private networks/firewalls and secrets for deployment; add Redis authentication/network isolation where needed.

---

## 3. Benchmark and evidence validity

### EVAL-01 — Experience metrics are hardcoded to perfect values

**Severity: P1**  
**File:** `backend/app/evaluation/benchmark_runner.py`, result construction around lines 197–201.

The report always returns `mean_absolute_error_years=0.0`, `exact_matches=len(self.dataset)`, and `total_evaluated=len(self.dataset)`. These values are not derived from predicted tenure. They therefore report perfect experience extraction even if the actual extraction is wrong.

### EVAL-02 — Education accuracy increments unconditionally and does not compare actual predictions

**Severity: P1**  
**File:** `backend/app/evaluation/benchmark_runner.py`, approximately lines 156–159.

The code calculates `satisfies_system` using `item.candidate.expected_education_degree`—the ground-truth value—rather than the extractor/evaluator output. It derives `satisfies_expected` from the expected coverage tier and number of missing job skills, not an independently annotated education label, and then does `edu_correct += 1` regardless of whether the two results agree.

The resulting accuracy is 100% for a non-empty dataset, regardless of education extractor performance.

### EVAL-03 — Ranking benchmark injects gold experience and education into the candidate

**Severity: P1 for AI/ML validation**  
**File:** `backend/app/evaluation/benchmark_runner.py`, approximately lines 113–120.

The mock `CandidateProfile` is built with `total_experience_years=item.candidate.expected_experience_years` and `education={"degree": item.candidate.expected_education_degree, ...}`. Thus ranking-correlation scores get the expected experience and degree prefilled instead of using the output of the corresponding extractors. The correlation cannot validate the end-to-end parser → extraction → scoring pipeline.

### EVAL-04 — Spearman implementation does not correctly handle tied ranks

**Severity: P2**  
**File:** `backend/app/evaluation/benchmark_runner.py`, `_calculate_spearman_rho()`.

The helper assigns successive unique ranks even when multiple scores are tied. Spearman correlation needs average ranks for ties (or a vetted implementation). Scores are rounded, so ties are plausible. The returned correlation can be wrong. Also, the helper returns `1.0` when fewer than two pairs exist, which can make an empty/tiny dataset look perfect instead of “not measurable.”

### EVAL-05 — Benchmark tier documentation reverses tiers 2 and 3

**Severity: P2**  
**File:** `backend/app/evaluation/benchmark_schema.py`.

The `expected_coverage_tier` comment says `2 = Required Gap` and `3 = Insufficient Evidence`, but `CoverageTier` in `backend/app/services/scoring.py` defines tier 2 as insufficient evidence and tier 3 as required gap. Fix the schema comment, fixture labels, benchmark logic, and docs together.

### EVAL-06 — Synthetic benchmark is a smoke test, not real-world model validation

**Severity: P2 / methodological limitation**

The benchmark dataset is small and synthetic/curated. Even after correcting all metric calculations, it can only validate the cases represented in that dataset. It does not establish performance on independently sourced resumes, varied PDF/DOCX layouts, scanned resumes, different job families, demographic subgroups, or real recruiter ratings. Do not present synthetic-case results as general accuracy claims.

**Fix for EVAL-01 through EVAL-06:** maintain independent, manually annotated expected skill spans, experience intervals, education labels, job requirements, and candidate/job relevance judgments. Run the real extraction outputs. Compute every metric from those predictions. Add a deliberately bad fake extractor in unit tests to prove the metrics become worse when predictions become wrong. Report sample size, confidence/limitations, and per-category errors.

---

## 4. Matching-engine correctness and AI/ML claims

### ML-01 — The current matcher is lexical TF-cosine, not a trained semantic embedding model

**Severity: P1 if the project report claims trained AI/ML; P2 as architecture scope**  
**Files:** `backend/app/services/semantic_matcher.py`, `ai-services/src/similarity/semantic_matcher.py`, dependency manifests.

Both matchers tokenize text and calculate sublinear term-frequency cosine similarity. They do not use sentence-transformer embeddings or a trained model. The AI-service matcher sets `vector_dimensions = 384` as metadata but still uses token counts; the backend embedding table declares `Vector(1024)`, and this reviewed code does not show an embedding-generation/retrieval path using that table. The 384/1024 dimensions also do not describe one shared, connected embedding system.

Calling this a “semantic matcher” is acceptable as a product label only if it is carefully documented as a lexical baseline. It cannot reliably infer paraphrases or meaning without actual synonym/model support. `rapidfuzz_score` in backend evaluation is calculated using `difflib.SequenceMatcher`, not RapidFuzz, despite the result field name.

**Fix:** call the current methods lexical baselines, rename `rapidfuzz_score` or use the actual RapidFuzz package, and compare against a real embedding model (e.g. a suitable Sentence Transformers model) on the corrected benchmark. Only add embeddings if they measurably improve ranking/retrieval. Do not claim that a model was trained on your data unless there is a real training/fine-tuning process, training split, held-out evaluation, and artifact/version record.

### ML-02 — Taxonomy size claims are inaccurate

**Severity: P2 / documentation trustworthiness**  
**Files:** `backend/app/services/taxonomy.py`, `ai-services/src/normalizers/taxonomy.py`, their docstrings and README.

The backend taxonomy contains 56 `SkillDefinition` entries in this revision; the AI-service taxonomy has around 100 canonical entries. The docstrings claim “500+” competencies. These are not the same thing as aliases, and the checked-in canonical lists do not support that claim.

**Fix:** correct the marketing/README/docstrings to give the actual count and taxonomy version, or expand and validate the taxonomy before claiming 500+ canonical competencies.

### ML-03 — Two separate taxonomies can disagree

**Severity: P2**  
**Files:** `backend/app/services/taxonomy.py` and `ai-services/src/normalizers/taxonomy.py` / `skill_extractor.py`.

There is a backend `SkillTaxonomy` and a separate AI-service alias map. They have different skill lists, aliases, and ambiguity logic. The same resume can therefore be interpreted differently in inline mode versus worker/microservice mode.

**Fix:** establish a canonical, versioned taxonomy source/shared package and run the same conformance test cases against both pipelines. Version the taxonomy and record the version on evaluation runs.

### ML-04 — Ambiguous-token rules use document-wide context, not local context

**Severity: P2**  
**Files:** `backend/app/services/taxonomy.py`, `_passes_disambiguation()`, and `ai-services/src/extractors/skill_extractor.py`, `_check_ambiguous_context()`.

Both helpers approve an ambiguous short token when a qualifying context appears anywhere in the whole resume. A mention of `R` in one section may be incorrectly accepted because “RStudio” or another technical context appears elsewhere. This is not contextual disambiguation at the occurrence level.

**Fix:** evaluate local sentence/section context around the specific match, use stronger rules for short tokens, and test positive and negative whole-resume examples.

### ML-05 — Several aliases conflate products/frameworks with underlying skills

**Severity: P2**  
**File:** `backend/app/services/taxonomy.py` and AI-service taxonomy.

Examples include aliases where `Next.js` accepts standalone `next`; `PHP` accepts framework names such as Laravel/Symfony; `AWS` accepts component names such as EC2/S3/Lambda; backend `NLP` accepts tools such as spaCy/NLTK/Transformers; and `LLMs` accepts tools/techniques such as LangChain, RAG, and OpenAI API. Some of these are legitimate related evidence, but they are not always equivalent to direct proficiency in the canonical requirement. A mention of the everyday word “next” can be mistaken for Next.js.

**Fix:** separate exact aliases from evidence for related tools, product names, and transferable knowledge. Use the latter only as explicitly labelled inferred/related evidence rather than treating them all as identical direct skill matches. Add regression tests for everyday-language contexts.

### ML-06 — Profile-declared skills score like resume-evidenced skills

**Severity: P2 / fairness and explainability**  
**File:** `backend/app/services/evaluation.py`, candidate skill aggregation around lines 90–99 and match scoring thereafter.

Skills in `candidate.education["skills"]` are unioned with skills extracted from resume text. A profile-declared skill can count as a full direct match in the skills score, even when the resume contains no evidence snippet. This may be intentional product behavior, but it is not equivalent to document-supported proficiency and the score currently does not distinguish the two sources in the main matched count.

**Fix:** explicitly define a self-attested skill policy. Keep source types separate, represent profile declarations as self-reported, optionally give them different scoring weight, and show source/confidence in recruiter UI. Never label a self-declared skill as verbatim resume evidence.

### ML-07 — Missing required-skill mentions never become a confirmed skill gap in the engine

**Severity: P2 / ranking logic**  
**Files:** `backend/app/services/evaluation.py` and `backend/app/services/scoring.py`.

The new engine labels an unmentioned skill `NOT_DETECTED`, not `GAP`. This is a more truthful statement about a resume, but `required_coverage_tier()` assigns tier 3 only when a required requirement has `GAP`. As currently wired, a missing skill mention by itself generally produces tier 2, not a confirmed skill-gap tier. The service-level candidate-card sorter separately treats some education/experience claims as gaps. These are two different ranking implementations.

**Fix:** keep absence as “not detected” unless there is genuinely contradictory evidence, but define how confirmed qualification gaps are established, unify the ranking policy, and test the exact same rank ordering through both the domain function and API endpoint.

### ML-08 — Empty structured skill list can produce a 100 skills score

**Severity: P2**  
**File:** `backend/app/services/evaluation.py`.

If a job has no required or preferred structured skills, the current fallback assigns `skills_score = 100.0`. That can make a requisition with no structured skill requirements appear to have a perfect skill match, rather than making the skills factor neutral/unscored or requiring recruiters to configure skills.

**Fix:** decide a documented policy for empty requirements (block publication, mark not evaluated, or use a neutral factor) and test it.

---

## 5. Experience and education extraction/scoring bugs

### DATA-01 — Unknown experience is silently converted to zero and scored as a confirmed deficit

**Severity: P1 for hiring fairness**  
**File:** `backend/app/services/evaluation.py`, experience scoring block.

The engine does `candidate_years = float(candidate.total_experience_years or 0.0)`. If the extractor did not find usable dates and candidate experience is `None`, the score treats it as zero. For jobs requiring experience, it generates an `experience_gap` evidence claim with high confidence and sets `has_required_gap = tenure_delta < 0`. This contradicts the stated “insufficient evidence, not invented defaults” principle.

**Fix:** model experience as a value plus provenance/confidence/status. Unknown must produce “not provided / insufficient evidence,” not 0 years and a high-confidence failure. Test no dates, ambiguous dates, malformed dates, and actual zero experience separately.

### DATA-02 — Education strings used by the frontend do not match backend degree ranks

**Severity: P1 for match-score correctness**  
**Files:** `frontend/src/app/dashboard/recruiter/jobs/page.tsx`, `backend/app/schemas/jobs.py`, `backend/app/services/scoring.py`.

The recruiter UI initializes `educationRequired` to `"Bachelor's"` and submits it as `education_required`. The backend rank table only recognizes exact keys `Any`, `Bachelor`, `Master`, and `PhD`. `education_satisfies()` returns false for unrecognized strings. A resume correctly extracted as `Bachelor` can therefore fail the `"Bachelor's"` requirement and be labelled an education gap. The same applies to `"Master's"` and other aliases.

**Fix:** use a shared enum/canonical value set end to end; normalize old values server-side for backward compatibility; reject unsupported values instead of silently scoring them as gaps. Add tests for every UI choice.

### DATA-03 — PhD and Associate values are inconsistent between extraction and scoring

**Severity: P2**  
**Files:** `backend/app/services/education_extractor.py`, `backend/app/services/scoring.py`.

The extractor maps PhD/doctorate patterns to `"Doctorate"`, but `DEGREE_RANK` recognizes `"PhD"`, not `"Doctorate"`, and does not include `"Associate"`. The model can treat an extracted doctorate as not satisfying a PhD requirement.

**Fix:** use one normalized degree enum including all supported levels, define equivalence rules, and test every extracted label against every required level.

### DATA-04 — The AI-service extractor invents a Bachelor degree from institution-only text

**Severity: P1 in worker mode**  
**File:** `ai-services/src/extractors/education_extractor.py`, approximately lines 44–59; applied by `backend/app/workers/tasks.py`.

The AI-service extractor uses `degree_level or "Bachelor"` for any line matching an institution keyword. The worker then takes the first education result and sets the candidate degree if it is currently empty. A line containing “University” but no degree can therefore become Bachelor and feed into candidate ranking. The backend inline `EducationExtractor` does not use the same default, so inline and worker paths disagree.

**Fix:** preserve unknown as `None`; never infer a level from institution name alone; test institution-only, graduation-year-only, and malformed education entries in both pipelines.

### DATA-05 — “First education record” is not necessarily the highest degree

**Severity: P2**  
**Files:** `backend/app/api/v1/resumes.py`, `_find_or_create_candidate()`; `backend/app/api/v1/applications.py`, `_process_profile_resume_inline()`; `backend/app/workers/tasks.py`.

The code uses `edu_records[0]` / `ai_edu[0]` as the highest degree. These lists appear to preserve document order, not degree hierarchy. If an institution-only row or an undergraduate credential comes first, the wrong level (or `None`) can be stored even when a higher degree occurs later.

**Fix:** parse all credentials, canonicalize them, rank by degree level and validity, and preserve source spans. Do not assume the first row is the highest degree.

### DATA-06 — Education field inference contains broad substring checks and a made-up default

**Severity: P2**  
**File:** `backend/app/services/education_extractor.py`, `_infer_field()`.

The code checks `"cs" in lower` and `"it" in lower` instead of word/phrase boundaries; for example, `"it"` occurs inside `"university"`, so unrelated education lines can be labelled Information Technology. If no check matches, it defaults to `"Computer Science & Engineering"` even when the resume does not say that.

**Fix:** return unknown when field of study cannot be extracted; use boundary-aware patterns and source evidence; do not fabricate an academic field.

### DATA-07 — Experience extraction scans resume text too broadly and does not exclude internships

**Severity: P2**  
**Files:** `backend/app/api/v1/resumes.py`, `_find_or_create_candidate()`; profile resume processing; `backend/app/services/experience_extractor.py`.

The backend calls the experience extractor with the full `extracted_text`, not a validated employment section. Date ranges from projects, certificates, education, and other sections can be counted. The extractor does not assign or exclude internship employment types (despite role titles including “Intern”), so internships can contribute to years scored as professional experience.

**Fix:** use section-aware extraction, classify work versus education/project dates, detect internships/part-time/co-op according to an explicit policy, retain intervals and confidence, and test resumes containing date ranges in every section.

### DATA-08 — Experience date-range regex is too permissive and tenure can be undercounted

**Severity: P2**  
**Files:** both experience extractors.

The range separator `(?:[-–—to]+)` uses a character class-like sequence that accepts one or more dash/`t`/`o` characters, rather than a literal dash or the token `to`. It can match malformed separators. The duration calculation subtracts year/month values without consistently treating the end month inclusively; for example, Jan 2020–Dec 2020 yields 11 month differences although a resume may intend 12 inclusive months. Define a consistent date policy and test month/year edge cases.

### DATA-09 — Worker and inline experience parsing differ on two-digit years

**Severity: P2**  
**Files:** `ai-services/src/extractors/experience_extractor.py` and `backend/app/services/experience_extractor.py`.

The AI-service parser turns all two-digit years below 100 into `2000 + year`; the backend parser uses a pivot that assigns values >= 50 to the 1900s. `06/98` can become June 2098 in the worker path but June 1998 in inline mode. That can create a future date and invalid or inflated tenure.

**Fix:** use one shared date parser and explicit century policy; reject future dates where unsupported.

### DATA-10 — Profile skill/education/experience data can go stale across resume replacements

**Severity: P2**  
**Files:** profile upload processor and `backend/app/workers/tasks.py`.

The code merges detected skills into the existing profile skill set and only updates degree/experience when the existing values are empty or zero. If a candidate uploads a corrected resume, skills from the old resume remain and stale experience/degree values may never be corrected. Future scoring unions those stale profile skills with the current resume.

**Fix:** keep resume-derived data per resume with provenance/version and derive the candidate profile from a selected active resume; recompute/replace on resume replacement rather than monotonically adding stale skills. Add tests for replacement/removal of previously mentioned skills.

### DATA-11 — Unknown, self-reported, extracted and verified values are not sufficiently separated

**Severity: P2**

The candidate profile stores skills/degree/experience together without strong per-field source/confidence provenance. The scorer treats a declared skill as a full direct match, experience unknown as 0, and extracted education labels as authoritative even when the parse is weak. These choices make it difficult to explain which values came from the resume, the user, or a heuristic.

**Fix:** store provenance (`resume`, `self-reported`, `manual-review`, `inferred`), confidence, source spans, and `unknown` states; use that information in scoring and recruiter UI.

---

## 6. Resume processing, database, and migration risks

### PIPE-01 — Request SQLAlchemy session is passed into a different thread

**Severity: P1/P2 — needs correction before relying on concurrent upload traffic**  
**Files:** `backend/app/api/v1/resumes.py` and `backend/app/api/v1/applications.py`.

Both routes call `await asyncio.to_thread(...)` while passing the request’s existing SQLAlchemy `Session` to the thread. SQLAlchemy sessions and their checked-out connection/transaction state are not thread-safe. Serial tests may pass but concurrent request processing can create state/connection issues.

**Fix:** the worker-thread function must create/use/close its own `SessionLocal()` inside that thread, with explicit transaction boundaries. Do not share the request session across threads. Alternatively redesign synchronous work and async boundaries without cross-thread session reuse.

### PIPE-02 — Queue enqueue failure leaves resume permanently queued

**Severity: P2**  
**File:** `backend/app/services/resumes.py`, worker enqueue path.

When `process_resume.delay()` raises, the code logs the error but leaves the resume as `QUEUED`; the API can still return 202 Accepted. Unless another process retries it, the resume remains queued indefinitely.

**Fix:** record a durable enqueue-failure state, retry with bounded/backoff strategy, or use explicit synchronous fallback where safe. Tests must simulate Redis/Celery being unavailable.

### PIPE-03 — Worker exceptions can leave the resume in PROCESSING, and evaluation errors can be marked completed

**Severity: P2**  
**File:** `backend/app/workers/tasks.py`.

The worker commits `PROCESSING` before doing work. Its outer exception handler rolls back and logs, but does not reliably transition the resume to `NEEDS_ATTENTION` or use the declared Celery retry mechanism. It is decorated with `max_retries=2` but does not call `self.retry`. Separately, evaluation exceptions are caught and logged; if `parsed_text` exists, the final status is set to `COMPLETED`, clearing the attention reason even if entity extraction/evaluation failed.

**Fix:** define explicit state transitions for parse, entity extraction, evaluation, and persistence separately; use actual retries with backoff and terminal state; do not mark a processing pipeline fully completed if required downstream work failed. Add tests for each failure point.

### PIPE-04 — Duplicate task deliveries may create duplicate evaluation runs

**Severity: P2**  
**Files:** `backend/app/workers/tasks.py`, `backend/app/services/evaluation.py`.

`EvaluationService.evaluate_application()` creates a new evaluation run for every call. Celery may redeliver tasks, and retry/reprocessing is likely as the system evolves. There is no idempotency key or deduplication of evaluation runs for the same resume/application/scoring version. Duplicate runs can change the “latest evaluation” and audit history unexpectedly.

**Fix:** add idempotency key or explicit run semantics (intentional new run vs reprocessing), and test duplicate delivery.

### PIPE-05 — Database migration history was renamed/replaced without upgrade compatibility proof

**Severity: P1 before using existing databases**  
**Files:** `backend/alembic/versions/0001_initial_schema.py`, deleted old `001_initial_schema.py`.

The commit replaces a prior revision identifier (`001_initial_schema`) with `0001_initial_schema` at `down_revision=None`. Existing databases stamped with the removed revision can fail to resolve their migration history. Checking that `alembic heads` shows one head proves only that the current graph has one head; it does not prove that an old database can upgrade.

**Fix:** keep immutable historical migration IDs wherever possible. If the old migration was never deployed, document that fact and verify; otherwise add a forward migration/compatibility plan rather than deleting a referenced revision. Test clean database creation and upgrade from the previous commit with existing data.

### PIPE-06 — Application startup uses `Base.metadata.create_all()` instead of relying solely on migrations

**Severity: P2 / deployment risk**  
**Files:** `backend/app/db/init_db.py` and `backend/app/db/session.py`.

`init_db()` calls `Base.metadata.create_all(bind=engine)` in every environment, including production (it only disables demo seeding in production). `session.py` also creates all tables for SQLite at import time. `create_all()` creates missing objects but does not evolve existing tables like a migration system does. If the application creates tables before `alembic upgrade head`, the migration can then try to create existing objects. This also means schema behavior depends on whether the app or migrations run first.

**Fix:** run Alembic as a controlled deployment/startup step and remove automatic schema mutation from the production app path. Keep an explicit isolated test/dev bootstrap if needed.

### PIPE-07 — SQLite is documented as a zero-dependency option, but migration/model behavior is PostgreSQL-specific

**Severity: P2**  
**Files:** `.env.example`, `backend/app/models/entities.py`, `backend/alembic/versions/0001_initial_schema.py`.

The `.env.example` defaults to SQLite, but the migration issues PostgreSQL-specific extension/vector SQL and uses a vector column conversion. The model uses `CheckConstraint("octet_length(sha256) = 64")`, which may fail on SQLite builds without `octet_length()`. The default development mode bypasses Alembic using `create_all()`, so a test on one SQLite version does not prove the documented migration workflow works everywhere.

**Fix:** decide whether SQLite is supported. If yes, add backend-specific migrations/portable constraints and a supported SQLite CI test. If no, change the setup documentation to require PostgreSQL + pgvector and give an accurate local setup.

### PIPE-08 — Inline profile JSON mutation may not be persisted reliably

**Severity: P2 / verify with regression test**  
**Files:** `backend/app/api/v1/applications.py` and worker candidate-enrichment code.

The code mutates `edu = candidate.education` in place, then assigns the same dictionary object back. SQLAlchemy JSON columns do not generally track in-place mutation without `MutableDict` or explicit copy-on-write. This pattern may not mark the field dirty depending on object history, meaning new skills/degree can fail to persist. Do not assume assignment of the same mutated object guarantees a database update.

**Fix:** use a new dictionary (e.g. `edu = dict(candidate.education or {})` and assign the new object) or a mutable JSON type. Add tests that commit, close the session, reload the candidate, and verify values survived.

### PIPE-09 — PDF and DOCX support claims exceed current parser capabilities

**Severity: P2 / feature limitation**

The backend text extractor tries `pdfplumber` and `pypdf` for PDFs and uses `python-docx` paragraphs for DOCX. There is no apparent OCR engine dependency or OCR execution path in this repo revision, so scanned/image-only PDFs may yield empty text. DOCX extraction that only reads paragraphs can also miss tables, headers, footers, and columns commonly used in resume templates.

**Fix:** either accurately label scanned PDF OCR as unsupported/needs attention, or implement/test an OCR fallback. Add parser tests for table-based DOCX layouts, multi-column resumes, headers/footers, ligatures, pages, and image-only PDFs.

### PIPE-10 — Profile resume deduplication and file cleanup need strengthening

**Severity: P2**  
**File:** `backend/app/services/resumes.py`.

Hash deduplication is only queried when `job_id is not None`, so repeated uploads to a candidate profile are not deduplicated. The file is stored before the database flush; cleanup is handled for a specific `IntegrityError` path but other failed transactions may leave orphaned files.

**Fix:** define deduplication semantics for profile resumes; use transaction-safe cleanup/compensation for all failure paths, and test DB errors after file storage.

---

## 7. Frontend and API integration defects

### FE-01 — Candidate Apply button does not submit an application

**Severity: P1 — core product workflow is not implemented**  
**File:** `frontend/src/app/dashboard/jobs/page.tsx`, `handleApply()`.

The handler only updates `appliedJobs` local React state and displays a toast saying the application was submitted and the recruiter notified. It does not call the backend’s `POST /jobs/{job_id}/applications` endpoint, does not send a `resume_id`, and does not create an `Application` record.

**Fix:** require/select an uploaded resume, call the backend route, display success only after the API confirms it, and handle duplicate application, missing resume, unauthorized, closed job, loading, and error states. Add an end-to-end test proving a clicked Apply button creates an application visible to both candidate and recruiter.

### FE-02 — Candidate job directory still shows mock jobs, salary, and fake match scores

**Severity: P1/P2 depending on release claims**  
**File:** `frontend/src/app/dashboard/jobs/page.tsx`.

The page initializes with `initialJobs` and keeps that state when the API fails or returns an empty result. It assigns salary values by array index and assigns `matchScore` values like 96/93/89 by index, instead of receiving these fields from the backend or computing a candidate-specific match. Sorting “by match” therefore sorts fabricated values. This is still mock-backed behavior despite the claim that frontend mock data was eliminated.

**Fix:** remove production fallbacks or clearly isolate a demo mode; do not fabricate salary or personalized match scores. Show an honest empty/error state. Only display a fit score if there is a real, documented API/model calculation.

### FE-03 — Recruiter jobs page retains demo fallback and fakes status after API failure

**Severity: P1 for job publishing workflow**  
**File:** `frontend/src/app/dashboard/recruiter/jobs/page.tsx`.

The page falls back to `DEMO_RECRUITER_JOBS` if `/jobs` fails. Its status type/options use uppercase `DRAFT`, `OPEN`, `PAUSED`, `CLOSED`, while backend `JobStatus` uses lowercase `draft`, `open`, `closed`, `archived`. Backend patch schema uses the enum values, so uppercase status values can be rejected. The catch handler nevertheless updates local state optimistically after the API fails, making the page appear to have published/changed a job even when the backend did not change. The “Active Openings” count compares to uppercase `OPEN` even though actual API values are lowercase.

**Fix:** use the backend enum’s exact values, remove unsupported `PAUSED` unless it is implemented, and only update UI state after confirmed API success. Keep an error message when status changes fail. Test creation → publish → public job listing end to end.

### FE-04 — Education requirement option mismatch produces false education gaps

**Severity: P1**  

The recruiter job form sends values such as `Bachelor's` while the scoring code expects `Bachelor`. See DATA-02 above. This is an API-contract bug and a scoring bug, not merely a label issue.

### FE-05 — Candidate application statuses do not match API enum

**Severity: P2**  
**File:** `frontend/src/app/dashboard/applications/page.tsx`.

The frontend expects uppercase legacy statuses such as `NEW`, `SCREENING`, `INTERVIEWING`, `OFFERED`, `HIRED`, and `REJECTED`. The backend returns lowercase values such as `new`, `under_review`, `shortlisted`, and `rejected`. The active filter, status badge, “under review,” interview, and offers counts compare against values the backend does not return. For example, an actual lowercase `rejected` application may still be counted by the `ACTIVE` filter.

**Fix:** use a shared typed API enum/DTO mapping; translate backend states to user-facing labels explicitly and test every possible state.

### FE-06 — Company field displays department, not the employer

**Severity: P2**  
**File:** `frontend/src/app/dashboard/applications/page.tsx`.

`company_name` is set from `jobRes.data.department`, but the jobs endpoint does not return the recruiter organization name. Users may see “Platform Engineering” or a fallback “Verified Hiring Partner” presented as a company. Return the authorized organization display name if appropriate, or rename the label and do not invent a company.

### FE-07 — Candidate apply states can claim recruiter notification without any backend action

**Severity: P1**  
**File:** `frontend/src/app/dashboard/jobs/page.tsx`.

The local toast explicitly says “Recruiter notified” even though the button never calls the backend. Remove this message until the backend operation succeeds and notification behavior actually exists.

### FE-08 — Dashboard build passing does not validate runtime API/state consistency

**Severity: P2**

The frontend build checks TypeScript/compilation, not whether the UI’s enum assumptions or business operations align with API responses. The candidate job page, recruiter job statuses, application states, and fake ranking labels demonstrate that a successful build is not equivalent to end-to-end functionality.

**Fix:** add integration tests for login, resume upload, candidate application, recruiter job publishing, recruiter candidate ranking, stage changes, and failure/loading/empty states.

### FE-09 — Candidate summary can hide closed-job information for historical applications

**Severity: P2**  
**File:** `frontend/src/app/dashboard/applications/page.tsx`.

The page fetches each past application’s job detail via `GET /jobs/{job_id}`. The backend endpoint intentionally returns 404 to candidates when the job is not OPEN. As a result, when a job closes, the past application can show generic fallback text instead of the job details originally applied to.

**Fix:** provide a candidate-authorized application-detail response with immutable job-title/company/location snapshot fields, or allow safe read-only fields for a closed job associated with the candidate’s own application.

### FE-10 — Application creation does not automatically produce an evaluation in all user flows

**Severity: P1/P2 functional gap**  
**Files:** `backend/app/api/v1/applications.py`, `apply_to_job()` and profile-resume pipeline; worker task.

The candidate apply endpoint creates an `Application` record, but does not run/queue `EvaluationService`. The worker only triggers evaluation in the branch for a resume attached to `ingestion_job_id`; candidate profile resumes have no ingestion job. Thus the normal candidate-upload → apply flow can leave candidate cards at a 0 match score until a separate recruiter action triggers evaluation. The frontend shows 0 score when no run exists, and the described user flow does not itself schedule evaluation.

**Fix:** explicitly define the evaluation trigger. On application submission, enqueue evaluation with the selected resume and job, and make the candidate-card API distinguish “not evaluated yet” from a true score of zero.

---

## 8. Scoring, ranking, and explainability consistency

### SCORE-01 — Different ranking implementations can drift

**Severity: P2**

`backend/app/services/scoring.py` exports `rank_candidates()` and `required_coverage_tier()`, while `backend/app/api/v1/applications.py` sorts `CandidateCardDTO` objects separately by scanning evidence types. The API ordering logic can diverge from the domain helper over time and uses evidence strings as implicit policy.

**Fix:** one canonical ranking function should consume normalized evaluation statuses/scores and be used by both unit tests and API endpoints.

### SCORE-02 — “High confidence” is assigned to calculations that may be based on weak/missing evidence

**Severity: P2**

The engine labels an experience comparison as high confidence even when no resume-derived experience exists and `None` has been converted to zero. Education field and degree heuristics can also be wrong. Confidence should reflect extraction source/quality, not merely that a deterministic calculation completed.

**Fix:** propagate extraction confidence and missing-data status through score components and evidence claims. Add calibration tests or clearly mark confidence as heuristic rather than statistically calibrated.

### SCORE-03 — Skill mention does not equal proficiency

**Severity: P2 / product policy**

The taxonomy emits a direct match for a skill mention without assessing context, proficiency, recency, or whether it appears in a negative statement such as “no experience with X.” The matching status currently communicates “documented proficiency” in generated claims, which is stronger than a token match proves.

**Fix:** at minimum use terminology like “skill mention detected”; consider negation/context and evidence-section/source. Do not imply proficiency based solely on a keyword occurrence.

### SCORE-04 — Stored evidence detail is reduced/duplicated in candidate cards

**Severity: P2**  
**File:** `backend/app/services/evaluation.py`, `get_candidate_card()`.

The card response sets `details=claim.source_snippet`, rather than the claim’s explanatory details. Explanatory detail fields built in the engine are not persisted as fields in `EvidenceClaim`, so clients may get an empty/duplicate snippet instead of the reason text.

**Fix:** persist a structured details/explanation field or reconstruct an explanation from stored typed data without mislabelling raw source text as explanation.

---

## 9. Documentation and deployment-readiness gaps

1. **No genuine neural model or training pipeline is currently evident.** The score engine is deterministic rules plus lexical cosine; no transformer embedding inference/training path was found in the reviewed code/dependencies. Keep it as a baseline but document it accurately.
2. **“OCR” is not supported by the listed parser dependencies and inspected extraction path.** Do not promise scanned-image PDF OCR without implementing and testing it.
3. **No formal privacy/retention/deletion policy is evident.** Resumes and contact details are sensitive. Specify storage location, access roles, retention duration, deletion behavior, audit policy, and whether uploaded content ever leaves the host for a microservice.
4. **Dependency versions are broad and no fully reproducible lock appears in the inspected backend requirements.** Add a controlled lock/update process and test upgrades separately from feature changes.
5. **Migration and app startup responsibilities are unclear.** Document one canonical deployment process and test it from a blank database as well as an old schema.
6. **Repository history needs review if personal resumes were ever committed.** Current `.gitignore` only governs future changes.
7. **The README’s “500+ competencies” assertion is inconsistent with the checked-in taxonomy count.** Correct it or grow/test the data.

---

## 10. What is good and should be retained

The commit made meaningful improvements that should not be thrown away:

- word-boundary skill matching is better than raw substring matching;
- exact skill offsets and snippets are a useful evidence foundation;
- missing mentions being “not detected” is more truthful than automatically calling them proven gaps;
- access checks for jobs and recruiter-owned resources are improvements;
- filename normalization, upload size caps, file-signature checks, and hash deduplication for job uploads are useful safeguards;
- adding CI and replacing some dashboard mock data are the right directions;
- using a deterministic lexical baseline can be justified for a student project if its limitations are openly stated.

The objective of the second pass is to correct false claims, close authorization gaps, test actual workflows, and establish reliable metrics—not to replace the whole codebase or add unrelated architecture.

---

## 11. Prioritized execution plan

### Phase A — Blockers before calling this commit verified

1. Fix backend import discovery and rerun GitHub Actions on Ubuntu and Windows.
2. Enforce AI-service authentication by default; remove known development-key defaults in production and add auth regression tests.
3. Add ownership checks to `/resumes/{resume_id}/ats` and null-safe authorization for profile resumes.
4. Replace hardcoded education/experience benchmark metrics with actual predictions and independent ground truth.
5. Correct frontend job status and education enums so publishing and scores match backend behavior.
6. Implement real candidate Apply API call and evaluation trigger.
7. Stop treating unknown experience as 0 years and a high-confidence requirement gap.

### Phase B — Data integrity and deployment safety

8. Stop sharing request SQLAlchemy sessions with threads.
9. Fix worker failure states, enqueue failure states, and task retries/idempotency.
10. Preserve/validate Alembic migration history, remove ambiguous `create_all()` production startup behavior, and test old-schema upgrades.
11. Align AI-service and backend skill/education/experience extraction; stop invented Bachelor defaults.
12. Add realistic parser tests and clarify OCR support.

### Phase C — Trustworthy AI/ML evaluation and polish

13. Improve taxonomy alias semantics and occurrence-local ambiguity handling.
14. Separate self-reported skills from resume evidence and propagate confidence/source.
15. Unify ranking logic, correct all API/UI enum mapping, and remove fabricated demo scores/salaries from non-demo mode.
16. Implement or accurately scope forgot-password, shared login rate limiting, session revocation, PII-safe logging, and public Git-history cleanup.
17. Evaluate a real pretrained embedding model against the corrected lexical baseline only after the benchmark is valid.

### Required release gate

Do not mark the phase complete until:

- GitHub Actions is green on Ubuntu and Windows.
- Auth tests prove missing/invalid AI keys are rejected.
- Authorization tests prove cross-user resume ATS access is rejected.
- Fresh database setup and migration from the previous revision both pass, with data preserved.
- Benchmark metrics are computed from real extractor predictions and fall when the predictions are made worse.
- Candidate Apply creates an actual application; a resulting evaluation is triggered and persisted.
- Job publish/status changes succeed against the API, and candidate/recruiter UI values exactly match API enums.
- The standard candidate-upload → apply → recruiter-rank pipeline is covered end to end.

---

## 12. One consolidated instruction for Antigravity

Use this as the next task. It intentionally requires incremental fixes, regression tests, and proof, rather than another broad “audit completed” claim.

### Prompt

Perform a second-pass, evidence-driven audit and repair of CareerSync AI at commit `1be79001575e20f4f1bc5779d007fa27f564ae31`. Read this entire audit document first. Do not trust previous audit summaries, commit messages, README claims, or the local test history. Reproduce each issue against the current source and inspect adjacent call paths before changing anything.

**Rules:**
- Work in small phases and inspect diffs before committing.
- Do not perform a wholesale rewrite.
- Do not claim a fix is complete unless there is a regression test and its real output is recorded.
- Do not suppress a failing test, weaken its assertion, silently skip it, or replace a real integration test with a mock-only test.
- Never hardcode evaluation metrics or default unknown candidate attributes to fabricated facts.
- Preserve historical migration compatibility; do not delete old revision IDs merely to get one head.
- Separate confirmed defects from risks requiring runtime validation.
- Do not add a neural model just to claim “AI”; first make the baseline evaluation valid.
- Do not push a commit until the release gate below passes, unless you explicitly report the unresolved blocker and leave the changes clearly unaccepted.

**Phase A — Security and actual CI:**
1. Fix `backend/tests/conftest.py` import failure in GitHub Actions and make backend tests run on both Ubuntu and Windows. Correct workflow environment variable names to use `CAREERSYNC_` where required.
2. Make protected AI service endpoints require a valid key by default. Fail production startup on missing/development API keys. Add tests for missing, wrong, and correct keys, keeping only health check public. Enforce upload-size/time limits inside the AI service itself.
3. Add consistent resource ownership checks to `GET /resumes/{resume_id}/ats`, resume metadata, and other resume/evidence endpoints. Test candidate A versus candidate B and recruiter A versus recruiter B.
4. Make `get_resume()` handle profile resumes with no `ingestion_job` safely.
5. Review public Git history for accidental personal resume data and secrets; report whether history rewrite is necessary before performing it.

**Phase B — Benchmark and hiring-score truthfulness:**
6. Remove hardcoded perfect MAE/exact matches/education accuracy. Benchmark actual predicted experience and actual predicted degree against independent expected labels.
7. Do not inject `expected_experience_years` or `expected_education_degree` into the candidate input when evaluating end-to-end rank correlation; use pipeline outputs instead. If you need component tests, label them separately.
8. Correct Spearman rank ties, tiny/empty-dataset handling, and the documented coverage-tier mapping. Make the benchmark fail or report “not measurable” where ground truth is missing.
9. Add tests proving deliberately incorrect extraction/education/experience predictions lower metrics.
10. Change unknown experience from zero/high-confidence gap to insufficient evidence. Define truthful handling for unmentioned skills and education. Keep “not detected” distinct from proven absence.
11. Normalize degree names through a shared enum. Fix `Bachelor's`/`Master's` versus `Bachelor`/`Master` mismatch and make `Doctorate`/`PhD`/`Associate` handling consistent.
12. Stop the AI worker’s education extractor from inventing `Bachelor` when an institution is mentioned but a degree is not. Choose the highest actually extracted degree, not blindly the first record.
13. Fix date parsing separator/two-digit-year issues; distinguish employment from projects, education, internships, and other intervals. Add edge-case tenure tests.
14. Decide and document how self-reported skills compare with resume-evidenced skills; preserve source/provenance and ensure the UI does not claim profile input is verbatim resume evidence.

**Phase C — Worker, persistence, and migrations:**
15. Do not pass request-scoped SQLAlchemy sessions into `asyncio.to_thread`. Create a session inside the worker thread or redesign the boundary with safe transaction management.
16. Ensure queue enqueue failures and task exceptions cannot leave resumes forever in `QUEUED`/`PROCESSING`; use actual bounded Celery retries and accurate terminal states.
17. Do not mark resumes completed when entity extraction/evaluation failed. Define idempotency semantics for duplicate task delivery/evaluation runs.
18. Preserve old Alembic revision compatibility. Test a fresh DB and an upgrade from the previous committed schema with pre-existing sample data. Remove conflicting automatic production `create_all()` behavior and define a single documented migration process.
19. Verify SQLite support end to end if it remains advertised in `.env.example`; otherwise document PostgreSQL + pgvector as required. Test relevant constraints against the supported database versions.
20. Test profile-resume replacement, JSON persistence, hash dedupe, and cleanup when DB commits fail.

**Phase D — Frontend and API contract:**
21. Make the candidate Apply button call the actual backend endpoint with a valid uploaded `resume_id`; show success only after API success. Trigger or enqueue evaluation on the candidate application flow.
22. Fix status enums across recruiter jobs, candidate applications, and pipeline. Backend values are lowercase `draft/open/closed/archived` for jobs and `new/under_review/shortlisted/rejected` for applications; do not send uppercase or unsupported `PAUSED/INTERVIEWING/OFFERED/HIRED` values.
23. Do not optimistically report a status change after a failed API request. Add end-to-end publish/open-job/application/shortlist/reject tests.
24. Remove or explicitly gate `initialJobs` and `DEMO_RECRUITER_JOBS` fallbacks. Remove fabricated candidate match scores and salary values. No “recruiter notified” message without real backend behavior.
25. Fix the company/department label and historical closed-job details for candidate applications. Ensure empty/loading/error/unauthorized states are visible and accurate.
26. Keep one canonical ranking function, and ensure the API ordering and frontend render order use the same policy.

**Phase E — Remaining security and honest AI claims:**
27. Replace process-local unbounded login rate limiting with a shared/TTL-bound implementation. Revoke refresh sessions appropriately after password change and implement a real password-reset flow or clearly disable it.
28. Remove PII from warning logs. Secure PostgreSQL/Redis ports and replace known demo credentials for deployment profiles.
29. Align the two skill taxonomies or explicitly version and conformance-test them. Improve ambiguous-token context to be local to the occurrence. Distinguish exact aliases from related products/frameworks and test common-language false positives.
30. Correct “500+ skills” and OCR/model claims unless the checked-in implementation supports them. Clearly state that TF-cosine is a lexical baseline. If considering neural embeddings, compare a pretrained embedding baseline on the corrected, independent benchmark; do not claim training without a real training and held-out evaluation process.

**Final evidence required:**
- A table listing severity, exact file/function, root cause, code change, regression test, exact command, and actual result.
- Actual green GitHub Actions results for both backend OS jobs, AI-service tests, and frontend build.
- An authorization test demonstrating ATS endpoint cross-user access returns 403/404.
- Real calculated benchmark metrics and a demonstration that wrong predictions lower them.
- Fresh-schema and previous-schema migration results.
- An end-to-end proof that candidate upload → application creation → evaluation → recruiter candidate list works.
- A list of unresolved issues. Do not call the work final while any P1 issue is unresolved.

Only after those checks pass should a focused commit be created. Do not push unless the exact final test state and unresolved items are clearly reported.
