# CareerSync AI Database

The active database is PostgreSQL with SQLAlchemy 2.x, Alembic migrations, and
the pgvector extension. The initial migration is
`backend/alembic/versions/0001_initial_schema.py`.

## Core tables

`users`, `recruiter_profiles`, `candidate_profiles`, `jobs`, `job_skills`,
`resumes`, `applications`, `evaluation_runs`, `match_results`,
`evaluated_skills`, `evidence_claims`, `recruiter_notes`, `audit_events`,
`refresh_sessions`, and `resume_embeddings`.

## Invariants

- User email, candidate email, job-scoped resume content hash, and job/candidate application pairs are unique where applicable.
- Job weights are non-negative and sum to exactly 100.
- `MatchResult` is a historical snapshot and is never updated in place.
- Closing a job does not delete resumes or evaluation data.
- Resume storage keys are opaque and never expose filesystem paths.
- Embeddings inherit the authorization scope of their source resume/application.

Run migrations with `poetry run alembic upgrade head` from `backend/` after
PostgreSQL and the pgvector extension are available.
