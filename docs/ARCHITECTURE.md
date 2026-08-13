# CareerSync AI Architecture

Status: active architecture baseline, August 2026.

## Runtime shape

```text
Next.js frontend → FastAPI modular monolith → PostgreSQL + pgvector
                                      ├── Redis/Celery resume-processing queue
                                      └── AI/NLP service boundary
```

The backend is the security and domain authority. Frontend routing or middleware
is not an authorization boundary. The AI boundary may parse and infer signals,
but it never decides access, recruiter ownership, or final ranking policy.

## Repository mapping

- `frontend/`: active Next.js 16 application with Hybrid Glassmorphism.
- `backend/`: FastAPI API, SQLAlchemy models, Alembic migrations, security, and domain services.
- `database/`: reserved for database fixtures/seeds; schema migrations live with the backend.
- `ai-services/`: reserved AI worker/service implementation; currently an explicit integration boundary.

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
