# CareerSync AI — Database Specification & Schema Invariants

**Active Database Engine:** PostgreSQL 16 (Production & CI) / SQLite (Disposable Local Test Suite)  
**ORM / Migration Tooling:** SQLAlchemy 2.0 & Alembic  
**Vector Extension:** `pgvector` (Extension active in PostgreSQL migrations)  
**Initial Linear Revision:** `backend/alembic/versions/0001_initial_schema.py`  

---

## 1. System Database Architecture

CareerSync AI enforces a relational-first, transactional architecture. Candidate evaluations, resume ownership, application lifecycles, and audit logs are governed by foreign key constraints, unique indexes, and cascade protections.

### Execution Commands:
```bash
# Run migrations (upgrade to head)
cd backend
alembic upgrade head

# Rollback migrations (downgrade to base)
alembic downgrade base
```

---

## 2. Relational Schema & Tables

The schema defines exactly 15 relational tables:

1. **`users`**: System principals with Argon2id password hashes and role definitions (`recruiter`, `candidate`, `admin`).
2. **`recruiter_profiles`**: Recruiter tenant profiles, companies, and department ownership.
3. **`candidate_profiles`**: Candidate personal data, headline, experience summary, and target titles.
4. **`jobs`**: Requisitions with title, department, description, status (`DRAFT`, `OPEN`, `PAUSED`, `CLOSED`), and scoring weights.
5. **`job_skills`**: Skills required or preferred for a job requisition, with importance multipliers.
6. **`resumes`**: Ingested candidate resume documents, SHA-256 deduplication hashes, storage keys, and processing status.
7. **`applications`**: First-class application bridge linking candidate, job, and resume with state machine statuses (`APPLIED`, `SCREENING`, `INTERVIEWING`, `OFFERED`, `REJECTED`, `WITHDRAWN`).
8. **`evaluation_runs`**: Immutable execution runs of candidate scoring against job requisitions with evaluation configuration fingerprints.
9. **`match_results`**: Immutable point-in-time snapshot of candidate scores, coverage tiers, and score breakdowns.
10. **`evaluated_skills`**: Granular breakdown of individual required and preferred skills (`MATCHED`, `TRANSFERABLE`, `GAP`, `NOT_DETECTED`).
11. **`evidence_claims`**: Verbatim text snippets and character start/end offsets extracted directly from the candidate resume.
12. **`recruiter_notes`**: Timestamped recruiter evaluation notes with author attribution.
13. **`audit_events`**: Append-only security and domain audit trail capturing user actions, IP addresses, and state mutations.
14. **`refresh_sessions`**: Rotated, revocable cryptographic refresh token sessions with user-agent metadata.
15. **`resume_embeddings`**: Vector storage table with `vector Vector(1024)` column for dense semantic vectors.

---

## 3. Schema Invariants & Constraints

1. **Immutable Match Results:** `MatchResult` records are permanent evaluation snapshots. Updating job weights, candidate profiles, or scoring configurations produces a *new* `EvaluationRun`; existing results are never mutated in place.
2. **Strict Storage Key Isolation:** `Resume.storage_key` stores an opaque random UUID filename. Filesystem paths are never exposed in database columns or API responses.
3. **Weight Sum Invariant:** Job requisition scoring weights must sum to exactly 100% (`skills_weight + experience_weight + education_weight + semantic_weight = 100`).
4. **Vector Persistence Status:** The `resume_embeddings` table exists in PostgreSQL schema migrations with `Vector(1024)`. In the current 5th-Semester SGP milestone, dense vector persistence to pgvector is **deferred by design** (per `ADR-001`). Application scoring relies on the explainable, deterministic baseline matcher; no production code writes to `resume_embeddings`.
5. **Cascade & Orphan Safety:** Deleting a DRAFT job cascades cleanly to its requirements. Closing an OPEN job retains all resume records and candidate evaluation histories.
