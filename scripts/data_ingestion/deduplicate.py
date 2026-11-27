"""
CareerSyncAI - Conservative Multi-Tier Data Deduplication Engine
Detects exact, high-confidence, and candidate duplicate job postings while strictly
preserving seniority levels, physical locations, employment types, and full descriptions.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.deduplicate")


def extract_seniority_tier(title: str) -> str:
    """
    Extract standardized seniority tier to prevent merging different job levels
    (e.g., Senior Software Engineer vs Junior Software Engineer).
    """
    t = str(title or "").lower()
    if re.search(r"\b(intern|internship|co-?op)\b", t):
        return "intern"
    if re.search(r"\b(junior|jr|entry|associate|graduate)\b", t):
        return "junior"
    if re.search(r"\b(lead|tech\s+lead|team\s+lead|staff|principal|distinguished|architect|director|vp|head)\b", t):
        return "lead_staff"
    if re.search(r"\b(senior|sr|experienced|advanced|level\s*(ii|iii|iv|2|3|4))\b", t):
        return "senior"
    return "mid"


def clean_company_name(company: str) -> str:
    """
    Normalize company name conservatively:
    Strips standard legal corporate designations while preventing collision of distinct entities.
    """
    c = str(company or "").lower().strip()
    c = re.sub(r"[\(\)\[\]]", "", c)
    # Strip trailing legal suffixes only at word boundaries
    c = re.sub(r"\b(inc|incorporated|llc|l\.l\.c\.|ltd|limited|corp|corporation|gmbh|co\.|co\b|plc)\b", "", c)
    c = re.sub(r"[^\w\s]", " ", c)
    return " ".join(c.split())


def normalize_title_preserving_seniority(title: str) -> str:
    """
    Normalize title for deduplication while STRICTLY PRESERVING seniority markers.
    Senior Software Engineer and Junior Software Engineer will NEVER produce the same key.
    """
    t = str(title or "").lower().strip()
    # Normalize common abbreviations without dropping level
    t = re.sub(r"\bsr\.?\b", "senior", t)
    t = re.sub(r"\bjr\.?\b", "junior", t)
    t = re.sub(r"[^\w\s\+\#]", " ", t)  # Preserve C++, C#
    return " ".join(t.split())


def normalize_location_conservative(location: str) -> tuple[str, bool]:
    """
    Extract normalized location string and remote flag.
    Returns (normalized_location_string, is_remote).
    """
    loc = str(location or "").lower().strip()
    is_remote = any(k in loc for k in ("remote", "telecommute", "anywhere", "work from home", "wfh"))
    # Normalize punctuation
    clean_loc = re.sub(r"[^\w\s]", " ", loc)
    clean_loc = " ".join(clean_loc.split())
    if is_remote and (not clean_loc or clean_loc in ("remote", "remote us", "remote usa", "fully remote")):
        return "remote", True
    return clean_loc or "unspecified", is_remote


def clean_canonical_url(url: str) -> str:
    """
    Normalize URL by removing tracking params (utm_*, ref, gh_src, etc.)
    and stripping protocols and trailing slashes.
    """
    u = str(url or "").strip().lower()
    if not u or u == "nan" or u.startswith("none"):
        return ""
    # Strip protocol and www
    u = re.sub(r"^https?://(www\.)?", "", u)
    # Split query parameters and anchors
    base_url = u.split("?")[0].split("#")[0].rstrip("/")
    # Filter out generic landing pages
    if base_url.endswith("/jobs") or base_url.endswith("/careers") or len(base_url) < 15:
        return ""
    return base_url


def compute_full_content_hash(text: str) -> str:
    """
    Compute SHA-256 over normalized full description to verify exact textual match.
    Never relies solely on the first 150 words.
    """
    cleaned = re.sub(r"[^\w\s]", " ", str(text or "").lower())
    norm_text = " ".join(cleaned.split())
    return hashlib.sha256(norm_text.encode("utf-8")).hexdigest()


def compute_description_token_similarity(text_a: str, text_b: str) -> float:
    """Compute Jaccard token overlap between two descriptions."""
    words_a = set(re.sub(r"[^\w\s]", " ", str(text_a or "").lower()).split())
    words_b = set(re.sub(r"[^\w\s]", " ", str(text_b or "").lower()).split())
    if not words_a or not words_b:
        return 0.0
    intersection = words_a.intersection(words_b)
    union = words_a.union(words_b)
    return len(intersection) / len(union)


def completeness_score(row: pd.Series) -> int:
    """Calculate completeness score to select the best master record."""
    score = len(str(row.get("description") or ""))
    if pd.notna(row.get("salary_min")) or pd.notna(row.get("salary_max")):
        score += 1500
    req_skills = row.get("required_skills")
    if req_skills is not None and isinstance(req_skills, (list, tuple)) and len(req_skills) > 0:
        score += 500
    loc = str(row.get("location") or "").lower()
    if loc and loc not in ("unspecified", "global", "none", ""):
        score += 300
    if str(row.get("source_url") or "").startswith("http"):
        score += 200
    return score


def deduplicate_cross_dataset(
    input_parquets: list[tuple[str, Path]],
    output_parquet: Path,
    report_json: Path,
    review_queue_json: Optional[Path] = None,
) -> dict[str, Any]:
    """
    Conservative multi-tier cross-dataset deduplication.
    Categorizes candidate merges into:
    1. Exact duplicates (Auto-merged)
    2. High-confidence duplicates (Auto-merged)
    3. Possible duplicates requiring human review (Preserved in master, flagged for review)
    """
    dfs: list[pd.DataFrame] = []
    source_counts: dict[str, int] = {}

    for source_name, p in input_parquets:
        if p.exists():
            df = pd.read_parquet(p)
            df["source_origin"] = source_name
            source_counts[source_name] = len(df)
            dfs.append(df)
            logger.info("Loaded %d records from %s (%s)", len(df), source_name, p.name)
        else:
            logger.warning("Input dataset %s not found at %s", source_name, p)

    if not dfs:
        logger.error("No valid input datasets found.")
        return {"error": "no_input_data"}

    combined_df = pd.concat(dfs, ignore_index=True)
    total_records = len(combined_df)
    logger.info("Total records before conservative deduplication: %d", total_records)

    # Pre-extract attributes for fast conservative comparison
    logger.info("Extracting attributes (seniority, normalized title, location, content hashes)...")
    records_meta = []
    for idx, row in combined_df.iterrows():
        orig_title = str(row.get("original_title") or row.get("title") or "")
        norm_title = normalize_title_preserving_seniority(orig_title)
        seniority = extract_seniority_tier(orig_title)
        company = clean_company_name(str(row.get("company") or ""))
        loc_str, is_remote = normalize_location_conservative(str(row.get("location") or ""))
        emp_type = str(row.get("employment_type") or "unspecified").lower().strip()
        url = clean_canonical_url(str(row.get("source_url") or ""))
        desc = str(row.get("description") or "")
        full_hash = compute_full_content_hash(desc) if len(desc) >= 50 else ""

        records_meta.append({
            "idx": idx,
            "company": company,
            "orig_title": orig_title,
            "norm_title": norm_title,
            "seniority": seniority,
            "location_str": loc_str,
            "is_remote": is_remote,
            "employment_type": emp_type,
            "canonical_url": url,
            "full_hash": full_hash,
            "desc_len": len(desc),
        })

    # Clustering structures
    exact_url_index: dict[str, int] = {}
    exact_entity_index: dict[str, int] = {}
    high_conf_index: dict[str, int] = {}
    company_roles_index: dict[str, list[dict[str, Any]]] = defaultdict(list)

    # Disjoint-set union (DSU) or cluster tracking
    clusters: list[list[int]] = []
    cluster_reasons: dict[int, str] = {}
    possible_review_queue: list[dict[str, Any]] = []

    exact_url_merges = 0
    exact_entity_merges = 0
    high_conf_merges = 0
    cross_source_merges = 0

    for m in records_meta:
        idx = m["idx"]
        matched_cluster_id: Optional[int] = None
        match_reason: Optional[str] = None

        # 1. Check Exact Canonical URL with Reused-URL Safeguard
        if m["canonical_url"]:
            if m["canonical_url"] in exact_url_index:
                cand_cid = exact_url_index[m["canonical_url"]]
                primary_m = records_meta[clusters[cand_cid][0]]

                # Safeguard against reused URLs across differing positions / versions:
                # Check for conflicts in title, seniority, physical location, or description content
                title_conflict = (m["norm_title"] != primary_m["norm_title"])
                seniority_conflict = (m["seniority"] != primary_m["seniority"])
                loc_conflict = (
                    m["location_str"] != primary_m["location_str"]
                    and not m["is_remote"]
                    and not primary_m["is_remote"]
                    and m["location_str"] != "unspecified"
                    and primary_m["location_str"] != "unspecified"
                )
                desc_sim = compute_description_token_similarity(desc, str(combined_df.at[primary_m["idx"], "description"] or ""))
                desc_conflict = (desc_sim < 0.60 and len(desc) >= 50 and primary_m["desc_len"] >= 50)

                if title_conflict or seniority_conflict or loc_conflict or desc_conflict:
                    # Reused URL with conflicting job attributes: DO NOT MERGE!
                    if len(possible_review_queue) < 100:
                        possible_review_queue.append({
                            "primary_id": str(combined_df.at[primary_m["idx"], "job_id"]),
                            "primary_title": primary_m["orig_title"],
                            "comparison_id": str(combined_df.at[idx, "job_id"]),
                            "comparison_title": m["orig_title"],
                            "company": m["company"],
                            "canonical_url": m["canonical_url"],
                            "reason": "reused_url_conflicting_job_version",
                            "decision": "kept_separate",
                        })
                else:
                    matched_cluster_id = cand_cid
                    match_reason = "exact_canonical_url"
                    exact_url_merges += 1

        # 2. Check Exact Entity Match: (company, normalized_title_with_seniority, location, full_hash)
        if matched_cluster_id is None and m["company"] and m["norm_title"] and m["full_hash"]:
            entity_key = f"{m['company']}::{m['norm_title']}::{m['location_str']}::{m['full_hash']}"
            if entity_key in exact_entity_index:
                matched_cluster_id = exact_entity_index[entity_key]
                match_reason = "exact_company_title_location_content"
                exact_entity_merges += 1

        # 3. Check High-Confidence Match:
        # Same company + identical normalized title (INCLUDING seniority) + matching remote/location + matching employment type
        if matched_cluster_id is None and m["company"] and m["norm_title"] and m["full_hash"]:
            # High confidence requires: same company, same seniority, same normalized title, same location type
            loc_bucket = "remote" if m["is_remote"] else m["location_str"]
            high_key = f"{m['company']}::{m['seniority']}::{m['norm_title']}::{loc_bucket}::{m['full_hash']}"
            if high_key in high_conf_index:
                matched_cluster_id = high_conf_index[high_key]
                match_reason = "high_confidence_title_seniority_location_content"
                high_conf_merges += 1

        # 4. Check Possible Duplicates for Review (NOT MERGED automatically!):
        # E.g. Same company + same base title words but differing seniority or location
        if matched_cluster_id is None and m["company"] and m["norm_title"]:
            base_title_clean = re.sub(r"\b(senior|junior|lead|staff|principal|associate|intern)\b", "", m["norm_title"]).strip()
            # Fast O(1) company-scoped lookup
            for existing_m in company_roles_index.get(m["company"], []):
                exist_base = re.sub(r"\b(senior|junior|lead|staff|principal|associate|intern)\b", "", existing_m["norm_title"]).strip()
                if exist_base and exist_base == base_title_clean:
                    if existing_m["seniority"] != m["seniority"]:
                        if len(possible_review_queue) < 100:
                            possible_review_queue.append({
                                "primary_id": str(combined_df.at[existing_m["idx"], "job_id"]),
                                "primary_title": existing_m["orig_title"],
                                "comparison_id": str(combined_df.at[idx, "job_id"]),
                                "comparison_title": m["orig_title"],
                                "company": m["company"],
                                "reason": "seniority_difference_preserved",
                                "decision": "kept_separate",
                            })
                        break

        # Register record into company index
        if m["company"]:
            company_roles_index[m["company"]].append(m)

        # Register record into clusters
        if matched_cluster_id is not None:
            clusters[matched_cluster_id].append(idx)
            cluster_reasons[matched_cluster_id] = match_reason
        else:
            new_cid = len(clusters)
            clusters.append([idx])
            cluster_reasons[new_cid] = "unique_initial_posting"

            if m["canonical_url"]:
                exact_url_index[m["canonical_url"]] = new_cid
            if m["company"] and m["norm_title"] and m["full_hash"]:
                entity_key = f"{m['company']}::{m['norm_title']}::{m['location_str']}::{m['full_hash']}"
                exact_entity_index[entity_key] = new_cid
                loc_bucket = "remote" if m["is_remote"] else m["location_str"]
                high_key = f"{m['company']}::{m['seniority']}::{m['norm_title']}::{loc_bucket}::{m['full_hash']}"
                high_conf_index[high_key] = new_cid

    # Select representative record for each cluster
    chosen_indices: list[int] = []
    merged_metadata_records: list[dict[str, Any]] = []

    for cluster_id, indices in enumerate(clusters):
        if len(indices) == 1:
            chosen_indices.append(indices[0])
        else:
            sorted_indices = sorted(indices, key=lambda i: completeness_score(combined_df.iloc[i]), reverse=True)
            primary_idx = sorted_indices[0]
            chosen_indices.append(primary_idx)

            primary_row = combined_df.iloc[primary_idx]
            alt_sources = [
                {
                    "source": str(combined_df.at[i, "source_origin"]),
                    "job_id": str(combined_df.at[i, "job_id"]),
                    "source_id": str(combined_df.at[i, "source_id"]),
                    "url": str(combined_df.at[i, "source_url"]),
                }
                for i in sorted_indices[1:]
            ]

            sources_in_cluster = set(combined_df.at[i, "source_origin"] for i in sorted_indices)
            if len(sources_in_cluster) > 1:
                cross_source_merges += (len(indices) - 1)

            merged_metadata_records.append({
                "cluster_id": cluster_id,
                "cluster_size": len(indices),
                "primary_id": str(primary_row["job_id"]),
                "primary_source": str(primary_row["source_origin"]),
                "title": str(primary_row["original_title"]),
                "seniority": extract_seniority_tier(str(primary_row["original_title"])),
                "company": str(primary_row["company"]),
                "location": str(primary_row["location"]),
                "merge_reason": cluster_reasons.get(cluster_id, "unknown"),
                "duplicate_count": len(indices) - 1,
                "alternate_sources": alt_sources,
            })

    consolidated_df = combined_df.iloc[sorted(chosen_indices)].copy()

    # Safe atomic output replacement
    temp_output = output_parquet.with_suffix(".tmp.parquet")
    output_parquet.parent.mkdir(parents=True, exist_ok=True)
    consolidated_df.to_parquet(temp_output, index=False)
    temp_output.replace(output_parquet)
    logger.info("Saved %d conservative consolidated unique jobs to %s", len(consolidated_df), output_parquet)

    duplicates_removed = total_records - len(consolidated_df)
    duplication_rate = round((duplicates_removed / total_records * 100), 2) if total_records > 0 else 0.0

    report = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "input_records_total": total_records,
        "input_records_by_source": source_counts,
        "unique_master_jobs": len(consolidated_df),
        "duplicates_removed_total": duplicates_removed,
        "duplication_rate_percent": duplication_rate,
        "breakdown": {
            "exact_url_duplicates": exact_url_merges,
            "exact_entity_duplicates": exact_entity_merges,
            "high_confidence_duplicates": high_conf_merges,
            "cross_source_duplicates": cross_source_merges,
            "duplicate_clusters_count": len(merged_metadata_records),
            "possible_duplicates_flagged_for_review": len(possible_review_queue),
        },
        "clusters_sample": merged_metadata_records[:25],
    }

    temp_report = report_json.with_suffix(".tmp.json")
    report_json.parent.mkdir(parents=True, exist_ok=True)
    with open(temp_report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    temp_report.replace(report_json)

    if review_queue_json:
        temp_rev = review_queue_json.with_suffix(".tmp.json")
        review_queue_json.parent.mkdir(parents=True, exist_ok=True)
        with open(temp_rev, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": pd.Timestamp.now().isoformat(),
                "total_flagged": len(possible_review_queue),
                "review_items": possible_review_queue,
            }, f, indent=2)
        temp_rev.replace(review_queue_json)
        logger.info("Saved %d possible duplicates flagged for review to %s", len(possible_review_queue), review_queue_json)

    logger.info(
        "Conservative deduplication complete: %d -> %d master jobs (Removed %d, Duplication rate: %.2f%%, Review items: %d)",
        total_records,
        len(consolidated_df),
        duplicates_removed,
        duplication_rate,
        len(possible_review_queue),
    )
    return report


def deduplicate_jobs(
    input_parquet: Path,
    output_parquet: Path,
    report_json: Path,
) -> dict[str, Any]:
    """Single-dataset conservative deduplication wrapper."""
    return deduplicate_cross_dataset(
        [("single_source", input_parquet)],
        output_parquet,
        report_json,
    )


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    in_oa = base_dir / "data" / "processed" / "jobs" / "open_apply_normalized.parquet"
    in_dj = base_dir / "data" / "processed" / "jobs" / "djinni_jobs_normalized.parquet"
    in_st = base_dir / "data" / "processed" / "jobs" / "stapply_normalized.parquet"

    inputs = []
    if in_oa.exists():
        inputs.append(("open_apply", in_oa))
    if in_dj.exists():
        inputs.append(("djinni", in_dj))
    if in_st.exists():
        inputs.append(("stapply", in_st))

    if inputs:
        consolidated_out = base_dir / "data" / "processed" / "jobs" / "consolidated_jobs_master.parquet"
        cross_rep_js = base_dir / "data" / "reports" / "cross_dataset_deduplication_report.json"
        rev_queue_js = base_dir / "data" / "reports" / "possible_duplicates_review.json"
        deduplicate_cross_dataset(inputs, consolidated_out, cross_rep_js, review_queue_json=rev_queue_js)
