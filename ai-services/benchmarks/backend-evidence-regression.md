# Backend deterministic evidence regression checklist

The synthetic fixture below reproduced the reported regression on `cbe5a4d8bb1b665a5a5d832248b6aa3555dac219` through `DeterministicEvaluationEngine.evaluate`. The Python-only candidate scored 82.5 overall with 50.0 skill coverage. Appending `No experience with FastAPI.` incorrectly raised both scores to 100.0 and produced a `skill_match` claim anchored to the denial.

The backend currently admits every taxonomy-detected canonical skill into the candidate skill set before evaluating requirements. This gives a mention direct credit and can give an adjacent mention transferable credit. The extractor retains one occurrence per canonical name, so checking only its first snippet would miss a denial or positive claim elsewhere in the document.

## Exact fixture

Run from the backend with the following setup. The fixed semantic score isolates evidence and reproduces the original score delta. Use a separate run with the normal matcher for endpoint and ranking checks.

```python
from types import SimpleNamespace as N

from app.services.evaluation import DeterministicEvaluationEngine
from app.services.scoring import Weights


class FixedRelevance:
    def match(self, **kwargs):
        return N(
            similarity_score=100.0,
            matched_concepts=[],
            missing_concepts=[],
            diagnostics={},
        )


def evaluate(body="", declared=(), *, fastapi_required=True):
    base = "Built Python tools for internal operations."
    resume = N(extracted_text=f"{base}\n{body}" if body else base)
    candidate = N(
        total_experience_years=2.0,
        education={"skills": list(declared)},
        name="Synthetic candidate",
        headline="",
    )
    job = N(
        title="Backend Engineer",
        description="Build and maintain Python web services.",
        skills=[
            N(name="Python", required=True),
            N(name="FastAPI", required=fastapi_required),
        ],
        experience_min_years=0,
        education_required="Any",
    )
    result = DeterministicEvaluationEngine(semantic_matcher=FixedRelevance()).evaluate(
        job=job,
        candidate=candidate,
        resume=resume,
        weights=Weights(35, 30, 20, 15),
    )
    return result, resume.extracted_text
```

Use an empty `declared` list except where explicitly supplied. The expected skills scores assume the existing exact and half-credit transfer weights. The AI-service labels come from direct execution of `classify_skill_evidence` on these inputs. Backend expectations specify credit and provenance without requiring the AI-service response schema.

| Case | Exact `body` | `declared` | AI-service FastAPI evidence | Expected backend skills / overall |
| --- | --- | --- | --- | --- |
| Absent | Empty string | `[]` | `not_detected / unmentioned` | 50.0 / 82.5 |
| Current denial | `No experience with FastAPI.` | `[]` | `not_detected / explicit_negation` | 50.0 / 82.5 |
| Learning | `Currently learning FastAPI.` | `[]` | `insufficient_information / learning_intent` | 50.0 / 82.5 |
| Third party | `The company built a FastAPI platform.` | `[]` | `insufficient_information / third_party_experience` | 50.0 / 82.5 |
| Quoted posting | `The job posting says "FastAPI required".` | `[]` | `insufficient_information / quoted_mention` | 50.0 / 82.5 |
| Bare mention | `FastAPI is listed in the project README.` | `[]` | `insufficient_information / unqualified_mention` | 50.0 / 82.5 |
| Demonstration | `Built a FastAPI service for internal document search.` | `[]` | `supported / demonstrated_context` | 100.0 / 100.0 |
| Historical recovery | `Previously I had no experience with FastAPI; since then I built a FastAPI service.` | `[]` | `supported / demonstrated_after_historical_gap` | 100.0 / 100.0 |
| Unresolved contradiction | `I have no experience with FastAPI. Built a FastAPI project last year.` | `[]` | `insufficient_information / conflicting_mentions` | 50.0 / 82.5 |
| Self-declaration | Empty string | `["FastAPI"]` | `supported / declared_skill_token` | 100.0 / 100.0 with declaration-only wording |
| Declaration contradicts denial | `No experience with FastAPI.` | `["FastAPI"]` | `insufficient_information / conflicting_declaration_and_negation` | 50.0 / 82.5 |
| Demonstrated adjacent skill | `Built a Django service for internal document search.` | `[]` | `not_detected / unmentioned` | 75.0 / 91.25 with transferable FastAPI evidence through Django |
| Learning adjacent skill | `Currently learning Django.` | `[]` | `not_detected / unmentioned` | 50.0 / 82.5 |

On the reviewed backend, learning, third-party, quoted, bare, and conflicting FastAPI mentions also scored 100.0 / 100.0. Learning-only Django scored 75.0 / 91.25 as a FastAPI transfer.

## Assertions for the correction

- **Credit and scope.** Python stays matched in every fixture. FastAPI enters `matched_skills` only for a qualifying demonstration or an uncontradicted declaration. Test `Built a FastAPI project last year. I have no experience with FastAPI.` as well and expect the same conflict, zero FastAPI credit, and 50.0 skill coverage. Test `I am learning Kubernetes, but built a FastAPI service for internal document search.` and expect 100.0 coverage. Learning and negation must apply to the correct skill and clause.
- **Distinguish missing from explicit claims.** The absent row carries no source span and communicates that evidence was unavailable. The current denial has a source span and communicates what the candidate explicitly denied. Learning, third-party claims, quoted text, and unresolved conflicts carry the appropriate reason for uncertainty. Use existing compatible status and claim fields and confirm that every no-credit case remains nonmatched in the stored result and its API projections.
- **Declarations.** Use `candidate_profile` provenance, no resume offsets, and wording such as `Candidate declared FastAPI`. A declared skill can count under current policy. Avoid describing it as documented proficiency or assigning a skill level. With the demonstrated body and `declared=["FastAPI", "fastapi"]`, assert one FastAPI evaluated row, one linked primary claim, and stable 100.0 coverage.
- **Transfer.** Use the qualifying Django span as provenance for the inferred transfer. A required transferable FastAPI stays in `INSUFFICIENT_REQUIRED_EVIDENCE` with partial credit. A negated, quoted, third-party, or learning-only Django mention earns no transfer. If Django is demonstrated alongside an explicit FastAPI denial, preserve the denial and any separately described Django evidence. Never upgrade the denied requirement to direct FastAPI support.
- **Required versus preferred.** Rerun the empty, current-denial, and demonstration rows with `fastapi_required=False`. The expected skills / overall values are 80.0 / 93.0, 80.0 / 93.0, and 100.0 / 100.0. Each FastAPI item retains `required=False`, and the matched required Python keeps the candidate in `NO_COMPUTABLE_REQUIRED_GAPS`. Rerun with FastAPI mandatory and assert that every zero-credit or transferable row stays below the fully covered tier, including when semantic relevance is high.
- **Span fidelity.** Link each `EvaluatedSkill.evidence_ref` to the correct persisted `EvidenceClaim.id`. Assert exclusive-end offsets against the original `Resume.extracted_text`. In the controlled fixture, the FastAPI token is at `[63:70]` for the current denial and `[52:59]` for the demonstration. For historical recovery, the positive token is at `[110:117]`, after the denial token at `[80:87]`. Assert that the selected source points to the positive clause. If the implementation uses clause-wide offsets, assert that they enclose the corresponding token and that the original slice matches the cited clause.
- **Persistence and API.** Test the real recruiter evaluation entry point, `POST /api/v1/applications/{application_id}/evaluate`, then inspect the recruiter card, `GET /api/v1/jobs/{job_id}/candidates/{candidate_id}`, and the owning candidate's `GET /api/v1/applications/{application_id}/match-results`. Check the status, claim wording, source, and `required` flag after a database round trip. The candidate projection currently maps three claim types explicitly, while the recruiter projection defaults unrecognized types to matched. Check both before adding or changing persisted claim types. Preserve legacy records and verify how old evaluations are marked stale or reevaluated when evidence semantics change.
- **Ranking.** Apply for the same job with both the current-denial and demonstrated fixture resumes. Verify `GET /api/v1/jobs/{job_id}/candidates` places the current, fully covered candidate in the higher required-coverage tier. Keep lexical or neural relevance separate from mandatory evidence when checking this ordering.

These fixtures establish synthetic evidence behavior. They do not establish model accuracy or hiring suitability.
