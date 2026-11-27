export type EvidenceType =
  | "matched"
  | "transferable"
  | "not_detected"
  | "not_provided"
  | "gap";

export interface SkillEvidenceItem {
  requirement: string;
  claim: string;
  sourceText?: string | null;
  type: EvidenceType;
  details?: string | null;
  required?: boolean | null;
  source_section?: string | null;
  character_start?: number | null;
  character_end?: number | null;
}

export interface ExperienceAlignment {
  candidate_years?: number | null;
  required_years?: number | null;
  alignment_score?: number | null;
  tenure_delta_years?: number | null;
  evidence?: string | null;
}

export interface EducationAlignment {
  candidate_degree?: string | null;
  required_education?: string | null;
  alignment_score?: number | null;
  evidence?: string | null;
}

export interface CandidateMatchResults {
  application_id: string;
  application_status: string;
  job_id: string;
  job_title: string;
  company_name?: string | null;
  overall_match_score?: number | null;
  evaluation_status: "completed" | "pending" | "unavailable" | "failed" | string;
  evaluated_at?: string | null;
  matched_skills: string[];
  missing_skills: string[];
  transferable_skills: string[];
  skill_evidence?: SkillEvidenceItem[];
  experience?: ExperienceAlignment | null;
  education?: EducationAlignment | null;
  recommendations?: string[];
}

/**
 * Isolated fixture for local development and test simulation when backend
 * endpoint has not yet returned results.
 * STRICT INVARIANT: Must NEVER be shipped or rendered as real candidate data.
 */
export const ISOLATED_TEST_MATCH_RESULTS_FIXTURE: CandidateMatchResults = {
  application_id: "test-app-001",
  application_status: "under_review",
  job_id: "test-job-001",
  job_title: "Senior Full Stack Engineer",
  company_name: "Aurora Intelligence Labs",
  overall_match_score: 84.5,
  evaluation_status: "completed",
  evaluated_at: new Date().toISOString(),
  matched_skills: ["React", "TypeScript", "Next.js", "FastAPI", "PostgreSQL"],
  missing_skills: ["Kubernetes", "AWS CloudFormation"],
  transferable_skills: ["Docker", "GCP Cloud Run"],
  skill_evidence: [
    {
      requirement: "React Requirement",
      claim: "Documented proficiency in React.",
      sourceText: "Architected high-performance web applications using React and Next.js.",
      type: "matched",
      required: true,
      source_section: "experience",
      character_start: 120,
      character_end: 185,
      details: "required",
    },
    {
      requirement: "TypeScript Requirement",
      claim: "Documented proficiency in TypeScript.",
      sourceText: "Built type-safe microservice web clients in modern TypeScript.",
      type: "matched",
      required: true,
      source_section: "unknown",
      character_start: 210,
      character_end: 275,
      details: "required",
    },
    {
      requirement: "Kubernetes Requirement",
      claim: "No direct or transferable evidence detected for Kubernetes.",
      sourceText: null,
      type: "not_detected",
      required: false,
      source_section: null,
      character_start: null,
      character_end: null,
      details: "preferred",
    },
  ],
  experience: {
    candidate_years: 5.5,
    required_years: 4.0,
    alignment_score: 100,
    tenure_delta_years: 1.5,
    evidence: "Verified professional tenure across relevant engineering roles.",
  },
  education: {
    candidate_degree: "Bachelor",
    required_education: "Bachelor",
    alignment_score: 100,
    evidence: "Candidate holds a Bachelor's degree in Computer Science or related field.",
  },
  recommendations: [
    "Consider adding relevant Kubernetes experience or container orchestration projects to your resume.",
    "Highlight any experience with infrastructure as code or cloud deployment pipelines.",
  ],
};
