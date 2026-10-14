# CareerSync AI — Data Sources & Evaluation Manifest

**Authoritative Record of Datasets, Taxonomies, and Benchmark Splits**  
**Track:** AI/NLP Engineering (Antigravity) & Backend Core (Codex)  
**Last Updated:** October 14, 2026  

---

## 1. Data Governance & Privacy Guarantees

In accordance with CareerSync AI architecture invariants:
1. **Zero External API Transmission:** No candidate resumes or personal data are ever transmitted to third-party proprietary APIs (OpenAI, Gemini, Anthropic). All NLP inference is 100% local and offline-compatible.
2. **Deterministic Priority:** Machine learning and embedding scores serve as explainable decision-support signals. They never autonomously hire or reject candidates.
3. **No Private/PII Data in Repository:** Model weights, raw resume corpora, and sensitive personal data are strictly excluded from source control via `.gitignore`.
4. **License Compliance:** Only datasets with verified permissive open-source licenses (MIT, Apache-2.0, CC BY 4.0) are approved for integration. Unlicensed or restrictive sources are explicitly documented as rejected.

---

## 2. Dataset Registry & Source Audit

### Dataset A: Candidate-Job Matching Synthetic Dataset
- **Publisher / Owner:** Michael Ozon (`michaelozon`)
- **Source URL:** [https://huggingface.co/datasets/michaelozon/candidate-matching-synthetic](https://huggingface.co/datasets/michaelozon/candidate-matching-synthetic)
- **Pinned Revision / SHA:** `178ab864dcad9910c5670d43e4bdbbb901a11f18`
- **License:** MIT License
- **Acquisition Date:** October 2026
- **Format / Size:** Parquet / 10,000 synthetic resumes, 2,500 jobs, 2,500 matching records
- **Data Provenance:** Synthetic LLM-generated profiles and job requisitions.
- **Approved Use:** Development experiments, pipeline stress-testing, exploratory scoring.
- **Known Limitations:** Labels reflect generator assumptions; does not constitute independent human ground truth. Must not be used as the sole ranking benchmark.
- **Status:** **APPROVED FOR DEV PIPELINE TESTING**

---

### Dataset B: Role Radar — Job-Profile Matching Dataset
- **Publisher / Owner:** Jim Yones (`jimyones`) / Oksomu (`oksomu`)
- **Source URL:** [https://huggingface.co/datasets/jimyones/role-radar-dataset](https://huggingface.co/datasets/jimyones/role-radar-dataset)
- **Pinned Revision / SHA:** `a74b3a11e852a1909092da6bc483c42a818d91e9`
- **License:** Apache-2.0
- **Acquisition Date:** October 2026
- **Format / Schema:** JSON (`gold_labels.json`, `benchmarks.json`)
- **Data Provenance:** India-focused tech job profiles with 108 gold-labeled evaluation pairs across skills, seniority, domain alignment, and human reasoning.
- **Approved Use:** Comparative evaluation benchmark calibration for Indian tech market profiles.
- **Known Limitations:** Concentrated primarily on IT and software engineering roles; smaller sample size for non-technical fields.
- **Status:** **APPROVED FOR EVALUATION & BENCHMARK REFERENCE**

---

### Dataset C: Resume Matching Dataset v2
- **Publisher / Owner:** Divyanandh (`Divyanandh`)
- **Source URL:** [https://huggingface.co/datasets/Divyanandh/resume-matching-dataset-v2](https://huggingface.co/datasets/Divyanandh/resume-matching-dataset-v2)
- **Pinned Revision / SHA:** `c910794b094085d2a1d96b060b8b9516e68320a6`
- **License:** **NONE SPECIFIED (Missing / Unlicensed)**
- **Audit Findings:** The Hugging Face dataset card contains no explicit open-source license tag, granting no clear redistribution or commercial reuse rights.
- **Status:** **REJECTED** (Skipped due to licensing ambiguity, per project execution contract).

---

### Dataset D: European Skills, Competences, Qualifications and Occupations (ESCO)
- **Publisher / Owner:** European Commission (Directorate-General for Employment, Social Affairs and Inclusion)
- **Source URL:** [https://esco.ec.europa.eu/en/use-esco/download](https://esco.ec.europa.eu/en/use-esco/download)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Acquisition Date:** Reference Taxonomy v1.1.1
- **Approved Use:** Reference taxonomy for validating skill variants, occupational hierarchies, and canonical normalization dictionaries.
- **Known Limitations:** European labor-market centric; does not supply candidate-to-job hiring suitability labels.
- **Status:** **APPROVED AS REFERENCE TAXONOMY**

---

### Dataset E: O*NET Database
- **Publisher / Owner:** U.S. Department of Labor / Employment and Training Administration
- **Source URL:** [https://www.onetcenter.org/database.html](https://www.onetcenter.org/database.html)
- **License:** CC BY 4.0 (with required attribution)
- **Approved Use:** Supplementary reference data for knowledge, skills, and technology tools.
- **Known Limitations:** US-centric job classifications; not representative of Indian tech market nuances.
- **Status:** **APPROVED AS SUPPLEMENTARY REFERENCE**

---

### Dataset F: Repository Evaluation Benchmark (`evaluation_benchmark.json`)
- **Location:** `ai-services/fixtures/evaluation/evaluation_benchmark.json`
- **Publisher:** CareerSync AI Project Core
- **Format:** Curated JSON benchmark with strictly separated `dev` and `held_out_test` splits.
- **Sample Count:** 30 carefully adjudicated candidate-job pairs spanning 8 role families (Backend, Frontend, Fullstack, AI/ML, DevOps, Systems, HR, Graphic Design).
- **Label Schema:**
  - `strong_match`: Substantial evidence supporting required and preferred skills.
  - `partial_match`: Meaningful skill overlap with 1-2 critical gaps.
  - `weak_match`: Out-of-domain or minimal relevance (negative controls).
  - `insufficient_information`: Missing or unstructured information.
- **Approved Use:** Comparative evaluation between `BaselineSemanticMatcher` (token cosine) and `SentenceEmbeddingMatcher` (`all-MiniLM-L6-v2`).
- **Status:** **ACTIVE BENCHMARK**

---

## 3. Directory Layout & Data Separation

```
AI-Job-Matcher/
├── data/
│   ├── README.md                           # This authoritative data manifest
│   └── raw/                                # (Ignored by Git) Local raw downloads
└── ai-services/
    ├── fixtures/
    │   ├── synthetic/                      # Regression test fixtures (.txt)
    │   └── evaluation/
    │       └── evaluation_benchmark.json   # Curated dev & held-out test splits
    └── evaluation_report.json              # Empirical benchmark run results
```
