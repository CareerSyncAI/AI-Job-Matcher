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
  if (status === "PENDING" || status === "PROCESSING" || status === "VALIDATING") {
    return "validating";
  }
  return "ready_for_analysis";
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
