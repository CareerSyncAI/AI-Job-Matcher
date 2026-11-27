# Matching challenge

The A4 challenge contains 22 entirely synthetic candidate profiles for four synthetic requisitions. Each profile belongs to one requisition. Each requisition owns its candidate comparisons. The set is diagnostic and evaluation-only, with no training, development, or held-out partitions. There is no duplicated candidate payload, requisition payload, or cross-partition assignment. The synthetic cases and labels were authored for this work before running either engine. They have no independent recruiter annotation.

The fixture records three kinds of expectations:

- **Evidence.** Each required and preferred skill is labeled from the words and their attribution. A structured skill declaration supports a claim without verifying proficiency. Unambiguous equivalents such as Golang for Go count as evidence. Adjacent technologies such as Pulsar for Kafka remain distinct. Sparse material, explicit denial, and third-party use have different implications. Each case explains the authored labels.
- **Topical relevance.** Eleven same-job pairwise comparisons contrast the work topic with a less related example. The author also labeled profiles containing denial or transferable skills as topically relevant when the work belongs to the same area.
- **Qualification evidence.** Ten same-job pairwise comparisons cover explicitly scoped mandatory evidence or the stated seniority requirement. These labels describe the supplied text and the requisition. They do not estimate hiring suitability.

The fixture covers exact matches, same-domain omissions, negation, learning, third-party attribution, quoted requirements, keyword stuffing, skill transfer, seniority, relevance, ambiguous names, equivalent terminology, conflicts, chronological changes, structured sections, sparse declarations, and absent material. The deliberately concentrated cases are useful for regressions and do not estimate deployment error rates.

## Existing fixtures reviewed

| Fixture | What it measures | Label and partition limits |
| --- | --- | --- |
| 75-pair cross-domain set in `data/evaluation/matching/matching_benchmark.json` | Heuristic occupational overlap for 35 positive and 40 negative pairings. | Counting IDs in the file gave 20 distinct candidate resumes with zero crossing the 45/15/15 partitions. All eight distinct job IDs cross partitions. Match labels are programmatic domain alignment. |
| 50-case set in `data/evaluation/resume_extraction/section_extraction_benchmark.json` | Section presence for education, skills, and experience. | The documented labels come from populated source columns in CareerCorpus. The fixture carries presence flags and author scores, with no match labels or section-boundary offsets. |
| 30-pair curated similarity set in `ai-services/fixtures/evaluation/evaluation_benchmark.json` | Ordinal relevance of synthetic or curated examples. | Validation found 30 candidate IDs and 12 job IDs, none crossing the 15/15 split. Exact serialized payloads also showed no cross-split reuse. The fixture has no independent qualification or hiring annotation. |
| Existing tests in `ai-services/tests/test_similarity_engine.py` | Direct evidence classification and matcher behavior. | Includes contextual negation, quotes, learning, third-party use, historical resolution, conflicting declarations, and token boundaries. These tests assert behavior for individual examples. |

## Controlled results

Run from `ai-services` with a cached copy of the repository-pinned model:

```powershell
python benchmarks/run_challenge.py --repeats 3
```

The runner sends the same payload to each current matcher and disables fallback for measured embedding inference. It separately injects load and encoding errors to verify fallback. It records scores and mismatches by case in JSON. It times synchronous matcher calls on one process, with independent cache-cold and cache-hot runs over identical cases, alternating phase order. Warm timings exclude initialization and deliberate cache priming. They include tokenization, candidate inference, job inference when needed, and evidence classification. The test suite validates data integrity and stable evidence controls without requiring MiniLM for the added benchmark tests.

The run on 2026-11-27 used Windows on an Intel Core i5-12450HX CPU, Python 3.11.9, PyTorch 2.14.1+cpu, Sentence Transformers 6.1.0, and Transformers 5.19.0. The model loaded offline as `sentence-transformers/all-MiniLM-L6-v2`, revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, and returned 384-dimensional vectors and `sentence_embedding` results. Every measured engine call returned `ok`.

### Evidence

To measure the evidence change, the same challenge was run against code exported from starting commit `cbe5a4d8bb1b665a5a5d832248b6aa3555dac219`. The four cases with status differences included section-only demonstrations, a historical denial followed by project work, and conflicting claims split across fields. Eighteen cases had a difference somewhere in their full evidence breakdown, including note text. After the shared evaluation change there were zero case-level differences in either status or breakdown.

| Measure | Starting lexical | Starting MiniLM | Updated lexical | Updated MiniLM |
| --- | ---: | ---: | ---: | ---: |
| Exact evidence statuses out of 58 | 44 | 51 | 53 | 53 |
| False-positive supported labels | 3 | 3 | 2 | 2 |
| False-negative supported labels | 10 | 4 | 3 | 3 |
| Supported mandatory evidence missed | 7 | 3 | 2 | 2 |
| Unsupported mandatory evidence incorrectly marked supported | 2 | 2 | 1 | 1 |
| Mandatory rows omitted from the breakdown | 0 | 0 | 0 | 0 |

The final labels included 20 true positives and 33 true negatives under the binary supported-or-unsupported test. The exact status metric keeps `insufficient_information` separate from `not_detected`. Every expected evidence row was returned.

| Remaining case | Expected evidence | Actual evidence |
| --- | --- | --- |
| Docker work by engineers at another vendor | Insufficient | Supported. The actor cue was unrecognized. |
| Golang work for a mandatory Go requirement | Supported | Not detected. The exact matcher missed the equivalent name. |
| Go-live checklist for a mandatory Go requirement | Not detected | Supported. The hyphenated business term passed the token boundary and action-verb check. |
| DLP work for a mandatory Data Loss Prevention requirement | Supported | Not detected. The exact matcher missed the acronym. |
| Expanded SIEM name for a preferred SIEM requirement | Supported | Not detected. The exact matcher missed the expansion. |

### Score discrimination

Counts below are ordered correctly, tied, and reversed. Comparisons are same-requisition throughout.

| Authored comparison | Lexical | MiniLM |
| --- | --- | --- |
| Topical relevance with raw cosine, 11 pairs | 10 / 1 / 0 | 11 / 0 / 0 |
| Topical relevance with display index, 11 pairs | 10 / 1 / 0 | 11 / 0 / 0 |
| Qualification evidence with raw cosine, 10 pairs | 7 / 0 / 3 | 7 / 0 / 3 |
| Qualification evidence with display index, 10 pairs | 5 / 3 / 2 | 7 / 0 / 3 |
| Qualification evidence with all supported mandatory skills first and raw cosine within a group, 10 pairs | 8 / 0 / 2 | 9 / 0 / 1 |

That last row is a diagnostic rule in the runner. It uses the current hard skill statuses and does not independently verify seniority or proficiency. The rule fixes the three MiniLM reversals in the API group and creates a new Go reversal because the evidence matcher accepts “go-live” and misses “Golang.” MiniLM raw cosine originally put Golang work ahead, 0.6396 versus 0.2594. The lexical rule also reverses the Go pair and still places the intern above the experienced streaming lead.

The lexical display index reached 100 on four API profiles. The display formula clamps `1.8 × raw cosine` at one, so raw cosine at or above 0.5556 saturates the index. The four cases include the fully supported profile (raw 0.6611), missing FastAPI (0.7563), denied FastAPI (0.6213), and repeated keywords with no substantive claim (0.6109). The earlier 30-pair fixture showed the same pattern in a separate rerun, with 7/30 lexical indices at 100 and 0/30 MiniLM indices at 100. On the new challenge MiniLM reached a maximum of 75.5 with no scores at 100. Even with those distinctions, the three weaker API profiles scored 75.5, 65.1, and 65.8 respectively, above the fully supported profile at 64.0. Whole-profile similarity responds to overlapping terms even when the surrounding evidence is insufficient or negative.

The lexical semantic scorer reads headline, declared skills, and summary. MiniLM reads structured sections when supplied. The new shared evidence evaluation reads both. In a separate lexical sensitivity check, each profile with sections had a projected summary consisting of the original summary followed by the section values joined with newlines. Blank and exact duplicate parts were removed. The runner's same-job comparisons were recomputed without changing either matcher.

With this projection the experienced streaming lead rose from 0.3982 to 0.5878 (intern 0.4487) and the section-only direct privacy profile rose from 0 to 0.5099 (privacy transfer 0.0823). The projected lexical matcher ordered all 11 topical comparisons correctly. It got 9/10 raw qualification comparisons correct, with the requirements-absent API reversal remaining. Its display index still tied three API qualification contrasts. With the mandatory-first rule it reached 9/10, with the same Go reversal as MiniLM. This identifies section access as a contributor to the differences in the main comparison.

MiniLM increased the streaming-transfer versus unrelated margin from 0.0603 lexical to 0.2217 and the privacy-transfer margin from 0.0823 to 0.2778, with the intended ordering in both engines.

### Latency, cache, and failure handling

| Local CPU timing | Median | Nearest-rank p95 |
| --- | ---: | ---: |
| Lexical warm | 0.148 ms | 0.394 ms |
| MiniLM warm model, job cache cleared for each request | 33.50 ms | 40.52 ms |
| MiniLM warm model, all requisitions primed | 15.83 ms | 24.09 ms |

Each row has 66 timed requests. The first lexical match including construction took 2.05 ms. MiniLM model initialization with cached weights took 14.07 seconds and its first match took another 44.67 ms, for 14.11 seconds end-to-end. Initialization includes model library import after the runner's own imports. The cache held eight job chunk embeddings after priming. The job cache reduced median warmed-request latency by about 53% and preserved the scores within 1e-7 and full evidence for every paired comparison in the final round. A separate run of the existing cache microbenchmark, with six repeats on one job, gave uncached and cached medians of 32.90 and 16.15 ms and passed its score-equality check. These are local single-process observations. Startup, concurrency, cache hit rate, and service overhead can change deployed latency.

The injected model-load and encoding exceptions returned the deterministic score and evidence with `method=fallback`, `status=fallback`, and a diagnostic reason when fallback was enabled. With fallback disabled both exceptions propagated. The pinned model also ran real offline inference during the measured phase. The deliberate faults are repeatable controls for the service's error branches.

### Verification after the dependency upgrades

The isolated Windows Python 3.11.9 environment with PyTorch 2.15.0+cpu, Sentence Transformers 6.1.0, and Transformers 5.19.0 repeated the challenge with 66 timed requests per phase and `OMP_NUM_THREADS=2`, `MKL_NUM_THREADS=2`. Evidence counts, the five evidence mismatches, same-job order tallies, and fallback outcomes reproduced. Both engines returned identical evidence for all 22 profiles. The same pinned MiniLM revision produced 384-dimensional vectors on CPU.

| Local CPU timing after upgrades | Median | Nearest-rank p95 |
| --- | ---: | ---: |
| Lexical warm | 0.183 ms | 0.483 ms |
| MiniLM warm model, job cache cleared for each request | 46.14 ms | 61.60 ms |
| MiniLM warm model, all requisitions primed | 21.91 ms | 31.62 ms |

Cold MiniLM initialization plus first inference took 11.72 seconds, including 52.52 ms for the first match after model load. The lexical first match including construction took 1.57 ms. The warm job cache held eight chunks and preserved scores and evidence across both cache phases.
