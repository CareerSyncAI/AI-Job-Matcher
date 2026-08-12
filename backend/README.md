# CareerSync API

CareerSync's backend is a FastAPI modular monolith. It owns authentication,
authorization, PostgreSQL persistence, immutable evaluation snapshots, secure
resume ingestion, and the deterministic scoring/ranking rules. AI parsing and
embedding inference are intentionally separate worker responsibilities.

## Local setup

1. Run PostgreSQL and Redis from the repository root with `docker compose up -d postgres redis`.
2. Copy `.env.example` to `.env` and replace the JWT secret.
3. Install dependencies with `poetry install`.
4. Apply migrations with `poetry run alembic upgrade head`.
5. Start the API with `poetry run uvicorn app.main:app --reload`.

The health check is available at `GET /health`; versioned endpoints live under
`/api/v1`. Do not use the API without a configured PostgreSQL database.

## Security boundary

The backend, not Next.js routes, enforces identity, roles, resource ownership,
and resume access. Uploaded files are stored outside the served application
directory using generated storage keys; original filenames and filesystem paths
are not exposed by API responses.
