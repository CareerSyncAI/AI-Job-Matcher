# CareerSyncAI - Evaluation Benchmark Provenance & Validation Report

This report documents the origin, labeling methodology, ground-truth validity, and split distribution for all offline evaluation datasets in CareerSyncAI.

---

## 1. Candidate-to-Job Matching Benchmark (`matching_benchmark.json`)

### 1.1. Provenance of Constituent Assets
1. **Resumes**:
   - **Source**: *CareerCorpus: A Benchmark Dataset for Resume and Job Recommendation Systems* (Chowdhury et al., 2025).
   - **Repository**: Mendeley Data (DOI: `10.17632/wzzwn37gmd.1`).
   - **License**: CC BY 4.0.
   - **Domains Covered**: Teacher, Finance, Accountant, Banking, Research Assistant, Apparel.
   - **Document Type**: 100% real, anonymized resumes annotated by domain experts. No synthetic resumes.

2. **Job Postings**:
   - **Source**: Open Apply Jobs (`edwarddgao/open-apply-jobs`, Partition 0).
   - **Provenance**: Ingested directly from public employer Applicant Tracking Systems (ATS) including Greenhouse, Lever, Ashby, and Workday.
   - **License**: MIT (dataset packaging / tooling); underlying job descriptions belong to respective hiring employers.
   - **Integrity**: Real, active employer job descriptions; HTML tags stripped, sanitized, and deduplicated.

### 1.2. Labeling Methodology & Ground-Truth Disclaimer
> [!IMPORTANT]
> **Heuristic Labeling Disclaimer**: The relevance labels in `matching_benchmark.json` (`ground_truth_relevance: 1` vs `0`) are **heuristic domain alignments**, NOT human-reviewed hiring decisions or gold-standard recruitment judgments.

- **Positive In-Domain Pairs (`relevance = 1`)**:
  - Assigned when an expert-annotated resume from domain $D_i$ (e.g. Finance) is paired with an active job posting whose title contains verified occupational keywords corresponding to $D_i$ (e.g. "Financial Analyst", "Partner Alliance Analyst").
- **Negative Cross-Domain Pairs (`relevance = 0`)**:
  - Assigned as negative divergence controls by intentionally pairing an expert-annotated resume from domain $D_i$ with an active job posting from a divergent domain $D_j$ (e.g. pairing a Finance resume with a Special Education Teacher job).
- **Human Verification Status**:
  - While the *source resumes* contain dual human annotations regarding candidate qualifications, the *cross-pairing relevance labels* were constructed programmatically to benchmark coarse-grained domain discrimination, ranking order, and precision/recall.
  - **No independent human recruiter has signed off on individual pair match scores.**

### 1.3. Train / Dev / Test Split Separation & Leakage Prevention
To guarantee rigorous model evaluation and prevent cross-split leakage:
- **Partitioning Strategy**: Resumes are partitioned strictly by `resume_id` across splits:
  - **Train (60%)**: 45 evaluation pairs (Resumes 1–3 of each domain)
  - **Dev / Validation (20%)**: 15 evaluation pairs (Resume 4 of each domain)
  - **Test (20%)**: 15 evaluation pairs (Resume 5 of each domain)
- **Zero Leakage**: A candidate resume appearing in the Test split never appears in Train or Dev.

---

## 2. Resume Section Extraction Benchmark (`section_extraction_benchmark.json`)

### 2.1. Source & Document Validity
- **Source**: 50 sampled records from `CareerCorpus.xlsx`.
- **Case Type Distribution**:
  - Real Anonymized Documents: **50 (100%)**
  - Synthetic Documents: **0 (0%)**

### 2.2. Annotation Provenance & Verification
- In the original Mendeley Data workbook, candidate resumes are structured into separate, discrete columns:
  - `Education`: Degree, institution, and graduation details.
  - `Skills and Achievements`: Technical tools, software, certifications, and awards.
  - `Experience`: Employment history, responsibilities, and company tenure.
- **Verification Method**: Ground truth presence flags (`education_present`, `skills_present`, `experience_present`) were derived directly from non-empty status in the original primary columns.
- **Annotator Agreement**: Every record in the benchmark includes the dual human annotator scores (`annotator_1`, `annotator_2`) provided in the published study, providing confidence in text completeness and readability.

---

## 3. Summary of Evaluation Integrity

| Benchmark | Total Cases / Pairs | Real Docs % | Synthetic % | Label Type | Human Ground Truth for Matching? | Split Leakage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Matching Benchmark** | 75 pairs | 100% | 0% | Heuristic domain alignment | **No** (programmatic alignment) | **0% (Isolated by candidate ID)** |
| **Section Extraction Benchmark** | 50 cases | 100% | 0% | Tabular column truth | **Yes** (derived from discrete author columns) | N/A (Evaluation-only set) |
