# CareerSyncAI - Manual Dataset Downloads & Processing Guide

This document tracks large datasets designated for manual download to prevent agent network timeouts and avoid instability during automated workflows.

---

## 1. Stapply Open Job Data (Master Aggregated Archive)

| Attribute | Specification |
| :--- | :--- |
| **Official Download Portal** | [data.stapply.ai](https://data.stapply.ai/) |
| **Download Target** | Aggregated Master Parquet (`all.parquet`) |
| **Actual Downloaded Size** | **3,962,193,829 bytes (3.69 GB)** |
| **SHA-256 Checksum** | `29783c1fa6bb326a977618d3f5ab0dc30d96eac91dbb7bdb7b8c0f77ecbf993e` |
| **Format** | Parquet (103 row groups, Snappy compression) |
| **Total Available Records** | **8,001,916 job postings** |
| **Processed Evaluation Slice** | **30,000 active, non-stale English postings** |
| **Remaining Available Records** | **7,971,916 postings (available for future batch ingestion)** |
| **Current Status** | **Acquired, cryptographically verified, and integrated into ingestion pipeline.** |
| **Verified Location** | `C:\Users\Hit\Desktop\SGP 5TH Sem\all.parquet` |
| **Employer Coverage** | Global enterprises and startups across 64 distinct ATS platforms (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Rippling, etc.) |
| **Key Fields** | `id`, `uuid`, `global_id`, `source_slug`, `title`, `company`, `ats_type`, `location`, `country_iso`, `language`, `remote`, `salary_min`, `salary_max`, `salary_currency`, `description`, `url`, `is_stale`, `posted_at` |
| **Source & Provenance** | Collected directly from public company ATS endpoints using the open-source `ats-scrapers` engine. |
| **License & Commercial Rights** | **Commercial Clearance Required**. Packaging and scrapers are open-source, but the copyright of underlying job descriptions remains with respective employers. Suitable for internal evaluation and non-commercial research; requires employer clearance for commercial redistributions. |
| **Processing Protocol** | **Bounded Memory Streaming**: Ingestion normalizer reads `all.parquet` in 5,000-row PyArrow streaming batches (`iter_batches`) keeping memory footprint safe and predictable. Filtered for active (non-stale) English postings with descriptions > 200 characters. |

---

## 2. Processing Coverage Specifications & Limits

All processing limits are defined in `scripts/data_ingestion/config.py`:

| Dataset ID | Total Available Rows | Default Processed Slice | Remaining Available Rows | Sampling / Checkpoint Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `stapply_jobs` | 8,001,916 | 30,000 | 7,971,916 | PyArrow 5,000-row streaming batches (`iter_batches`) |
| `open_apply_jobs` | 37,265 | 5,000 | 32,265 | Partition 0 slice |
| `djinni_jobs` | 141,897 | 15,000 | 126,897 | English subset |
| `djinni_candidates` | 210,250 | 15,000 | 195,250 | Anonymized candidate profiles |
| `career_corpus` | 302 | 302 (100%) | 0 | Full peer-reviewed benchmark |
| `jobhop_trajectories` | 1,594,827 | 25,000 | 1,569,827 | Career trajectory training partition |
| `onet_taxonomy` | 1,016 SOC / 31,821 skills | 1,016 SOC / 31,821 skills (100%) | 0 | Complete USDOL/ETA taxonomy |

---

## 3. How the Ingestion Pipeline Handles Manual Datasets

The CareerSyncAI pipeline (`scripts/data_ingestion/pipeline.py`) accepts external file paths via `--input-path`:
1. It automatically inspects the schema to identify the dataset format (e.g., Stapply, Open Apply, Djinni).
2. It processes records in memory-safe PyArrow batches without loading the entire multi-gigabyte file into memory.
3. It performs schema normalization, conservative multi-tier deduplication, and O*NET taxonomy alignment.
4. It logs the file size, path, row count, cryptographic SHA-256 hash, and processing checkpoints into `data/manifests/datasets.json`.
