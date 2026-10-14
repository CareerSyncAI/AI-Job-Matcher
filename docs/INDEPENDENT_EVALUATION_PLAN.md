# Independent Candidate-Job Evaluation Plan

## Purpose

The bundled five-pair synthetic regression fixture prevents code regressions. It is not a benchmark of hiring relevance, ranking quality, fairness, or model readiness. This plan defines the minimum evidence needed to compare the deterministic baseline and a future embedding matcher.

## Pilot dataset

Create 100–300 permitted candidate-job pairs. Use synthetic resumes or permissioned/public material that has been reviewed for terms and privacy. Do not commit raw resumes or large source datasets.

For each pair, record:

- anonymous candidate and job IDs;
- source type (`synthetic`, `permitted_public`, or `permissioned`);
- relevance label: `strong_match`, `partial_match`, `weak_match`, or `insufficient_information`;
- required and preferred skill evidence states;
- experience and education evidence, including uncertainty;
- short rationale tied to observable job criteria;
- annotator pseudonym, annotation date, and adjudication status.

An absent skill mention is `not_detected`; it is not proof that the candidate lacks the skill. Use a confirmed gap only when the annotation rules support that conclusion.

## Review and splits

Independently review at least a subset with two reviewers and record disagreements and adjudication. Deduplicate candidates, resumes, and jobs before splitting. Keep the same candidate and preferably the same job family out of both tuning and held-out splits.

Use separate development, tuning, and held-out partitions. Do not tune thresholds, chunking, prompts, or score transformations against the held-out partition.

## Comparisons and metrics

Run the deterministic baseline and embedding method on the identical cases, using recorded model ID, immutable revision, preprocessing version, hardware, evaluation date, and feature settings.

Report sample size with every result. Use NDCG@k, Precision@k, Recall@k, pairwise ordering accuracy, or Spearman correlation only when the labels and grouping make each metric valid. Keep `insufficient_information` separate from positive and negative relevance judgments.

Measure skill extraction precision/recall/F1, required-skill evidence detection, experience MAE, education accuracy, per-pair latency, cold-start time, warm inference latency, and CPU/RAM or GPU/VRAM use.

## Error analysis

Slice results by job family, seniority, long resumes, sparse resumes, formatting quality, and incomplete or ambiguous information. Review failures where semantic similarity disagrees with deterministic skill evidence. Preserve verbatim evidence offsets and do not fabricate quotations.

## Decision rule

Do not use an embedding result in final ranking until the held-out evaluation, latency/resource measurements, contract tests, and rollback behavior have been reviewed. These results do not establish fairness, legal compliance, or production readiness.
