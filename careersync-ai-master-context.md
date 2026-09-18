# CareerSync AI — Master Project Context

**Document version:** 5.5 (Final Polish)
**Last reviewed:** August 9, 2026

---

## 0. Document Authority

### Decision-status tags
Every non-trivial claim below is tagged. Treat the tag as binding, not the confidence of the surrounding prose.

- ✅ **CONFIRMED** — explicitly agreed by the team.
- 🟢 **IMPLEMENTED** — verified present in the repository as of a stated date. Re-verify before trusting; code changes make this stale immediately.
- 🔵 **PLANNED** — an agreed direction, not necessarily built yet.
- 🟡 **PROPOSED** — a sane default recommended in this document. Not yet a team decision. An agent can build against it but should say so explicitly rather than treating it as settled.
- 🟠 **OPEN** — requires a human decision before an agent should build against it.
- ⚪ **OUT OF SCOPE** — intentionally not being built this semester.

### Source-of-truth hierarchy
When sources disagree, resolve in this order:
1. An explicit ✅ CONFIRMED decision in this document
2. The current repository, for anything tagged 🟢 IMPLEMENTED
3. A data/API contract both developers have agreed to
4. The current task's specific instruction
5. Older chat history or planning documents
6. General best practice / AI inference

**The repository represents reality; this document represents intent.** If they diverge, report the divergence rather than silently editing either one to match the other.

### Hard rules for any AI agent working on this project
- If a requirement isn't written down here, treat it as **undefined** — don't invent one.
- Don't add anything just because "AI" is in the product name: no chatbot, no copilot, no "Ask AI" box, no invented confidence scores, no invented reasoning, no decorative neural-network visuals, no autonomous hire/reject action.
- Don't upgrade a framework, library, or database version because a newer one exists — that's an explicit team decision.
- Existing code is not automatically correct — it may itself contain bugs or drift from this document.
- If two ✅ CONFIRMED sections conflict, or the repo contradicts a CONFIRMED decision, **stop and report the conflict** instead of picking one silently.

---

## 1. Project Identity

- **Name:** CareerSync AI
- **Type:** 5th Semester SGP (Software/System Group Project)
- **Domain:** AI-based resume screening and candidate ranking
- **Repository:** `AI-Job-Matcher`, active branch `develop`

**One-sentence definition:**
> CareerSync AI is an AI-assisted recruitment platform that analyzes resumes against job requirements, ranks candidates, provides evidence-based explanations for rankings, and helps recruiters efficiently compare and review candidates while keeping the final hiring decision with the human recruiter.

### 1A. Academic Context
- **Institution:** CHARUSAT University ✅ CONFIRMED
- **Institute/Faculty:** DEPSTAR / Faculty of Technology and Engineering ✅ CONFIRMED
- **Program:** B.Tech Information Technology ✅ CONFIRMED
- **Semester:** 5th Semester ✅ CONFIRMED
- **Academic Year:** 2026–27 ✅ CONFIRMED
- **Course / Project Code:** 🟠 OPEN — do not invent
- **Faculty Guide:** 🟠 OPEN — do not invent
- **Team / Batch:** 🟠 OPEN — do not invent

### 1B. Project Relationship ✅ CONFIRMED
CareerSync AI is the complete, standalone 5th-semester SGP project. It is not a subsystem of the Student Growth Portal and not merely a renamed module.

### 1C. Team Ownership 🟡 PROPOSED
- **Hit (Lead/Developer):**
  - Primary: Backend + AI/NLP + Evaluation
  - Secondary: Architecture + Database
- **Dhruv (Co-Developer):**
  - Primary: Frontend + UI/UX
  - Secondary: API Integration + Testing

---

## 2. Problem Statement

Traditional ATS systems rely on rigid keyword matching: qualified candidates get rejected over synonym mismatches, and no one can explain *why* a candidate was ranked where they were. Manual screening at scale is slow and inconsistent between reviewers.

```
Job Requirements → Resume Collection → Resume Processing → Information Extraction
→ Requirement Matching → Candidate Ranking → Why This Rank? → Evidence
→ Comparison → Human Recruiter Decision
```

---

## 3. Product Philosophy — Five Principles ✅ CONFIRMED

1. **Decision First** — show what helps the recruiter decide, not everything the system knows.
2. **Evidence First** — never "AI says this is a good candidate." Always: here's why, here's the evidence.
3. **Uncertainty First** — the system never claims to know what it doesn't. `Not Detected ≠ Doesn't Exist ≠ Requirement Gap`.
4. **Human in the Loop** — AI assists, recruiter decides.
5. **Simple Core, Sophisticated Details** — `Job → Candidates → Why? → Evidence → Compare → Decide` stays simple; depth appears only on drill-in.

---

## 4. What the System Must Never Do

- Automatically hire or reject without human oversight
- Make legally sensitive employment decisions autonomously
- Fabricate resume information, quotations, or AI explanations
- Claim certainty where evidence is missing
- Treat missing evidence as proof a skill is absent
- Expose fake AI confidence
- Present mock/demo data as live AI output
- Claim blind screening "guarantees" unbiased hiring
- Imply it is a bias-audited or legally compliant hiring tool — it's a student prototype, not a certified employment decision system

---

## 5. Regulatory & Compliance Context

**Prominent disclaimer — this belongs in the product/README, not just here:**
> This project is an academic prototype. Regulatory references below demonstrate awareness of responsible AI deployment. They are not a compliance claim. No real employment decision should be made using this system.

---

## 6. Core Differentiators ✅ CONFIRMED

1. **Why Ranked Here?** — structured positive/concern breakdown
2. **Why Not Higher?** — same structure, framed around what's limiting rank
3. **Evidence → Claim** — every claim traces to source-preserved resume text
4. **Not Detected ≠ Requirement Gap** — maintained uncertainty taxonomy
5. **Difference-First Comparison** — identical attributes collapse; only differences surface
6. **Requirement Baseline Comparison** — candidates shown against the job, not just each other
7. **Review Queue** — linear shortlist/reject/next flow
8. **Decision Snapshot** — compact pre-investigation summary
9. **Safe What-If Preview / Tactile Rubric Equalizer** — reweights the four scoring factors via precomputed/simulated scenarios; never writes to a real MatchResult
10. **Recruiter notes structurally separated from AI analysis**

---

## 7. Users & Scope Guardrails

- **Recruiter (primary):** create jobs, upload resumes, monitor processing, filter/sort/inspect candidates, view evidence, compare, blind-screen, note, shortlist/reject.
- **Candidate (secondary):** view application status/match info, receive feedback.
- **Admin:** ⚪ OUT OF SCOPE.

⚪ **Out of scope for the candidate side:** job marketplace, social features, messaging, interview scheduling. The candidate portal (`/candidate/*`) is 🟡 prototype-level only.

⚪ **Out of scope entirely:** a global command-palette search across jobs/candidates/skills. Search lives scoped inside each list view.

---

## 8. Core Workflows & Boundaries

### 8A. SGP Demonstration Scenario
This is the intended end-to-end flow for academic evaluation:
1. Recruiter creates a job and defines required/preferred skills.
2. Recruiter uploads a batch of synthetic resumes.
3. System processes resumes and ranks candidates.
4. Recruiter reviews the Candidate Leaderboard and Requirement Coverage.
5. Recruiter inspects the top candidate, tracing a skill claim to verbatim evidence.
6. Recruiter uses the Comparison Arena to compare Candidate #1 and #2.
7. Recruiter uses the Rubric Equalizer to test a "What-If" scenario prioritizing Education.
8. Recruiter makes a final Shortlist/Reject decision and generates an Executive Memo.

### 8B. MVP vs Future Boundary
- **MUST WORK (MVP):** Job creation, Requirements, Resume upload, Parsing, Extraction, Requirement matching, Ranking, Evidence traceability, Candidate inspection, Comparison, Recruiter decision recording.
- **DEMO ENHANCEMENTS:** What-If Equalizer, Blind Mode, Executive Memo, Synthetic Benchmarks.
- **PROTOTYPE / OPTIONAL:** Candidate portal, Resume optimizer, Career sandbox.
- **FUTURE / OUT OF SCOPE:** Production-scale async processing (Celery), formal fairness audit infrastructure, enterprise multi-tenancy.

---

## 9. Status Vocabulary

Four separate concepts — do not merge them.

**Resume/file processing status:** `queued → uploading → processing → completed → needs_attention`. 
`needsAttentionReason`: `file_corrupted` | `parse_failed` | `partial_extraction` | `scanned_document` | `duplicate_file`.

**Job lifecycle status:** `draft → open → closed → archived`. 

**Application/recruitment status:** `new → under_review → shortlisted → rejected`

**Skill evaluation status** (per requirement, per candidate):
- **✓ Matched** — reliable supporting evidence exists
- **↗ Transferable** — related evidence may transfer
- **? Not Detected** — resume processed, but no reliable evidence found
- **— Not Provided** — the relevant information wasn't supplied at all
- **! Requirement Gap** — the system can affirmatively compute that the requirement is unmet

**Review status:** `unreviewed → reviewed`

---

## 10. Functional Modules Breakdown & Features

### 1. Recruiter Command Center (Dashboard)
Overview of high-level hiring metrics, attention flags, active job portfolio summary, and a prioritized review queue (Ordered by: 1. Needs Attention, 2. Unreviewed strong candidates, 3. Remaining candidates).

### 2. Job Requisition Studio
Defining target roles, skill requirements (with proficiency or required/preferred flags), and evaluation weights.

### 3. Universal Resume Batch Ingestion
Job-scoped bulk upload and parsing telemetry (dragzone, multi-file progress, error handling).

### 4. Candidate Leaderboard & Decision Studio
Derived candidate ranks, Four-Factor match scores, Requirement Alert flags, Tactile Rubric Equalizer, and Review-scoped Blind Screening. *(Note: Blind mode hides PII but preserves evidence/scores. It is a privacy presentation mechanism, not a guarantee of unbiased hiring.)*

### 5. Deep Candidate Inspector
Decision Snapshot, Why Ranked Here (Ranking Attribution), Verbatim Evidence Claims (click-to-highlight source), and structurally separated Recruiter Notes.

### 6. Head-to-Head Comparison Arena
Side-by-side evaluation, Difference-First attribute collapse.

### 7. Executive Decision Memo Generator
1-Click Markdown brief generation exclusively from existing structured data and documented gaps/uncertainties.

---

## 11. Domain / Data Model

`Application` is a first-class entity bridging `Candidate` and `Job`.

```
Job
 │
 └── Requirements
       │
       ▼
Candidate (identity)
 │
 └── Resume (document & extracted data)
       │
       ▼
Application
       │
       ▼
Evaluation Run
       │
       ├── Extraction
       ├── Requirement Coverage
       ├── Evidence Claims
       ├── Weighted Fit
       ├── Ranking Attribution
       └── MatchResult
```

### 11A. Data Lifecycle & Ownership ✅ CONFIRMED

- **Duplicate File Behavior:** If the exact same file content (by hash) is uploaded to the same job again, reject the second ingestion as `duplicate_file`. Do not overwrite the original and do not create a second application.
- **Candidate Identity Resolution:** Use normalized email as the deterministic identity key when available. If email is absent or different, do not automatically merge candidates. Different resumes must not be merged using fuzzy name/phone inference.
- **Data Deletion:** Closing/archiving a job does not delete resumes or evaluation data. Explicit deletion removes the stored resume and its derived artifacts (extracted text, embeddings, evidence derived solely from it) according to the application's deletion operation. No automatic deletion occurs on job closure.

### Data Contracts (TypeScript & Python Models)

```typescript
// Job Entity
export interface JobSkill {
  name: string;
  required: boolean;
  minYears?: number;
}

export interface JobWeights {
  skills: number;     // e.g., 35%
  experience: number; // e.g., 35%
  education: number;  // e.g., 15%
  semantic: number;   // e.g., 15%
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  workArrangement: 'Remote' | 'Hybrid' | 'On-site';
  experienceMinYears: number;
  educationRequired: 'Bachelor' | 'Master' | 'PhD' | 'Any';
  description: string;
  skills: JobSkill[];
  evaluationPreferences?: JobWeights;
  applicantCount: number;
  unreviewedCount: number;
  shortlistedCount: number;
  status: 'draft' | 'open' | 'closed' | 'archived';
  createdAt: string;
}

// Resume Entity & Processing Result
export interface Resume {
  id: string;
  candidateId: string;
  fileName: string;
  fileType: string;
  processingStatus: "queued" | "uploading" | "processing" | "completed" | "needs_attention";
  needsAttentionReason?: "file_corrupted" | "parse_failed" | "partial_extraction" | "scanned_document" | "duplicate_file" | "analysis_failed" | "analysis_partial";
  parserMethod: "docling" | "fallback";
  extractedText: string;
  uploadedAt: string;
}

// Ranking Attribution
export interface RankingAttribution {
  primaryPositiveContributors: string[]; // e.g. "+8.4 Skills"
  primaryLimitingContributors: string[]; // e.g. "-4.2 Required skill gap"
}

// Score Breakdown & Four-Factor
export interface ScoreBreakdown {
  overall: number;          // 0 - 100 Composite Estimated Fit
  skills: number;           // 0 - 100
  experience: number;       // 0 - 100
  education: number;        // 0 - 100
  semantic: number;         // 0 - 100
  rapidFuzzScore: number;   // Fuzzy skill overlap %
  semanticScore: number;    // BGE-M3 cosine similarity %
  tenureDeltaYears: number; // e.g. +2.0y or -1.0y
  signalQuality: "clean_match" | "conflicting_signal" | "requirement_gap" | "requirement_alert";
}

// Evaluated Skill
export interface EvaluatedSkill {
  name: string;
  status: "matched" | "transferable" | "not_detected" | "not_provided" | "gap";
  evidenceRef?: string;
}

// Match Result
export interface MatchResult {
  applicationId: string;
  scoringVersion: string;
  weightsUsed: JobWeights;
  scores: ScoreBreakdown;
  rankingAttribution?: RankingAttribution;
  evaluatedSkills: EvaluatedSkill[];
  evidenceClaims: EvidenceClaim[];
  whyRankedHere: string[];
  whyNotHigher: string[];
  generatedAt: string;
}

// Candidate Entity
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  totalExperienceYears: number;
  education: { degree: string; institution: string; graduationYear?: number }[];
}

// Application Entity
export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  resumeId: string;
  scores: ScoreBreakdown;
  rankingAttribution?: RankingAttribution;
  summaryReason: string;
  skills: EvaluatedSkill[];
  keyStrengths: string[];
  keyGaps: string[];
  status: "new" | "under_review" | "shortlisted" | "rejected";
  recruiterNotes: RecruiterNote[];
  baselineComparison?: {
    baselineName: string;
    baselineRole: string;
    similarityScore: number;
    keyDeltaSummary: string;
  };
  hasRequirementAlert?: boolean;
  requirementAlertReason?: string;
  interviewProbes?: string[];
  appliedDate: string;
}

// Evidence Claim
export interface EvidenceClaim {
  id: string;
  claimType: string;
  claimText: string;
  sourceDocumentId?: string;
  sourcePage?: number;
  sourceSnippet: string;
  sourceSection?: string;
  characterStart?: number;
  characterEnd?: number;
  confidence?: "high" | "medium" | "low";
  evidenceType?: "direct" | "inferred";
}
```

---

## 12. Application Routes Architecture

| Route | Page Name | Core Functionality |
| :--- | :--- | :--- |
| `/dashboard` | Recruiter Dashboard | Metric cards, attention flags, job portfolio summary, review queue |
| `/jobs` | Job Portfolio | Active job requisitions list, applicant counters, unreviewed status |
| `/jobs/new` | Create Job Requisition | Form builder for requirements, skill thresholds, factor weights |
| `/jobs/[jobId]` | Job Overview | Requisition details, requirement rubric, pipeline stats |
| `/jobs/[jobId]/candidates` | Candidate Leaderboard | Candidate stream, Four-Factor gauges, Rubric Equalizer, Blind mode, filters |
| `/jobs/[jobId]/candidates/[candidateId]` | Candidate Inspector | Decision snapshot, verbatim evidence, click-to-highlight resume viewer, notes, trail |
| `/jobs/[jobId]/comparison` | Comparison Matrix | Side-by-side battle cards for 2–4 candidates, Difference-First collapse |
| `/jobs/[jobId]/resumes/upload` | Resume Batch Ingestion | Job-scoped dragzone, multi-file extraction telemetry feed, per-file status badges |

---

## 13. AI/NLP Technical Architecture & Engineering Stack 🟡 PROPOSED

```
Frontend (Next.js 15 App Router / React 19 / Tailwind CSS v4 / Zustand)
       │ (HTTP REST API / Axios)
       ▼
Backend API (Python FastAPI / Pydantic v2)
       │
       ├── DB: PostgreSQL (SQLAlchemy 2.0 ORM + Alembic Migrations)
       │
       └── AI/NLP Pipeline (Python 3.11 Microservice / Celery Workers)
             ├── Parser Engine: Docling (Layout-preserving Markdown extraction)
             ├── Extractor: GLiNER (Zero-shot neural entity & skill extraction)
             ├── Fuzzy Matcher: RapidFuzz (fuzzy token matching ratio)
             └── Semantic Embedding Engine: BGE-M3 (Hybrid dense+sparse embeddings)
```

**Compute Constraints:** Development hardware is RTX 3050 & RTX 2050 laptop GPUs. Small, highly-optimized models (`BGE-M3`, `GLiNER`) are selected to balance high-accuracy neural extraction with VRAM constraints.

---

## 14. Benchmark Dataset & AI Evaluation 🔵 PLANNED

- **Benchmark Dataset:** Create an annotated evaluation benchmark consisting of synthetic/non-PII resumes and job descriptions, with a development/calibration subset and a held-out evaluation subset. Training/validation splits are only required if the team later fine-tunes a model.
- **Evaluation Metrics:** NDCG@K and Precision@K for ranking, and precision/recall metrics for entity extraction.

### 14A. Model Provenance
To ensure reproducibility, `MatchResult` must log the specific versions of the parser, extractor, embedding model, and scoring formula used during the Evaluation Run.

---

## 15. Evaluation, Scoring, & Ranking Semantics ✅ CONFIRMED

Evaluation occurs in three distinct layers to ensure hard requirements are respected over simple weighted scoring.

### 1. Constraint / Coverage Layer
Evaluates hard constraints. The system calculates `Requirement Coverage` (Matched, Transferable, Not Detected, Requirement Gap). This is visually prioritized over the raw score.

### 2. Weighted Fit Score
$$S_{\text{overall}} = (w_{\text{skills}} \times S_{\text{skills}}) + (w_{\text{exp}} \times S_{\text{exp}}) + (w_{\text{edu}} \times S_{\text{edu}}) + (w_{\text{semantic}} \times S_{\text{semantic}})$$
*Note: The Semantic score captures contextual alignment NOT already represented by explicit requirement matching. It is a secondary signal and must not double-count standard skills.*

### 3. Ranking Attribution
The backend computes explicitly *why* a candidate landed at their rank (e.g., `+8.4 Skills, -4.2 Required skill gap`) to populate the "Why Ranked Here" UI, avoiding AI hallucination. Ranking explanations must be *comparative* (e.g., "Compared to Candidate #3...").

### Confirmed Semantic Rules ✅ CONFIRMED
- **Experience Calculation:** Calculate total professional experience from the union of employment intervals; overlapping employment is counted once. Internships do not count toward default professional experience. Part-time employment counts by elapsed calendar duration, not multiplied by full-time equivalence. Current employment is calculated through the evaluation date. Skill-specific minimum-years requirements must use attributable evidence; if reliable skill-specific tenure cannot be established, do not invent it.
- **Education Matching:** Degree hierarchy is PhD >= Master >= Bachelor. A Master's or PhD satisfies a Bachelor's minimum. A Bachelor's does not satisfy a Master's requirement. Field matching uses deterministic recognized/related-field mappings; unmapped equivalence must not be invented.
- **Transferable Skills:** Transferable status requires an explicit configured skill taxonomy/mapping. BGE-M3 semantic similarity may assist contextual matching but cannot by itself declare a skill Transferable.
- **Ranking Math & Tie-breaking:** 
  - Weights must sum to exactly 100%; zero is allowed; negative weights are not. 
  - Ranking first uses deterministic Requirement Coverage tiers for *required* requirements (e.g., Tier 1: No computable required gaps, Tier 2: One or more required gaps, Tier 3: Insufficient evidence). 
  - Weighted Fit Score ranks candidates within the same coverage tier. 
  - **Tie-Breaking Order:** If Coverage and Overall Fit are exactly equal, tie-break in this order: Skills score → Experience score → Education score → Semantic score → stable Candidate ID ascending. No random or name-based tie-breaking.

---

## 15A. AI vs Deterministic Logic Boundary

To ensure trustworthiness, distinguish AI inference from deterministic computation:

| Function               | Implementation Method               | Output Type |
| ---------------------- | ----------------------------------- | ----------- |
| PDF Extraction         | AI / ML (Docling)                   | EXTRACTED   |
| Skill Extraction       | AI / Neural (GLiNER)                | EXTRACTED   |
| Requirement Matching   | Hybrid (RapidFuzz + BGE-M3)         | INFERRED    |
| Experience Calculation | Deterministic Math                  | COMPUTED    |
| Education Evaluation   | Deterministic Rules                 | COMPUTED    |
| Weighted Score         | Deterministic Math                  | COMPUTED    |
| Ranking Order          | Deterministic Rules                 | COMPUTED    |
| Ranking Attribution    | Deterministic generation            | COMPUTED    |
| Recruiter Decision     | Human Input                         | HUMAN       |

---

## 15B. Evaluation Runs & Reprocessing ✅ CONFIRMED

`MatchResults` are immutable snapshots representing a specific execution of the pipeline.

**Changes that trigger a NEW Evaluation Run:**
- Job description / requirement changes
- Required/preferred skill changes
- Minimum experience changes
- Education requirement changes
- Evaluation/model/parser/extractor/scoring version changes
- Saved production evaluation-weight changes
- Resume content changes

**Changes that DO NOT trigger a new Evaluation Run (Presentation-only):**
- Sorting, filtering, pagination
- Candidate comparison
- Blind-mode toggle
- Recruiter notes
- Temporary What-If Equalizer changes (What-If is simulation-only and never mutates a `MatchResult`).

---

## 16. Technical Stack Summary

* **Frontend**: Next.js 15.5.x (App Router), React 19.x, TypeScript, Tailwind CSS v4, Lucide React icons, `next-themes`, Zustand (`app-store.ts`), Framer Motion. *(Strict Rule: Do not automatically upgrade to Next.js 16.x or newer without an explicit team decision.)*
* **Backend API**: Python FastAPI (Pydantic v2).
* **Database**: PostgreSQL (SQLAlchemy 2.0 ORM, Alembic migrations, `pgvector`).
* **AI/ML Libraries**: `Docling`, `GLiNER`, `BGE-M3`, `RapidFuzz`.

---

## 17. Privacy, Data Handling & Scanned Document Policy

- **Opaque URL Identifiers**: No PII in route parameters.
- **Blind Screening Reveal Audit**: Every identity reveal action logs an `identity_revealed` Decision Trail event.
- **Scanned Document Handling**: Image-only scanned PDFs are detected at ingestion time with explicit `needsAttentionReason: "scanned_document"`.
- **Synthetic Test Fixtures**: Only synthetic, non-PII candidate records used in demo/testing fixtures.
- **Upload Security:** The system must strictly validate allowed MIME types, sanitize filenames, enforce maximum file sizes, isolate storage outside executable directories, and prevent direct execution.
- **Embedding Scope:** Stored embeddings in `pgvector` inherit the authorization scope of the source resume/application and must never be directly exposed through unauthorized API responses.

### 17A. Access Control & Security ✅ CONFIRMED

- **Authorization Boundary:** No unauthorized cross-user or cross-recruiter access. Recruiters can only access their scoped jobs/applications. Candidates (if implemented) can only access their own profiles.

---

## 18. Non-Functional Targets

- **File Limits**: 10MB per file, PDF & DOCX formats supported.
- **Batch Size**: 25–50 resumes per job batch ingestion.
- **Build Health**: Clean TypeScript compilation (`npx tsc --noEmit`) with 0 errors across all routes before any phase sign-off.

---

## 19. Mock Data Philosophy

- **Deterministic**: No `Math.random()` at render time.
- **Realistic Trade-offs**: Ensure synthetic data creates asymmetric tradeoffs to demonstrate comparison capabilities.

---

## 20. Frontend Engineering & Visual Design Rules

- **Design System**: Professional recruitment workstation with an analytical dark theme (Carbon/Obsidian `#030509`, `#0A0D14`, `#0E1424`). Emphasizes trust, information density, clarity, and control (similar to modern enterprise SaaS or Bloomberg terminals). **Glassmorphism and color are functional, not decorative: use them sparingly to establish hierarchy and communicate state; no neon glow, ambient AI effects, or excessive blur.**
- **Responsive**: Desktop sidebar workstation, tablet collapsible navigation, mobile drawer.
- **Accessibility**: Keyboard navigation, WCAG 2.1 AA contrast compliance, visible focus rings.

---

## 21. AI Coding Agent Traps to Avoid

1. Everything becomes a Card
2. Everything gets labeled "AI"
3. Fake confidence scores or fake evidence
4. Treating missing evidence as a confirmed gap
5. Non-deterministic mock data
6. Client-side scoring algorithm reimplementation
7. Radar-chart-everywhere instead of Difference-First comparison
8. Bolting on an AI chatbot instead of workflow intelligence
9. Inventing missing requirements (If undefined, don't invent)
10. Silent architecture migration (Don't upgrade dependencies silently)
11. Treating implementation as specification (Existing code may be wrong; do not assume current code is intended behavior)

---

## 22. Development Stages & Project Status

* **Phase 0**: Repository Setup & Governance ✅ **100% Completed**
* **Phase 1**: Requirement Analysis ✅ **100% Completed**
* **Phase 2**: Architecture & Data Contracts ✅ **100% Completed** (AI Service contract v1.0.0, CandidateCardDTO, Evaluation schemas)
* **Phase 3**: Database Schemas & Migrations ✅ **100% Completed** (Idempotent seed, SQLite & PostgreSQL relational integrity)
* **Phase 4**: Backend API & Deterministic Pipeline Ingestion ✅ **100% Completed** (FastAPI v1 endpoints, Tier-1 Evaluation engine, Worker isolation)
* **Phase 5**: AI Microservices & NLP Pipeline ⏳ **Planned / In-Progress (Owned by AI track agent)**
* **Phase 6**: Frontend Workstation & UI Integration ✅ **100% Completed** (Next.js 16.3.0, 14 routes compiled, Zustand cleanly removed, live API adapters with graceful offline fallback)

---

## 23. Definition of Done

**Core Requirement:** A fresh developer can clone the repository and reproduce the same UI from the specification without guessing.

```text
### Core Workflows
✓ Job creation, lifecycle, and requirements management
✓ Resume upload and pipeline processing
✓ Application creation and candidate inspection

### Explainability
✓ Why Ranked Here / Why Not Higher use computed Ranking Attribution
✓ Requirement status explicitly separated from Weighted Fit Score
✓ Evidence traceability preserved with character-level snippet highlighting
✓ Clear distinction between "Not Detected" and "Requirement Gap"

### Comparison
✓ Head-to-head comparison for 2–4 candidates
✓ Difference-first attribute collapse
✓ Requirement baseline comparison

### Safety & Datall
✓ No fake evidence or AI-hallucinated score invention
✓ Blind-mode reveal actions are audited (hide PII but preserve evaluation data)
✓ No autonomous hiring decisions
✓ Application strictly bridges Candidate and Job

### UI & Technical
✓ App compiles with zero TypeScript errors
✓ Handles loading, empty, error, and needs_attention states
✓ Fully responsive and WCAG 2.1 AA accessible
```
