"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import api, { getApiErrorMessage } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnalysisPipeline } from "@/components/AnalysisPipeline";
import { ResumeStudioResults } from "@/components/ResumeStudioResults";
import {
  ParsedResumeData,
  ResumeAnalysisStatusResponse,
  ResumeRecordSummary,
  buildPipelineStages,
  canStartAnalysis,
  derivePhaseFromResumeRecord,
  getAnalysisActionLabel,
} from "@/lib/resumeStudio";
import {
  ResumeStudioLifecycleController,
  ResumeStudioLifecycleSnapshot,
} from "@/lib/resumeStudioLifecycle";
import {
  IconDocument,
  IconCheckCircle,
  IconAlertTriangle,
} from "@/components/Icons";

const POLL_INTERVAL_MS = 1600;

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
    "Tailwind CSS", "Docker", "REST API", "Git",
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
    },
  ],
  detectedSections: {
    experience: true,
    skills: true,
    education: true,
    summary: true,
    contact: true,
  },
  missingCriticalSections: [],
  actionVerbs: ["architected", "integrated", "built", "improved"],
  metricsCount: 2,
  wordCount: 420,
  strengths: [
    "Optimal resume length for automated parsing.",
    "Clean bulleted achievement structure.",
    "Recognized technical skill terminology matching industry taxonomies.",
  ],
  issues: [],
};

export default function ResumePage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<ResumeStudioLifecycleController | null>(null);

  // File Upload State (real progress from Axios only — no fake timers)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Resume List Loading & Error State
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [resumeListError, setResumeListError] = useState<string | null>(null);

  // Backend-Driven Analysis Pipeline State (managed by ResumeStudioLifecycleController)
  const [lifecycle, setLifecycle] = useState<ResumeStudioLifecycleSnapshot>({
    resumeId: null,
    phase: "loading",
    analysisStatus: null,
    activeRunId: null,
    isPolling: false,
    isConnectionPaused: false,
    connectionWarning: null,
    canRetryWithRun: false,
    atsError: null,
    parsedData: null,
  });

  // Isolated demo preview toggle — explicitly separated from real user state
  const [isDemoPreview, setIsDemoPreview] = useState(false);

  const {
    resumeId: uploadedResumeId,
    phase,
    analysisStatus,
    isPolling,
    isConnectionPaused,
    connectionWarning,
    atsError,
    parsedData,
  } = lifecycle;

  const handleStartAnalysis = useCallback(() => {
    void controllerRef.current?.startOrRetryAnalysis();
  }, []);

  const handleCheckStatus = useCallback(() => {
    void controllerRef.current?.recoverLatestStatus();
  }, []);

  const fetchActiveResume = useCallback(async () => {
    setIsLoadingResume(true);
    setResumeListError(null);
    controllerRef.current?.setLoading();
    try {
      const res = await api.get("/profile/resumes");
      if (Array.isArray(res.data) && res.data.length > 0) {
        await controllerRef.current?.applyResumeRecord(
          res.data[0] as ResumeRecordSummary
        );
      } else if (Array.isArray(res.data)) {
        await controllerRef.current?.applyResumeRecord(null);
      } else {
        await controllerRef.current?.applyResumeRecord(null);
        setResumeListError(
          "Unexpected response format received while fetching candidate resumes."
        );
      }
    } catch (err: unknown) {
      await controllerRef.current?.applyResumeRecord(null);
      setResumeListError(
        getApiErrorMessage(
          err,
          "Unable to load candidate resumes due to a network or server issue."
        )
      );
    } finally {
      setIsLoadingResume(false);
    }
  }, []);

  useEffect(() => {
    const controller = new ResumeStudioLifecycleController({
      pollIntervalMs: POLL_INTERVAL_MS,
      maxTransientPollErrors: 5,
      getErrorMessage: getApiErrorMessage,
      onStateChange: (next) => {
        setLifecycle(next);
      },
      client: {
        getLatestAnalysisStatus: async (resumeId, signal) => {
          const res = await api.get<ResumeAnalysisStatusResponse>(
            `/resumes/${resumeId}/analysis`,
            { signal }
          );
          return res.data;
        },
        getRunStatus: async (resumeId, runId, signal) => {
          const res = await api.get<ResumeAnalysisStatusResponse>(
            `/resumes/${resumeId}/analysis/${runId}`,
            { signal }
          );
          return res.data;
        },
        startAnalysis: async (resumeId, signal) => {
          const res = await api.post<ResumeAnalysisStatusResponse>(
            `/resumes/${resumeId}/analysis`,
            undefined,
            { signal }
          );
          return res.data;
        },
        retryAnalysis: async (resumeId, runId, signal) => {
          const res = await api.post<ResumeAnalysisStatusResponse>(
            `/resumes/${resumeId}/analysis/${runId}/retry`,
            undefined,
            { signal }
          );
          return res.data;
        },
      },
    });
    controllerRef.current = controller;

    if (user && user.role !== "candidate" && user.role !== "admin") {
      return () => {
        controller.dispose();
        controllerRef.current = null;
      };
    }

    let isMounted = true;
    const loadInitial = async () => {
      try {
        const res = await api.get("/profile/resumes");
        if (!isMounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          await controller.applyResumeRecord(
            res.data[0] as ResumeRecordSummary
          );
        } else if (Array.isArray(res.data)) {
          await controller.applyResumeRecord(null);
        } else {
          await controller.applyResumeRecord(null);
          setResumeListError(
            "Unexpected response format received while fetching candidate resumes."
          );
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        await controller.applyResumeRecord(null);
        setResumeListError(
          getApiErrorMessage(
            err,
            "Unable to load candidate resumes due to a network or server issue."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoadingResume(false);
        }
      }
    };
    void loadInitial();

    return () => {
      isMounted = false;
      controller.dispose();
      controllerRef.current = null;
    };
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    if (!file.name.match(/\.(pdf|docx)$/i)) {
      setStatusMsg({
        type: "error",
        text: "Please upload a supported resume format: PDF or DOCX.",
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
    setUploadPercent(null);
    controllerRef.current?.setUploading();
    setStatusMsg(null);
    setIsDemoPreview(false);
    setResumeListError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/profile/resumes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (typeof evt.total === "number" && evt.total > 0) {
            setUploadPercent(Math.min(100, Math.round((evt.loaded * 100) / evt.total)));
          }
        },
      });

      const uploadedRecord = (res.data || null) as ResumeRecordSummary | null;
      await controllerRef.current?.applyResumeRecord(uploadedRecord);

      if (uploadedRecord && derivePhaseFromResumeRecord(uploadedRecord) === "ready_for_analysis") {
        setStatusMsg({
          type: "success",
          text: `Resume "${file.name}" uploaded and validated. Click Start AI Analysis when ready.`,
        });
      }
    } catch (err: unknown) {
      const serverMsg = getApiErrorMessage(
        err,
        "Failed to process resume upload. Please try again."
      );
      setStatusMsg({ type: "error", text: serverMsg });
      await controllerRef.current?.applyResumeRecord(null);
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeData: ParsedResumeData | null = isDemoPreview
    ? DEMO_FIXTURE_RESUME
    : parsedData;

  const stages = buildPipelineStages(analysisStatus);
  const canTrigger = canStartAnalysis(
    phase,
    uploadedResumeId,
    phase === "analyzing" || isPolling
  );

  return (
    <ProtectedRoute allowedRoles={["candidate", "admin"]}>
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
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDemoPreview ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs font-semibold ${
                    isDemoPreview ? "text-amber-500" : "text-emerald-500"
                  }`}
                >
                  CareerSync • Resume Studio
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
                Resume Studio &amp; AI Resume Analyzer
              </h1>
              <p
                className={`text-xs sm:text-sm mt-1 max-w-xl ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Upload and validate your CV, explicitly run backend AI analysis, and review grounded ATS compatibility and extracted skills.
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-center border ${
                isDemoPreview
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : isLoadingResume
                  ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  : resumeListError
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : uploadedResumeId
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}
            >
              {isDemoPreview
                ? "Demo Preview (Static Fixture)"
                : isLoadingResume
                ? "Loading Status..."
                : resumeListError
                ? "Connection / Server Error"
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
            className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-3 shadow-sm"
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
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between shadow-lg ${
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
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          aria-label="Upload resume file"
        />

        {/* Upload Dropzone */}
        <div
          role="button"
          tabIndex={isUploading ? -1 : 0}
          aria-disabled={isUploading}
          aria-label={
            uploadedResumeId
              ? "Upload and replace active resume (PDF or DOCX)"
              : "Upload resume (PDF or DOCX)"
          }
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (!isUploading && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative overflow-hidden p-7 sm:p-10 rounded-2xl border-2 border-dashed transition-all duration-300 text-center group focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${
            isUploading ? "cursor-wait opacity-90" : "cursor-pointer"
          } ${
            isDark
              ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/50"
              : "bg-white border-slate-300 hover:border-emerald-500 shadow-xs"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3.5 group-hover:scale-105 transition shadow-sm">
            {isUploading ? (
              <svg className="w-7 h-7 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <IconDocument size={28} className="text-emerald-500" />
            )}
          </div>

          <h3 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {isUploading
              ? uploadPercent !== null
                ? `Uploading Resume (${uploadPercent}%)`
                : "Uploading Resume to Backend..."
              : uploadedResumeId
              ? "Click or press Enter to replace your active resume (PDF, DOCX)"
              : "Click or press Enter to upload your resume (PDF or DOCX)"}
          </h3>
          <p className={`text-xs mt-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Supports PDF &amp; DOCX (Max 10MB). Uploading validates your document; AI analysis starts only when you click Start AI Analysis.
          </p>

          {isUploading && uploadPercent !== null && (
            <div className="max-w-xs mx-auto mt-4">
              <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reusable Visual Pipeline (always visible for real candidate state) */}
        {!isDemoPreview && !resumeListError && (
          <AnalysisPipeline
            phase={phase}
            stages={stages}
            errorMessage={atsError}
            connectionWarning={connectionWarning}
            isConnectionPaused={isConnectionPaused}
            isDark={isDark}
            onStartAnalysis={handleStartAnalysis}
            onRetryAnalysis={handleStartAnalysis}
            onCheckStatus={handleCheckStatus}
            canTriggerAnalysis={canTrigger}
            actionLabel={getAnalysisActionLabel(phase)}
          />
        )}

        {/* Primary Content Area by State */}
        {isLoadingResume && !isDemoPreview ? (
          <div
            className={`p-10 rounded-2xl border text-center ${
              isDark
                ? "bg-slate-900/60 border-slate-800 text-slate-400"
                : "bg-white border-slate-200 text-slate-500 shadow-sm"
            }`}
          >
            <span className="text-sm font-semibold">
              Checking for candidate resume on file...
            </span>
          </div>
        ) : resumeListError && !isDemoPreview ? (
          <div
            className={`p-8 sm:p-10 rounded-2xl border text-center space-y-4 ${
              isDark
                ? "bg-rose-950/20 border-rose-800/60 text-rose-200"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <IconAlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold">Unable to Load Candidate Resumes</h3>
              <p className="text-xs sm:text-sm max-w-md mx-auto mt-1 opacity-90">
                {resumeListError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchActiveResume()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition shadow-sm cursor-pointer"
            >
              Retry Loading Resumes
            </button>
          </div>
        ) : !uploadedResumeId && !isDemoPreview ? (
          <div
            className={`p-8 sm:p-12 rounded-2xl border text-center space-y-3 ${
              isDark
                ? "bg-slate-900/60 border-slate-800 text-slate-300"
                : "bg-white border-slate-200 text-slate-600 shadow-sm"
            }`}
          >
            <h3 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              No Active Resume on File
            </h3>
            <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Upload your resume above to validate it, then click Start AI Analysis to inspect ATS compatibility and extracted skills.
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
        ) : activeData ? (
          <ResumeStudioResults
            data={activeData}
            isPartial={phase === "partial"}
            isDemoPreview={isDemoPreview}
            isDark={isDark}
          />
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
    </ProtectedRoute>
  );
}
