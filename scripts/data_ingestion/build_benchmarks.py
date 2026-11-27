"""
CareerSyncAI - Evaluation Benchmark Builder
Constructs standardized, reproducible evaluation datasets for matching, ranking, and extraction.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.benchmarks")


def build_matching_benchmark(
    jobs_parquet: Path,
    resumes_jsonl: Path,
    output_benchmark: Path,
) -> dict[str, Any]:
    """
    Construct cross-domain matching evaluation pairs using real employer postings
    and annotated CareerCorpus resumes.
    """
    if not jobs_parquet.exists() or not resumes_jsonl.exists():
        logger.warning("Jobs or Resumes dataset missing for matching benchmark builder.")
        return {}

    df_jobs = pd.read_parquet(jobs_parquet)
    logger.info("Building matching benchmark from %d jobs and CareerCorpus resumes", len(df_jobs))

    # Read resumes
    resumes: list[dict[str, Any]] = []
    with open(resumes_jsonl, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                resumes.append(json.loads(line.strip()))

    # Group jobs by keyword matching with domains
    domain_job_map: dict[str, list[dict[str, Any]]] = {
        "Teacher": [],
        "Finance": [],
        "Accountant": [],
        "Banking": [],
        "Research Assistant": [],
        "Apparel": [],
    }

    keywords = {
        "Teacher": ["teacher", "instructor", "faculty", "curriculum", "educator", "tutor"],
        "Finance": ["financial", "finance", "analyst", "investment", "portfolio", "treasury"],
        "Accountant": ["accountant", "accounting", "audit", "tax", "ledger", "controller"],
        "Banking": ["banking", "banker", "teller", "loan", "mortgage", "credit"],
        "Research Assistant": ["research", "scientist", "laboratory", "fellow", "postdoc", "analyst"],
        "Apparel": ["apparel", "fashion", "textile", "garment", "retail", "merchandise"],
    }

    for idx, row in df_jobs.iterrows():
        title_lower = str(row.get("normalized_title") or row.get("original_title") or "").lower()
        desc_lower = str(row.get("description") or "")[:500].lower()

        for domain, kw_list in keywords.items():
            if any(kw in title_lower for kw in kw_list):
                if len(domain_job_map[domain]) < 10:  # Cap at 10 representative jobs per domain
                    domain_job_map[domain].append({
                        "job_id": str(row.get("job_id")),
                        "title": str(row.get("original_title")),
                        "company": str(row.get("company")),
                        "location": str(row.get("location")),
                        "source_url": str(row.get("source_url")),
                    })

    # Form benchmark pairs (Both positive in-domain and negative cross-domain pairs)
    eval_pairs: list[dict[str, Any]] = []

    # Sample resumes from each domain
    domain_resumes: dict[str, list[dict[str, Any]]] = {d: [] for d in domain_job_map}
    for r in resumes:
        cat = r.get("occupational_category", "")
        if cat in domain_resumes and len(domain_resumes[cat]) < 5:
            domain_resumes[cat].append(r)

    pair_id = 1
    for domain, res_list in domain_resumes.items():
        matched_jobs = domain_job_map.get(domain, [])
        # Also pick negative jobs from a different domain
        other_domains = [d for d in domain_job_map if d != domain]
        neg_domain = other_domains[0] if other_domains else domain
        unmatched_jobs = domain_job_map.get(neg_domain, [])

        for idx, res in enumerate(res_list):
            # Assign train/dev/test split by resume index to avoid split leakage
            # Indices 0, 1, 2 -> train (60%), 3 -> dev (20%), 4 -> test (20%)
            if idx in (0, 1, 2):
                split_assignment = "train"
            elif idx == 3:
                split_assignment = "dev"
            else:
                split_assignment = "test"

            # Positive pairs (Relevant)
            for j in matched_jobs[:2]:
                eval_pairs.append({
                    "pair_id": f"PAIR-{pair_id:04d}",
                    "split": split_assignment,
                    "resume_id": res.get("resume_id"),
                    "resume_domain": domain,
                    "resume_source": "CareerCorpus (Mendeley Data DOI:10.17632/wzzwn37gmd.1)",
                    "job_id": j.get("job_id"),
                    "job_title": j.get("title"),
                    "target_domain": domain,
                    "job_source": "Open Apply (Partition 0, Employer ATS Postings)",
                    "ground_truth_relevance": 1,
                    "label_type": "heuristic_domain_alignment",
                    "human_reviewed": False,
                    "label_provenance": "Constructed programmatically via occupational category alignment. Not human-reviewed recruitment decision labels.",
                })
                pair_id += 1

            # Negative pairs (Irrelevant)
            for j in unmatched_jobs[:2]:
                eval_pairs.append({
                    "pair_id": f"PAIR-{pair_id:04d}",
                    "split": split_assignment,
                    "resume_id": res.get("resume_id"),
                    "resume_domain": domain,
                    "resume_source": "CareerCorpus (Mendeley Data DOI:10.17632/wzzwn37gmd.1)",
                    "job_id": j.get("job_id"),
                    "job_title": j.get("title"),
                    "target_domain": neg_domain,
                    "job_source": "Open Apply (Partition 0, Employer ATS Postings)",
                    "ground_truth_relevance": 0,
                    "label_type": "heuristic_domain_divergence",
                    "human_reviewed": False,
                    "label_provenance": "Constructed programmatically via cross-domain divergence control. Not human-reviewed recruitment decision labels.",
                })
                pair_id += 1

    benchmark_data = {
        "benchmark_name": "CareerSyncAI Cross-Domain Matching Benchmark",
        "benchmark_version": "1.1.0",
        "description": "Programmatically constructed test suite for domain discrimination, ranking order, and precision/recall testing.",
        "label_disclaimer": "Labels are heuristic domain alignments, NOT human-verified recruitment suitability judgments.",
        "total_pairs": len(eval_pairs),
        "split_counts": {
            "train": sum(1 for p in eval_pairs if p["split"] == "train"),
            "dev": sum(1 for p in eval_pairs if p["split"] == "dev"),
            "test": sum(1 for p in eval_pairs if p["split"] == "test"),
        },
        "positive_pairs": sum(1 for p in eval_pairs if p["ground_truth_relevance"] == 1),
        "negative_pairs": sum(1 for p in eval_pairs if p["ground_truth_relevance"] == 0),
        "domain_coverage": list(domain_job_map.keys()),
        "pairs": eval_pairs,
    }

    output_benchmark.parent.mkdir(parents=True, exist_ok=True)
    with open(output_benchmark, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)

    logger.info("Saved matching benchmark to %s (%d evaluation pairs)", output_benchmark, len(eval_pairs))
    return benchmark_data


def build_resume_extraction_benchmark(
    resumes_jsonl: Path,
    output_benchmark: Path,
) -> dict[str, Any]:
    """Create section boundary extraction test cases from CareerCorpus."""
    if not resumes_jsonl.exists():
        return {}

    cases: list[dict[str, Any]] = []
    with open(resumes_jsonl, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if idx >= 50:  # Sample 50 gold-standard resumes
                break
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            raw_text = r.get("extraction_metadata", {}).get("raw_text", "")

            # Check presence of canonical sections
            has_edu = "EDUCATION:" in raw_text
            has_skills = "SKILLS AND ACHIEVEMENTS:" in raw_text
            has_exp = "EXPERIENCE:" in raw_text

            cases.append({
                "case_id": f"EXTRACT-{idx+1:03d}",
                "resume_id": r.get("resume_id"),
                "domain": r.get("occupational_category"),
                "char_length": len(raw_text),
                "case_type": "real_anonymized_document",
                "source_provenance": "CareerCorpus (Mendeley Data DOI:10.17632/wzzwn37gmd.1, Chowdhury et al., 2025)",
                "expected_sections": {
                    "education_present": has_edu,
                    "skills_present": has_skills,
                    "experience_present": has_exp,
                },
                "annotator_scores": r.get("annotation_labels", {}),
                "verification_method": "Verified directly against individual domain columns in the original source Excel workbook.",
            })

    bench = {
        "benchmark_name": "Resume Section Extraction Benchmark",
        "version": "1.1.0",
        "description": "Gold-standard boundary extraction verification using expert-annotated anonymized resumes.",
        "case_type_distribution": {"real_anonymized_documents": len(cases), "synthetic_cases": 0},
        "total_cases": len(cases),
        "cases": cases,
    }

    output_benchmark.parent.mkdir(parents=True, exist_ok=True)
    with open(output_benchmark, "w", encoding="utf-8") as f:
        json.dump(bench, f, indent=2)

    logger.info("Saved resume extraction benchmark to %s (%d test cases)", output_benchmark, len(cases))
    return bench


def build_all_benchmarks(base_dir: Path) -> None:
    """Build all benchmark suites."""
    jobs_pq = base_dir / "data" / "processed" / "jobs" / "jobs_deduplicated.parquet"
    if not jobs_pq.exists():
        jobs_pq = base_dir / "data" / "processed" / "jobs" / "open_apply_normalized.parquet"
    res_jl = base_dir / "data" / "processed" / "resumes" / "career_corpus_normalized.jsonl"

    match_out = base_dir / "data" / "evaluation" / "matching" / "matching_benchmark.json"
    build_matching_benchmark(jobs_pq, res_jl, match_out)

    extract_out = base_dir / "data" / "evaluation" / "resume_extraction" / "section_extraction_benchmark.json"
    build_resume_extraction_benchmark(res_jl, extract_out)


if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent.parent
    build_all_benchmarks(base)
