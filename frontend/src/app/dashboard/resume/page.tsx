"use client";

import React, { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  IconDocument,
  IconCheckCircle,
  IconAlertTriangle,
} from "@/components/Icons";

interface ParsedResumeData {
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
  actionVerbs?: string[];
  metricsCount?: number;
  wordCount?: number;
  strengths?: string[];
  issues?: Array<{
    category: string;
    severity: string;
    issue: string;
    recommendation: string;
  }>;
}

/**
 * Isolated demo fixture for testing UI components.
 * STRICT INVARIANT: This demo fixture is NEVER used as initial or fallback state
 * for real candidate profiles or live analysis requests.
 */
const DEMO_FIXTURE_RESUME: ParsedResumeData = {
  atsScore: 88,
  grade: "B",
  sectionScore: 90,
  contactScore: 95,
  impactScore: 82,
  formattingScore: 86,
  skillsScore: 88,
  skills: [
    "TypeScript", "React", "Next.js", "Python", "FastAPI", "PostgreSQL",
    "Tailwind CSS", "Docker", "REST API", "Git"
  ],
  experience: [
    {
      title: "Senior Frontend Developer (Sample)",
      company: "InnovateTech Inc. (Demo)",
      period: "2022 - Present",
      summary: "Architected high-performance Next.js application handling 500k monthly active users. Integrated AI search components with vector index endpoints.",
    },
    {
      title: "Full Stack Engineer (Sample)",
      company: "DataDriven Labs (Demo)",
      period: "2020 - 2022",
      summary: "Built automated data processing pipelines with FastAPI and PostgreSQL. Improved query performance by 40%.",
    }
  ],
  detectedSections: {
    experience: true,
    skills: true,
    education: true,
    summary: true,
    contact: true,
  },
  actionVerbs: ["architected", "integrated", "built", "improved"],
  metricsCount: 2,
  wordCount: 420,
  strengths: [
    "Optimal resume length for automated parsing.",
    "Clean bulleted achievement structure.",
    "Recognized technical skill terminology matching industry taxonomies."
  ],
  issues: []
};

function extractSkillsFromResponse(data: Record<string, unknown> | null | undefined): string[] {
  if (!data) return [];
  if (Array.isArray(data.detected_skills) && data.detected_skills.length > 0) {
    return data.detected_skills.filter((s): s is string => typeof s === "string");
  }
  if (Array.isArray(data.skills) && data.skills.length > 0) {
    return data.skills.filter((s): s is string => typeof s === "string");
  }
  return [];
}

export default function ResumePage() {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Truthful ATS Analysis States:
  // - "idle": No resume uploaded or not yet requested
  // - "loading": Active request in flight
  // - "completed": Complete ATS evaluation received
  // - "partial": Analysis received with partial or unavailable fields
  // - "failed": Analysis request or parsing error
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [atsStatus, setAtsStatus] = useState<"idle" | "loading" | "completed" | "partial" | "failed">("idle");
  const [atsError, setAtsError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);

  // Isolated demo preview toggle — explicitly separated from real user state
  const [isDemoPreview, setIsDemoPreview] = useState(false);

  const runAtsAnalysis = async (resumeId: string, isMounted = true) => {
    setAtsStatus("loading");
    setAtsError(null);
    try {
      const atsRes = await api.get(`/resumes/${resumeId}/ats`);
      if (!isMounted) return;

      if (atsRes.data && typeof atsRes.data === "object") {
        const data = atsRes.data as Record<string, unknown>;
        const detectedSkills = extractSkillsFromResponse(data);

        const hasOverallScore = typeof data.overall_ats_score === "number" && !isNaN(data.overall_ats_score);
        const hasSkillsScore = typeof data.skills_score === "number" && !isNaN(data.skills_score);
        const hasSectionScore = typeof data.section_score === "number" && !isNaN(data.section_score);
        const hasImpactScore = typeof data.impact_score === "number" && !isNaN(data.impact_score);
        const hasFormattingScore = typeof data.formatting_score === "number" && !isNaN(data.formatting_score);

        const isPartial =
          !hasOverallScore ||
          !hasSkillsScore ||
          !hasSectionScore ||
          !hasImpactScore ||
          !hasFormattingScore;

        setParsedData({
          atsScore: hasOverallScore ? Math.round(data.overall_ats_score as number) : null,
          grade: typeof data.grade === "string" && data.grade ? (data.grade as string) : null,
          sectionScore: hasSectionScore ? Math.round(data.section_score as number) : null,
          contactScore: typeof data.contact_score === "number" ? Math.round(data.contact_score as number) : null,
          impactScore: hasImpactScore ? Math.round(data.impact_score as number) : null,
          formattingScore: hasFormattingScore ? Math.round(data.formatting_score as number) : null,
          skillsScore: hasSkillsScore ? Math.round(data.skills_score as number) : null,
          skills: detectedSkills,
          experience: [], // Real extraction does not fabricate experience
          detectedSections:
            data.detected_sections && typeof data.detected_sections === "object"
              ? (data.detected_sections as Record<string, boolean>)
              : undefined,
          actionVerbs: Array.isArray(data.action_verbs_found)
            ? data.action_verbs_found.filter((v): v is string => typeof v === "string")
            : [],
          metricsCount: typeof data.quantifiable_metrics_count === "number" ? (data.quantifiable_metrics_count as number) : 0,
          wordCount: typeof data.word_count === "number" ? (data.word_count as number) : 0,
          strengths: Array.isArray(data.strengths)
            ? data.strengths.filter((s): s is string => typeof s === "string")
            : [],
          issues: Array.isArray(data.issues)
            ? (data.issues as Array<{ category: string; severity: string; issue: string; recommendation: string }>)
            : [],
        });
        setAtsStatus(isPartial ? "partial" : "completed");
      } else {
        setAtsStatus("failed");
        setAtsError("ATS analysis service returned an empty response.");
        setParsedData(null);
      }
    } catch (err: unknown) {
      if (!isMounted) return;
      const errDetail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setAtsStatus("failed");
      setAtsError(errDetail || "Failed to retrieve ATS analysis for this resume.");
      setParsedData(null);
    }
  };

  // Load existing uploaded resume on mount
  useEffect(() => {
    let isMounted = true;
    const fetchExistingResumes = async () => {
      try {
        const res = await api.get("/profile/resumes");
        if (!isMounted) return;

        if (Array.isArray(res.data) && res.data.length > 0) {
          const latest = res.data[0];
          setUploadedResumeId(latest.id);

          if (latest.processing_status === "NEEDS_ATTENTION") {
            setAtsStatus("failed");
            setAtsError(
              `Resume processing requires attention (${latest.needs_attention_reason || "unreadable or corrupted document"}). Please re-upload a clean file.`
            );
            setParsedData(null);
          } else {
            await runAtsAnalysis(latest.id, isMounted);
          }
        } else {
          setUploadedResumeId(null);
          setAtsStatus("idle");
          setParsedData(null);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Could not load candidate resumes:", err);
          setUploadedResumeId(null);
          setAtsStatus("idle");
          setParsedData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingResume(false);
        }
      }
    };

    fetchExistingResumes();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(pdf|docx|txt)$/i)) {
      setStatusMsg({
        type: "error",
        text: "Please upload a supported resume format: PDF, DOCX, or TXT.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({
        type: "error",
        text: "Resume file size exceeds maximum limit of 10MB.",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setStatusMsg(null);
    setIsDemoPreview(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev >= 85 ? 85 : prev + 15));
      }, 200);

      const res = await api.post("/profile/resumes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      const newResumeId = res.data?.id || null;
      setUploadedResumeId(newResumeId);

      setStatusMsg({
        type: "success",
        text: `Resume "${file.name}" uploaded successfully! Parsing and ATS evaluation initiated.`,
      });

      if (newResumeId) {
        await runAtsAnalysis(newResumeId);
      }
    } catch (err: unknown) {
      const errResponse = (err as { response?: { data?: { detail?: string } } })?.response;
      setStatusMsg({
        type: "error",
        text: errResponse?.data?.detail || "Failed to process resume upload. Please try again.",
      });
      setAtsStatus("failed");
      setAtsError("Resume upload failed. Please try again with a valid PDF or DOCX.");
      setParsedData(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeData: ParsedResumeData | null = isDemoPreview ? DEMO_FIXTURE_RESUME : parsedData;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isDemoPreview ? "bg-amber-500" : "bg-emerald-500"} animate-ping`} />
              <span className={`text-xs font-semibold ${isDemoPreview ? "text-amber-500" : "text-emerald-500"}`}>
                CareerSync • Resume Studio
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
              Resume Studio &amp; ATS Syntax Analyzer
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Upload your CV to extract structured skill entities, verify ATS keyword compatibility, and enable 1-click Quick Apply.
            </p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-center border ${
              isDemoPreview
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                : uploadedResumeId
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}
          >
            {isDemoPreview
              ? "Demo Preview (Isolated Fixture)"
              : uploadedResumeId
              ? "✓ Active Resume on File"
              : "No Resume Uploaded"}
          </span>
        </div>
      </div>

      {/* Demo Mode Notice Banner if Active */}
      {isDemoPreview && (
        <div
          role="region"
          aria-label="Demo mode notice"
          className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <IconAlertTriangle size={18} className="shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-sm">Demo Mode Active — Static Test Fixture</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                Displaying isolated sample ATS data for preview purposes. This data does NOT reflect real candidate analysis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDemoPreview(false)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition cursor-pointer shrink-0"
          >
            Exit Demo Mode
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {statusMsg && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between shadow-lg animate-fadeIn ${
            statusMsg.type === "error"
              ? isDark
                ? "bg-rose-950/80 border-rose-800 text-rose-200"
                : "bg-rose-50 border-rose-300 text-rose-900"
              : isDark
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
              : "bg-emerald-50 border-emerald-300 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMsg.type === "error" ? (
              <IconAlertTriangle size={18} className="shrink-0 text-rose-500" />
            ) : (
              <IconCheckCircle size={18} className="shrink-0 text-emerald-500" />
            )}
            <p className="font-semibold text-sm">{statusMsg.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm cursor-pointer p-1"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload resume file"
      />

      {/* Upload Box with Animated Scanner */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-300 text-center group cursor-pointer ${
          isDark
            ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/50"
            : "bg-white border-slate-300 hover:border-emerald-500 shadow-xs"
        }`}
      >
        {/* Animated Scanner Laser Bar */}
        {isUploading && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] top-0 animate-bounce transition-all duration-700 pointer-events-none" />
        )}

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition shadow-sm">
          {isUploading ? (
            <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <IconDocument size={30} className="text-emerald-500" />
          )}
        </div>

        <h3 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <span>Scanning &amp; Ingesting Resume ({uploadProgress}%)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </span>
          ) : uploadedResumeId ? (
            "Click to upload and replace your active resume (PDF, DOCX)"
          ) : (
            "Click to upload your resume (PDF or DOCX)"
          )}
        </h3>
        <p className={`text-xs mt-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Supports PDF &amp; DOCX (Max 10MB). Extracted skill vectors are securely linked to your profile.
        </p>

        {isUploading && (
          <div className="max-w-xs mx-auto mt-4">
            <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary Content Area by State */}
      {isLoadingResume && !isDemoPreview ? (
        <div
          className={`p-12 rounded-2xl border text-center ${
            isDark ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <svg className="w-5 h-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-semibold">Checking for candidate resume on file...</span>
          </div>
        </div>
      ) : !uploadedResumeId && !isDemoPreview ? (
        <div
          className={`p-10 sm:p-14 rounded-2xl border text-center space-y-3 ${
            isDark ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600 shadow-sm"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2">
            <IconDocument size={28} />
          </div>
          <h3 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            No Active Resume on File
          </h3>
          <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Upload your resume above to run automated ATS syntax analysis, identify detected skills, and verify keyword readiness across job applications.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-sm"
            >
              Upload CV to Get Started
            </button>
          </div>
        </div>
      ) : atsStatus === "loading" && !isDemoPreview ? (
        <div
          className={`p-12 rounded-2xl border text-center ${
            isDark ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-sm"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <svg className="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">
              Evaluating resume syntax &amp; computing ATS score...
            </span>
            <p className="text-xs text-slate-500 max-w-sm">
              Verifying section structure, scanning action verbs, and matching skills against the canonical taxonomy.
            </p>
          </div>
        </div>
      ) : atsStatus === "failed" && !isDemoPreview ? (
        <div
          className={`p-8 sm:p-12 rounded-2xl border text-center space-y-4 ${
            isDark ? "bg-rose-950/20 border-rose-800/60 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-2">
            <IconAlertTriangle size={28} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">ATS Analysis Unavailable</h3>
            <p className="text-xs sm:text-sm max-w-md mx-auto mt-1 leading-relaxed opacity-90">
              {atsError || "The ATS analysis service was unable to evaluate this resume file. Ensure the file contains selectable text and try again."}
            </p>
          </div>
          {uploadedResumeId && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => runAtsAnalysis(uploadedResumeId)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition shadow-sm cursor-pointer"
              >
                Retry ATS Analysis
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-rose-500/30 hover:bg-rose-500/10 transition cursor-pointer"
              >
                Upload Different File
              </button>
            </div>
          )}
        </div>
      ) : activeData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ATS Score Panel */}
          <div
            className={`p-6 rounded-2xl border backdrop-blur-md space-y-6 ${
              isDark ? "bg-slate-900/80 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                  ATS Score Breakdown
                </h2>
                {atsStatus === "partial" && !isDemoPreview && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Partial
                  </span>
                )}
              </div>
              {activeData.grade ? (
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold font-mono rounded-full border ${
                    isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  Grade {activeData.grade}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-mono rounded-full border text-slate-400 border-slate-700">
                  Grade —
                </span>
              )}
            </div>

            {/* Overall Score Dial */}
            <div
              className={`flex flex-col items-center justify-center p-6 rounded-xl border ${
                isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              {typeof activeData.atsScore === "number" ? (
                <>
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                    {activeData.atsScore}/100
                  </span>
                  <span className={`text-xs font-semibold mt-1 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                    {activeData.atsScore >= 85
                      ? "Excellent Candidate Alignment"
                      : activeData.atsScore >= 70
                      ? "Good ATS Compatibility"
                      : "Needs Keyword Optimization"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-slate-400">— / 100</span>
                  <span className="text-xs font-medium text-slate-400 mt-1">
                    Overall score unavailable
                  </span>
                </>
              )}
            </div>

            {/* Sub-Score Dimensions */}
            <div className="space-y-4">
              {/* Keyword & Skill Density */}
              <div>
                <div className={`flex justify-between text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <span>Keyword &amp; Skill Density</span>
                  <span>{typeof activeData.skillsScore === "number" ? `${activeData.skillsScore}%` : "—"}</span>
                </div>
                <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${typeof activeData.skillsScore === "number" ? Math.min(100, Math.max(0, activeData.skillsScore)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Formatting & Readability */}
              <div>
                <div className={`flex justify-between text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <span>Formatting &amp; Readability</span>
                  <span>{typeof activeData.formattingScore === "number" ? `${activeData.formattingScore}%` : "—"}</span>
                </div>
                <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${typeof activeData.formattingScore === "number" ? Math.min(100, Math.max(0, activeData.formattingScore)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Verbs & Impact */}
              <div>
                <div className={`flex justify-between text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <span>Action Verbs &amp; Impact</span>
                  <span>{typeof activeData.impactScore === "number" ? `${activeData.impactScore}%` : "—"}</span>
                </div>
                <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${typeof activeData.impactScore === "number" ? Math.min(100, Math.max(0, activeData.impactScore)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Section Organization */}
              <div>
                <div className={`flex justify-between text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <span>Section Organization</span>
                  <span>{typeof activeData.sectionScore === "number" ? `${activeData.sectionScore}%` : "—"}</span>
                </div>
                <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${typeof activeData.sectionScore === "number" ? Math.min(100, Math.max(0, activeData.sectionScore)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Strengths list if available */}
            {Array.isArray(activeData.strengths) && activeData.strengths.length > 0 && (
              <div className="pt-2 border-t border-slate-800/40">
                <h4 className={`text-xs font-semibold mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Detected Strengths
                </h4>
                <ul className="space-y-1.5">
                  {activeData.strengths.slice(0, 3).map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span className={isDark ? "text-slate-400" : "text-slate-600"}>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Extracted Structured Skills & Experience */}
          <div
            className={`lg:col-span-2 p-6 rounded-2xl border backdrop-blur-md space-y-6 ${
              isDark ? "bg-slate-900/80 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  Extracted Skill Entities
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Canonical skills and competencies identified by taxonomy matching.
                </p>
              </div>
              <span
                className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                  isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {Array.isArray(activeData.skills) ? activeData.skills.length : 0} Skills Detected
              </span>
            </div>

            {/* Skills Tags */}
            <div>
              <h3 className={`text-xs font-semibold mb-2.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Technical Skills Detected
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(activeData.skills) && activeData.skills.length > 0 ? (
                  activeData.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${
                        isDark
                          ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
                          : "text-emerald-800 bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                      }`}
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <div
                    className={`p-3 rounded-xl border text-xs w-full ${
                      isDark ? "bg-slate-950/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    No explicit technical skills recognized in this resume. Ensure your resume contains standard technical skill keywords.
                  </div>
                )}
              </div>
            </div>

            {/* Experience Section Analysis */}
            <div>
              <h3 className={`text-xs font-semibold mb-2.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Work Experience
              </h3>
              <div className="space-y-3">
                {Array.isArray(activeData.experience) && activeData.experience.length > 0 ? (
                  activeData.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition ${
                        isDark
                          ? "bg-slate-950/80 border-slate-800 hover:border-emerald-500/30"
                          : "bg-slate-50 border-slate-200 hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex justify-between text-xs font-bold">
                        <span className={isDark ? "text-slate-200" : "text-slate-900"}>{exp.title}</span>
                        <span className={`font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>{exp.period}</span>
                      </div>
                      <p className={`text-xs font-semibold mt-0.5 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                        {exp.company}
                      </p>
                      <p className={`text-xs mt-2 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {exp.summary}
                      </p>
                    </div>
                  ))
                ) : (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      isDark ? "bg-slate-950/80 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Section Status:</span>
                      {activeData.detectedSections?.experience ? (
                        <span className="text-emerald-500 font-medium">✓ Experience section heading recognized in resume</span>
                      ) : (
                        <span className="text-amber-500 font-medium">⚠ Experience section heading not detected</span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Detailed candidate experience timeline and tenure are verified during job evaluation against specific requisition requirements.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Improvement Recommendations if detected by ATS */}
            {Array.isArray(activeData.issues) && activeData.issues.length > 0 && (
              <div className="pt-2">
                <h3 className={`text-xs font-semibold mb-2.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  ATS Optimization Recommendations ({activeData.issues.length})
                </h3>
                <div className="space-y-2">
                  {activeData.issues.slice(0, 3).map((iss, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        iss.severity === "critical"
                          ? isDark
                            ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                            : "bg-rose-50 border-rose-200 text-rose-900"
                          : isDark
                          ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <p className="font-semibold">{iss.issue}</p>
                      <p className={`mt-0.5 text-[11px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        💡 {iss.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Explicit Demo Toggle — Isolated from Real Candidate State */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => setIsDemoPreview((prev) => !prev)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
            isDemoPreview
              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
              : "border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600"
          }`}
        >
          {isDemoPreview ? "Exit Demo Preview" : "Inspect Sample ATS Report (Isolated Demo)"}
        </button>
      </div>
    </div>
  );
}
