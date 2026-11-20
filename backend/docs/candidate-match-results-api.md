# Candidate Match Results API

## Request

`GET /api/v1/applications/{application_id}/match-results`

Send `Authorization: Bearer <access_token>` for a candidate account. The API resolves the candidate profile from the authenticated user and queries by both `application_id` and `candidate_id`. Missing and non-owned applications both return 404. An invalid UUID returns 422.

## Successful response

The response is the dedicated `CandidateMatchResultsDTO`. UUIDs are strings; `evaluated_at` is an ISO timestamp. `company_name`, `overall_match_score`, and `evaluated_at` may be null. Skill and recommendation collections are arrays (empty when no stored data supports them). Each `skill_evidence` item contains string `requirement`, string `claim`, nullable string `sourceText`, string `type` (`matched`, `transferable`, or `not_detected`), and nullable string `details`.

When a completed result exists, `experience` contains nullable numeric `candidate_years`, numeric `required_years`, numeric `alignment_score`, and nullable numeric `tenure_delta_years`. `education` contains nullable string `candidate_degree`, string `required_education`, and numeric `alignment_score`. Recommendations are emitted only for missing skills that have a persisted `not_detected` evidence claim. Values that depend on a profile may be null when the profile has no value.

If no completed run with a MatchResult exists, `evaluation_status` is `pending` if a run is queued or running, otherwise `unavailable`; score, timestamp, experience, and education are null and collections are empty.

Synthetic response:

```json
{
  "application_id": "11111111-1111-4111-8111-111111111111",
  "application_status": "under_review",
  "job_id": "22222222-2222-4222-8222-222222222222",
  "job_title": "Backend Engineer",
  "company_name": "Example Org",
  "overall_match_score": 76.5,
  "evaluation_status": "completed",
  "evaluated_at": "2026-11-21T10:30:00Z",
  "matched_skills": ["Python"],
  "missing_skills": ["PostgreSQL"],
  "transferable_skills": ["REST APIs"],
  "skill_evidence": [{"requirement": "Skill Match", "claim": "Directly matched skill from resume: Python", "sourceText": "Python", "type": "matched", "details": null}],
  "experience": {"candidate_years": 3.0, "required_years": 2.0, "alignment_score": 100.0, "tenure_delta_years": 1.0},
  "education": {"candidate_degree": "Bachelor", "required_education": "Bachelor", "alignment_score": 100.0},
  "recommendations": ["Consider adding relevant PostgreSQL experience or evidence to your resume if you have it."]
}
```

Errors: 401 missing/invalid authentication; 403 authenticated user is not a candidate; 404 unknown or non-owned application; 422 invalid application UUID. Recruiter notes, scoring weights, resume identifiers/storage paths, and internal ranking metadata are excluded. Scores and classifications come from persisted evaluation results; no independent API scoring is performed.
