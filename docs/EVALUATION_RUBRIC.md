# CareerSync AI — Annotation Guidelines & Evaluation Rubric

**Status:** Official SGP Benchmark Protocol  
**Version:** 1.0.0  
**Effective Date:** 26 October 2026  
**Applicability:** Academic Evaluation, Viva Defense, Model Bake-Off  

---

## 1. Evaluation Philosophy

CareerSync AI adopts an **evidence-first, explainable evaluation framework**. In modern talent intelligence, a ranking algorithm must not act as an opaque black box. Every candidate assessment must:
1. Ground positive claims in verifiable, verbatim quotes from the candidate's resume.
2. Clearly distinguish between **lack of documented mention** (`not_detected`) and a **verified disqualification** (`confirmed_gap`).
3. Compute ranking metrics strictly within job-grouped pools, macro-averaged across distinct requisitions.

---

## 2. Candidate-to-Job Relevance Rating Scale

Annotators must independently assign one of four ordinal relevance tiers to each candidate-job pair. Annotators must **never** view algorithmic or neural scores prior to completing their manual review.

| Rating Tier | Ordinal Score | Definitive Description | Operational Acceptance Criteria |
| :--- | :---: | :--- | :--- |
| **Strong Match** | `3` | Outstanding alignment with primary role requirements. | Demonstrates direct, demonstrable professional experience in >= 80% of required skills, matches required seniority/tenure, and meets education thresholds. |
| **Partial Match** | `2` | Viable candidate with minor skill or domain gaps. | Meets 50%–79% of required skills, possesses strong foundational transferable capabilities, but lacks specific niche tooling or 1–2 years of requested tenure. Candidate could succeed with standard onboarding. |
| **Weak Match** | `1` | Substantial misalignment; unsuited for immediate hire. | Meets < 50% of required skills, shows major seniority mismatch (e.g., junior applying for staff architect), or has divergent domain experience requiring extensive retraining. |
| **Insufficient Information** | `0` | Unverifiable or corrupted submission. | Resume text contains fewer than 100 readable words, has major parsing corruptions, or omits chronological experience entirely. |

---

## 3. Requirement-Level Evidence Status Rubric

For each required or preferred skill declared in the job requisition, the evaluation engine and human annotators must classify candidate evidence into one of three distinct statuses:

### A. `supported`
- **Definition:** The candidate's submitted materials contain an explicit, observable mention of the skill or an officially recognized ESCO synonym within context.
- **Verification Rule:** Must be anchored to an exact verbatim quote from the text.
- **Example:** For requirement `Kubernetes`, quote: *"Orchestrated production microservices across a 40-node Kubernetes cluster."*

### B. `not_detected`
- **Definition:** The submitted resume does not contain an explicit mention of this skill.
- **CRITICAL REVENUE & FAIRNESS RULE:** **Absence of a skill mention must NEVER be interpreted as proof that the candidate lacks the skill.**
- **Flagging:** `is_confirmed_gap = False`. The system labels this as *unmentioned in submitted documentation*, avoiding unsupported negative assertions.

### C. `insufficient_information`
- **Definition:** The supplied document lacks the necessary sections or context (e.g., empty experience section, severe truncation) to determine whether the requirement is satisfied.
- **Flagging:** `is_confirmed_gap = False`.

---

## 4. Dual-Annotator Protocol & Inter-Rater Reliability

To ensure scientific defensibility:
1. **Independent Review:** Two independent evaluators (e.g., Project Lead and Second Reviewer) annotate identical candidate-job pairs using this rubric.
2. **Concordance Metric:**
   - Raw percentage agreement ($P_o$).
   - Cohen's Kappa ($\kappa$) for 4-tier categorical ratings:
     $$\kappa = \frac{P_o - P_e}{1 - P_e}$$
     Target: $\kappa \ge 0.65$ (indicating substantial inter-annotator agreement).
3. **Disagreement Adjudication:**
   - Where $|Score_A - Score_B| = 1$: The score is resolved by an agreed adjudication consensus or averaged.
   - Where $|Score_A - Score_B| \ge 2$: The pair is formally flagged for joint adjudication with an independent referee, logging the discrepancy rationale in the benchmark error log.

---

## 5. Job-Grouped Ranking Evaluation Protocol

Candidate ranking performance must **never** pool all candidates together into a single global list. Ranking metrics must be computed strictly **per job requisition** and then macro-averaged.

### A. Evaluated Metrics
1. **Normalized Discounted Cumulative Gain (NDCG@K):**
   $$\text{DCG}@K = \sum_{i=1}^K \frac{2^{rel_i} - 1}{\log_2(i + 1)}, \quad \text{NDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K}$$
   Evaluated at $K=5$ and $K=10$. Primary metric for candidate ordering quality.
2. **Mean Reciprocal Rank (MRR):**
   $$\text{MRR} = \frac{1}{|J|} \sum_{j \in J} \frac{1}{\text{rank}_j}$$
   Measures the position of the first `Strong Match` candidate in the ranked list.
3. **Precision@K:** Proportion of the top-$K$ candidates who are labeled `Strong Match` or `Partial Match`.

### B. Macro-Averaging
Every job requisition has equal weight in the final score:
$$\text{Macro-NDCG}@K = \frac{1}{M} \sum_{m=1}^M \text{NDCG}_m@K$$
This prevents jobs with large applicant pools from distorting the overall benchmark assessment.

### C. Uncertainty Disclosure
With an evaluation set of 15–20 jobs, bootstrap confidence intervals (95% CI) must be reported. Overlapping confidence intervals between models must be honestly disclosed as statistically inconclusive rather than claiming model superiority.

---

## 6. Predeclared Model Adoption Guardrails

Before running Stage 3 model comparisons, the adoption threshold is predeclared:
1. **Primary Adoption Criterion:** The challenger model must demonstrate an increase of at least **+0.04 Macro-NDCG@5** over the baseline on the frozen held-out set.
2. **Non-Inferiority Guardrail:** The required-skill evidence precision must remain $\ge 85\%$ (no regression in precision).
3. **Hardware Budget:**
   - Peak RSS RAM must remain $\le 2.0$ GB on CPU.
   - Inference latency per candidate must remain $\le 150$ ms on standard CPU.
4. **Tie / Inconclusive Rule:** If the held-out performance gain is $< 0.03$ or 95% confidence intervals overlap, CareerSync AI will retain the existing baseline (`sentence-transformers/all-MiniLM-L6-v2` / TF-cosine) as the default production configuration.
