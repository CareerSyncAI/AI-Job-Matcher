# CareerSyncAI Dataset Catalog & Data Ingestion Architecture

## 1. Executive Summary & Data Governance

CareerSyncAI (`AI-Job-Matcher`) uses real-world, legally transparent datasets to validate matching accuracy, ranking fairness, resume parsing, and occupational alignment. This catalog documents:

1. **Traceable Provenance**:
   - **Direct ATS Endpoints**: Greenhouse, Lever, Ashby, Workday, Rippling via Stapply Open Job Data and Open Apply Jobs.
   - **Peer-Reviewed Academic Corpora**: Mendeley Data (Chowdhury et al., 2025), Ghent University AIDA / VDAB (IEEE BigData 2025), and Lang-UK / ACL 2024 UNLP (sourced from Djinni.co).
   - **Government Taxonomy Standards**: U.S. Department of Labor / Employment and Training Administration (USDOL/ETA) O*NET Database 31.0.
2. **Accurate Licensing & Content Rights**:
   - Explicitly distinguishes open repository tooling/packaging licenses (MIT) from proprietary underlying job descriptions owned by individual employers (clearance required for commercial applications).
   - **JobHop v2 Licensing Resolution**: Confirmed as **CC BY 4.0** based on authoritative Hugging Face dataset card YAML metadata under the IEEE BigData 2025 publication.
   - Preserves required trademark attributions (e.g. O*NET® USDOL/ETA) and notes all structural transformations.
3. **Rigorous Offline Evaluation**:
   - Heuristic domain-alignment pairs are explicitly labeled as programmatic tests and separated from human hiring decisions.
   - Train / Dev / Test splits are partitioned strictly by candidate ID to prevent data leakage.
4. **Air-Gapped Privacy & Security**:
   - Raw archives and candidate profiles remain under `data/raw/` or isolated directories (git-ignored) and never contaminate live production databases.
   - Ingestion scripts enforce archive security bounds (zip-bomb and path-traversal mitigations) and memory bounds (PyArrow streaming batches).

---

## 2. Verified Dataset Inventory (Disk Audit)

The following datasets have been acquired, extracted, and cryptographically verified on disk:

| Dataset ID | Local File Path | Exact File Size | SHA-256 Checksum | Available Records | Processed Records | License & Commercial Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`stapply_jobs_raw`** | `C:\Users\Hit\Desktop\SGP 5TH Sem\all.parquet` | 3,962,193,829 bytes (3.69 GB) | `29783c1fa6bb326a977618d3f5ab0dc30d96eac91dbb7bdb7b8c0f77ecbf993e` | 8,001,916 | 30,000 | **Commercial Clearance Required**; scrapers open-source, job descriptions employer-owned. |
| **`open_apply_jobs_raw`** | `data/raw/jobs/open_apply/0.parquet` | 38,127,392 bytes | `1388ae4cb44f0d71a0b2f75376731a29411cf59f5b4cfb4bf3258b06744a3601` | 37,265 | 5,000 | **MIT (Packaging)**; underlying job text belongs to hiring employers. |
| **`djinni_jobs_raw`** | `data/raw/jobs/djinni/djinni_jobs_en.parquet` | 145,859,589 bytes | `71dddaf0d9660f34ddf946953b67f54f1e7d60e22dcf9a4b8139b6378b18aab9` | 141,897 | 15,000 | **MIT**; Lang-UK / ACL 2024 UNLP collection. |
| **`djinni_candidates_raw`** | `data/raw/resumes/djinni/djinni_candidates_en.parquet` | 237,415,736 bytes | `26ffec16c5b058fe84666ca096ff8ba554b77f98fcce4d7ca6230f2ae3e23cf0` | 210,250 | 15,000 | **MIT**; Lang-UK / ACL 2024 UNLP collection. |
| **`career_corpus_raw`** | `data/raw/resumes/career_corpus/CareerCorpus.xlsx` | 124,525 bytes | `97b1fa6cca1232912dd3f7bc312d71a2478249787168fd41dfbf6c1da90479d3` | 302 | 302 | **CC BY 4.0**; Chowdhury et al. (2025), Mendeley Data DOI `10.17632/wzzwn37gmd.1`. |
| **`onet_31_0_raw`** | `data/raw/taxonomies/onet/db_31_0_text.zip` | 13,183,034 bytes | `6883548adf5fde64cf6f801b35d15519c9225f2732c3cab0e281c652d16b23a9` | 46 relational tables | 1,016 SOC / 31,821 skills | **CC BY 4.0**; O*NET® USDOL/ETA trademark attribution required. |
| **`jobhop_v2_train`** | `data/raw/taxonomies/jobhop/JobHop_v2_train.parquet` | 9,213,302 bytes | `b2c0073161f4ac237d3b6b522a338f0d44a6860d2e7f4bdc613a71b8a1663a90` | 1,594,827 | 25,000 | **CC BY 4.0**; Ghent University AIDA / IEEE BigData 2025. |

---

## 3. Normalized & Consolidated Derivatives Inventory

The ingestion pipeline produces normalized partitions conforming to strict Pydantic schemas:

| Artifact Path | Record Type | Format | Record Count | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data/processed/jobs/stapply_normalized.parquet` | `job_posting` | Parquet | 30,000 | Active, English postings from Stapply Open Job Data (filtered for freshness & length). |
| `data/processed/jobs/open_apply_normalized.parquet` | `job_posting` | Parquet | 5,000 | Cleaned postings from Open Apply Partition 0. |
| `data/processed/jobs/djinni_jobs_normalized.parquet` | `job_posting` | Parquet | 15,000 | IT recruitment postings from Djinni (English). |
| `data/processed/jobs/consolidated_jobs_master.parquet` | `job_posting` | Parquet | **49,478** | **Master unified job database** after conservative deduplication (safely removed 522 true duplicates, preserving 3,922 seniority/location variations). |
| `data/processed/resumes/career_corpus_normalized.jsonl` | `annotated_resume` | JSONL | 302 | Deep-parsed resumes with ground-truth section boundaries (100% ID uniqueness). |
| `data/processed/resumes/djinni_candidate_profiles.parquet` | `candidate_profile` | Parquet | 15,000 | Anonymized candidate profiles with salary expectations, English levels, and skill arrays. |
| `data/processed/occupations/jobhop_career_trajectories.parquet` | `career_trajectory` | Parquet | 25,000 | Sequential career trajectories with tenure and transition metadata. |
| `data/processed/occupations/occupations.parquet` | `soc_occupation` | Parquet | 1,016 | Official Standard Occupational Classification (SOC) titles & definitions. |
| `data/processed/occupations/technology_skills.parquet` | `technology_skill` | Parquet | 31,821 | Software titles, tools, and hot skills from O*NET 31.0. |

---

## 4. Conservative Multi-Tier Deduplication Results

In `data/processed/jobs/consolidated_jobs_master.parquet`, conservative deduplication processed **50,000 job postings** and retained **49,478 unique master postings** (**522 duplicates removed**, **1.04% true duplication rate** across **427 duplicate clusters**).

### 4.1. Comparison with Previous Aggressive Method
* **Previous Aggressive Deduplication**: Stripped seniorities (`senior`, `junior`, `lead`, `principal`, `associate`) and matched on 150-word description prefixes. Merged 4,444 postings into 45,556 master records. Falsely merged `Principal Security Researcher` and `Senior Security Researcher`, or `Staff Developer` and `Junior Developer`.
* **Current Conservative Deduplication**:
  - Preserves seniority in title keys and extracts explicit `seniority_level` (`intern`, `junior`, `mid`, `senior`, `lead_staff`).
  - Requires location/remote match and employment type match.
  - Requires full description content verification (SHA-256 over entire text).
  - Flags potential seniority/location differences into a review queue rather than merging them.
  - **Yields 49,478 master records (3,922 legitimate distinct openings safely preserved)**.

### 4.2. Duplicate Classification Tiers
1. **Exact Duplicates (487 merged)**: Identical canonical URL, or identical `(company, normalized_title_with_seniority, location, full_description_hash)`.
2. **High-Confidence Duplicates (10 merged)**: Identical company, identical title, identical seniority tier, matching location/remote, matching employment type, and full description match.
3. **Possible Duplicates Flagged for Review (100 items flagged)**: Different seniority at same company (e.g. `Principal Security Researcher` vs `Senior Security Researcher` at 1Password) or different office locations. **Both records are preserved as separate job openings in the master dataset.** Logged to `data/reports/possible_duplicates_review.json`.

---

## 5. Candidate & Career Dataset Integration

Candidate datasets are strictly partitioned by record type to prevent schema confusion:

1. **Annotated Resumes (`record_type: "annotated_resume"`)**:
   - Source: CareerCorpus (302 records).
   - Contains raw resume text, author columns (`Education`, `Skills`, `Experience`), and verified ground-truth section boundaries.
2. **Candidate Profiles (`record_type: "candidate_profile"`)**:
   - Source: Djinni Candidates (15,000 records).
   - Contains candidate title, years of experience, English proficiency, desired compensation, and explicit technology skill arrays.
3. **Career Trajectories (`record_type: "career_trajectory"`)**:
   - Source: JobHop v2 (25,000 records).
   - Contains sequential career transition steps with SOC/ISCO occupational transitions for career path modeling.

---

## 6. O*NET 31.0 Verified Taxonomy Alignment & Quality Audit

The taxonomy integration module (`scripts/data_ingestion/taxonomy_integrator.py`) aligns job postings and candidate profiles against the official O*NET 31.0 standard with disambiguation:

- **Database Standard**: O*NET 31.0 (1,016 SOC occupations, 31,821 technology skills).
- **Short Ambiguous Skills Disambiguation**: Short tokens (`R`, `Go`, `C`, `IT`, `AI`, `ML`, `QA`, `UI`, `UX`) are strictly validated against surrounding programming indicators (e.g., `Golang` / `Go programming` or co-occurrence with `Docker`/`Kubernetes` required for `Go`; `R programming`/`CRAN` required for `R`). Prose usages of "go" or "it" are rejected.
- **Match Types**:
  - `exact_onet_match`: Direct case-insensitive match on distinct technology skill (confidence: 1.0).
  - `alias_match`: Industry aliases mapped to canonical names (e.g., `golang` -> `Go`, `k8s` -> `Kubernetes`, `reactjs` -> `React`) (confidence: 0.95).
  - `contextual_validated`: Context-verified short tokens (confidence: 0.85).
- **Audit Artifact**: Full audit report saved to `data/reports/taxonomy_quality_audit.json`.

---

## 7. Verified Ingestion Pipeline CLI

The pipeline orchestrator (`scripts/data_ingestion/pipeline.py`) supports modular and end-to-end execution:

```bash
# Run end-to-end pipeline (normalize, deduplicate, validate, taxonomy, manifest)
python scripts/data_ingestion/pipeline.py --normalize --deduplicate --validate --taxonomy --manifest
```
