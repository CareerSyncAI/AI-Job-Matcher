export type ResumeStudioPhase =
  | "loading"
  | "no_resume"
  | "uploading"
  | "validating"
  | "needs_attention"
  | "ready_for_analysis"
  | "analyzing"
  | "completed"
  | "partial"
  | "failed";

export type PipelineStageStatus = "pending" | "running" | "completed" | "failed";

export type BackendAnalysisStatus =
  | "ready"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type BackendAnalysisStage =
  | "ready"
  | "queued"
  | "extracting_text"
  | "analyzing_ats"
  | "persisting_results"
  | "completed"
  | "failed";

export interface ResumeAnalysisStatusResponse {
  resume_id: string;
  run_id: string | null;
  status: BackendAnalysisStatus;
  current_stage: string | null;
  failed_stage?: string | null;
  attempt_number: number;
  retry_of_run_id: string | null;
  result_available: boolean;
  failure_code: string | null;
  failure_detail: string | null;
  result: Record<string, unknown> | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
}

export interface PipelineStageItem {
  id: string;
  name: string;
  description: string;
  status: PipelineStageStatus;
  error?: string | null;
}

export interface ResumeIssueItem {
  category: string;
  severity: string;
  issue: string;
  recommendation: string;
}

export interface ParsedResumeData {
  atsScore: number | null;
  grade?: string | null;
  sectionScore?: number | null;
  contactScore?: number | null;
  impactScore?: number | null;
  formattingScore?: number | null;
  skillsScore?: number | null;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    period: string;
    summary: string;
  }>;
  detectedSections?: Record<string, boolean>;
  missingCriticalSections?: string[];
  actionVerbs?: string[];
  metricsCount?: number;
  wordCount?: number;
  strengths?: string[];
  issues?: ResumeIssueItem[];
}

export interface ResumeRecordSummary {
  id: string;
  mime_type?: string;
  byte_size?: number;
  processing_status?: string;
  needs_attention_reason?: string | null;
  uploaded_at?: string;
}

const EXECUTION_STAGES: Array<{
  id: Exclude<BackendAnalysisStage, "ready" | "completed" | "failed">;
  name: string;
  description: string;
}> = [
  {
    id: "queued",
    name: "Queued",
    description: "Analysis run created and dispatched to the backend runner.",
  },
  {
    id: "extracting_text",
    name: "Extracting Text",
    description: "Loading stored text or extracting content from the resume file.",
  },
  {
    id: "analyzing_ats",
    name: "Analyzing ATS & Skills",
    description: "Evaluating sections, action verbs, formatting, and canonical skills.",
  },
  {
    id: "persisting_results",
    name: "Persisting Results",
    description: "Saving structured analysis results for your profile.",
  },
];

export function buildPipelineStages(
  analysis: ResumeAnalysisStatusResponse | null | undefined
): PipelineStageItem[] {
  if (!analysis) {
    return [];
  }

  const { status, current_stage: currentStage, failure_detail: failureDetail, failure_code: failureCode } = analysis;

  if (status === "ready") {
    return EXECUTION_STAGES.map((stage) => ({
      ...stage,
      status: "pending",
    }));
  }

  if (status === "completed") {
    return EXECUTION_STAGES.map((stage) => ({
      ...stage,
      status: "completed",
    }));
  }

  if (status === "queued") {
    return EXECUTION_STAGES.map((stage, idx) => ({
      ...stage,
      status: idx === 0 ? "running" : "pending",
    }));
  }

  if (status === "running") {
    const activeIdx = EXECUTION_STAGES.findIndex((s) => s.id === currentStage);
    const resolvedIdx = activeIdx >= 0 ? activeIdx : 1;
    return EXECUTION_STAGES.map((stage, idx) => ({
      ...stage,
      status:
        idx < resolvedIdx
          ? "completed"
          : idx === resolvedIdx
          ? "running"
          : "pending",
    }));
  }

  // status === "failed": only attribute failure to a specific execution stage
  // if the backend explicitly reports it via failed_stage or current_stage.
  // Never infer or guess a failed stage when current_stage === "failed" or null.
  const reportedFailedStage = analysis.failed_stage ?? currentStage;
  const failedIdx = EXECUTION_STAGES.findIndex((s) => s.id === reportedFailedStage);
  const errText = failureDetail || failureCode || "Analysis failed.";

  if (failedIdx < 0) {
    return EXECUTION_STAGES.map((stage) => ({
      ...stage,
      status: "pending" as const,
      error: null,
    }));
  }

  return EXECUTION_STAGES.map((stage, idx) => ({
    ...stage,
    status:
      idx < failedIdx
        ? "completed"
        : idx === failedIdx
        ? "failed"
        : "pending",
    error: idx === failedIdx ? errText : null,
  }));
}

export function extractSkillsFromResponse(
  data: Record<string, unknown> | null | undefined
): string[] {
  if (!data) return [];
  if (Array.isArray(data.detected_skills) && data.detected_skills.length > 0) {
    return data.detected_skills.filter((s): s is string => typeof s === "string");
  }
  if (Array.isArray(data.skills) && data.skills.length > 0) {
    return data.skills.filter((s): s is string => typeof s === "string");
  }
  return [];
}

export function normalizeAtsResponse(
  data: Record<string, unknown>
): { parsed: ParsedResumeData; isPartial: boolean } {
  const detectedSkills = extractSkillsFromResponse(data);

  const hasOverallScore =
    typeof data.overall_ats_score === "number" && !Number.isNaN(data.overall_ats_score);
  const hasSkillsScore =
    typeof data.skills_score === "number" && !Number.isNaN(data.skills_score);
  const hasSectionScore =
    typeof data.section_score === "number" && !Number.isNaN(data.section_score);
  const hasImpactScore =
    typeof data.impact_score === "number" && !Number.isNaN(data.impact_score);
  const hasFormattingScore =
    typeof data.formatting_score === "number" && !Number.isNaN(data.formatting_score);

  const isPartial =
    !hasOverallScore ||
    !hasSkillsScore ||
    !hasSectionScore ||
    !hasImpactScore ||
    !hasFormattingScore;

  const parsed: ParsedResumeData = {
    atsScore: hasOverallScore ? Math.round(data.overall_ats_score as number) : null,
    grade: typeof data.grade === "string" && data.grade ? data.grade : null,
    sectionScore: hasSectionScore ? Math.round(data.section_score as number) : null,
    contactScore:
      typeof data.contact_score === "number" && !Number.isNaN(data.contact_score)
        ? Math.round(data.contact_score)
        : null,
    impactScore: hasImpactScore ? Math.round(data.impact_score as number) : null,
    formattingScore: hasFormattingScore ? Math.round(data.formatting_score as number) : null,
    skillsScore: hasSkillsScore ? Math.round(data.skills_score as number) : null,
    skills: detectedSkills,
    experience: [],
    detectedSections:
      data.detected_sections && typeof data.detected_sections === "object"
        ? (data.detected_sections as Record<string, boolean>)
        : undefined,
    missingCriticalSections: Array.isArray(data.missing_critical_sections)
      ? data.missing_critical_sections.filter((s): s is string => typeof s === "string")
      : [],
    actionVerbs: Array.isArray(data.action_verbs_found)
      ? data.action_verbs_found.filter((v): v is string => typeof v === "string")
      : [],
    metricsCount:
      typeof data.quantifiable_metrics_count === "number"
        ? data.quantifiable_metrics_count
        : 0,
    wordCount: typeof data.word_count === "number" ? data.word_count : 0,
    strengths: Array.isArray(data.strengths)
      ? data.strengths.filter((s): s is string => typeof s === "string")
      : [],
    issues: Array.isArray(data.issues)
      ? data.issues.filter(
          (i): i is ResumeIssueItem =>
            Boolean(i) &&
            typeof i === "object" &&
            typeof (i as ResumeIssueItem).issue === "string"
        )
      : [],
  };

  return { parsed, isPartial };
}

export function derivePhaseFromResumeRecord(
  resume: ResumeRecordSummary | null | undefined
): ResumeStudioPhase {
  if (!resume || !resume.id) {
    return "no_resume";
  }
  const status = (resume.processing_status || "").toUpperCase();
  if (status === "NEEDS_ATTENTION" || status === "FAILED") {
    return "needs_attention";
  }
  if (status === "UPLOADING") {
    return "uploading";
  }
  if (
    status === "QUEUED" ||
    status === "PENDING" ||
    status === "PROCESSING" ||
    status === "VALIDATING" ||
    !status
  ) {
    return "validating";
  }
  if (status === "COMPLETED" || status === "READY") {
    return "ready_for_analysis";
  }
  return "validating";
}

export function isResumeIngestionReady(
  resume: ResumeRecordSummary | null | undefined
): boolean {
  return derivePhaseFromResumeRecord(resume) === "ready_for_analysis";
}

export type ClassifiedErrorKind =
  | "canceled"
  | "auth"
  | "not_found"
  | "conflict"
  | "transient"
  | "fatal";

export function classifyApiError(error: unknown): {
  kind: ClassifiedErrorKind;
  statusCode: number | null;
} {
  const errObj = error as {
    name?: string;
    code?: string;
    response?: { status?: number };
  } | null;

  if (
    errObj?.name === "AbortError" ||
    errObj?.name === "CanceledError" ||
    errObj?.code === "ERR_CANCELED"
  ) {
    return { kind: "canceled", statusCode: null };
  }

  const statusCode =
    typeof errObj?.response?.status === "number" ? errObj.response.status : null;

  if (statusCode === 401 || statusCode === 403) {
    return { kind: "auth", statusCode };
  }
  if (statusCode === 404) {
    return { kind: "not_found", statusCode };
  }
  if (statusCode === 409) {
    return { kind: "conflict", statusCode };
  }
  if (
    statusCode === null ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500
  ) {
    return { kind: "transient", statusCode };
  }
  return { kind: "fatal", statusCode };
}

export function mapAnalysisStatusToStudioState(
  analysis: ResumeAnalysisStatusResponse
): {
  phase: ResumeStudioPhase;
  parsed: ParsedResumeData | null;
  errorMessage: string | null;
  shouldPoll: boolean;
} {
  if (analysis.status === "ready") {
    return {
      phase: "ready_for_analysis",
      parsed: null,
      errorMessage: null,
      shouldPoll: false,
    };
  }

  if (analysis.status === "queued" || analysis.status === "running") {
    return {
      phase: "analyzing",
      parsed: null,
      errorMessage: null,
      shouldPoll: Boolean(analysis.run_id),
    };
  }

  if (analysis.status === "completed") {
    if (analysis.result_available && analysis.result) {
      const { parsed, isPartial } = normalizeAtsResponse(analysis.result);
      return {
        phase: isPartial ? "partial" : "completed",
        parsed,
        errorMessage: null,
        shouldPoll: false,
      };
    }
    return {
      phase: "failed",
      parsed: null,
      errorMessage: "Analysis completed but result payload was unavailable.",
      shouldPoll: false,
    };
  }

  return {
    phase: "failed",
    parsed: null,
    errorMessage:
      analysis.failure_detail ||
      analysis.failure_code ||
      "Resume analysis failed. Please retry.",
    shouldPoll: false,
  };
}

export function canStartAnalysis(
  phase: ResumeStudioPhase,
  resumeId: string | null,
  isInFlight: boolean
): boolean {
  if (!resumeId || isInFlight) {
    return false;
  }
  return (
    phase === "ready_for_analysis" ||
    phase === "completed" ||
    phase === "partial" ||
    phase === "failed"
  );
}

export function getAnalysisActionLabel(phase: ResumeStudioPhase): string {
  switch (phase) {
    case "analyzing":
      return "Analyzing Resume...";
    case "completed":
    case "partial":
      return "Re-run AI Analysis";
    case "failed":
      return "Retry AI Analysis";
    default:
      return "Start AI Analysis";
  }
}

export function getResumeQualitySummary(score: number | null | undefined): {
  label: string;
  tone: "emerald" | "amber" | "rose" | "slate";
} {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return { label: "ATS Score Unavailable", tone: "slate" };
  }
  if (score >= 85) {
    return { label: "Strong ATS Quality", tone: "emerald" };
  }
  if (score >= 70) {
    return { label: "Good ATS Compatibility", tone: "amber" };
  }
  return { label: "Needs ATS Optimization", tone: "rose" };
}
