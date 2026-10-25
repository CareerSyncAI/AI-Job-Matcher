# CareerSync AI Architecture

Status: active architecture baseline, August 2026.

## Runtime shape

```text
Next.js 16 frontend → FastAPI modular monolith → PostgreSQL 16 (Relational schema; pgvector deferred)
                                        ├── Redis/Celery queue (Optional; synchronous inline default)
                                        └── AI/NLP service boundary (FastAPI port 8001, Contract v1.1.0)
```

The backend is the security and domain authority. Frontend routing or middleware
is not an authorization boundary. The AI boundary may parse and infer signals,
but it never decides access, recruiter ownership, or final ranking policy. Recruiter
ranking is driven 100% deterministically by `DeterministicEvaluationEngine` using
canonical extractions and `SublinearTFCosineMatcher`. Diagnostic dense embeddings
(`all-MiniLM-L6-v2`) do not control candidate ranking. Fuzzy score `rapidfuzz_score`
is computed using standard library `difflib.SequenceMatcher`.

## Repository mapping

- `frontend/`: active Next.js 16 application with Hybrid Glassmorphism (React 19, TypeScript, Tailwind CSS v4).
- `backend/`: FastAPI API, SQLAlchemy models, Alembic migrations, security, and deterministic scoring services.
- `database/`: reserved for database fixtures/seeds; schema migrations live with the backend.
- `ai-services/`: FastAPI AI microservice on port 8001 under Contract v1.1.0 (`pdfplumber` / `pypdf`, `python-docx`, rule-based section/skill/experience/education extractors, and diagnostic `all-MiniLM-L6-v2` dense matcher).

## Domain flow

```text
Job → Requirements → Candidate → Resume → Application → EvaluationRun → immutable MatchResult
```

`Application` is the first-class bridge between a candidate and a job.
`MatchResult` is an immutable snapshot. Requirement, resume, model, parser, or
saved scoring changes create a new evaluation run; presentation changes and
temporary what-if previews do not mutate a result.

## Deterministic policy

Required-requirement coverage tiers precede weighted fit score. Exact ties use
skills, experience, education, semantic score, and stable opaque candidate ID.
Experience merges overlapping professional intervals and excludes internships
by default. Education uses PhD ≥ Master ≥ Bachelor. Transferable skills require
an explicit taxonomy mapping; semantic similarity alone cannot create that status.

## Security boundary

FastAPI independently verifies identity, role, and resource ownership for every
protected operation. Uploads are restricted to PDF/DOCX, limited to 10 MB,
signature-checked, hashed with SHA-256, stored under generated keys outside the
served application directory, and rejected when identical content is already
associated with the same job.

The old Express/MongoDB design is historical and is no longer the active target.
