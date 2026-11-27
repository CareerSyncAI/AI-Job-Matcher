"use client";

import React from "react";
import {
  PipelineStageItem,
  PipelineStageStatus,
  ResumeStudioPhase,
} from "@/lib/resumeStudio";
import { IconAlertTriangle, IconCheckCircle } from "@/components/Icons";

interface AnalysisPipelineProps {
  phase: ResumeStudioPhase;
  stages: PipelineStageItem[];
  errorMessage?: string | null;
  connectionWarning?: string | null;
  isConnectionPaused?: boolean;
  isDark?: boolean;
  onStartAnalysis?: () => void;
  onRetryAnalysis?: () => void;
  onCheckStatus?: () => void;
  canTriggerAnalysis?: boolean;
  actionLabel?: string;
}

const STAGE_BADGE_STYLES: Record<PipelineStageStatus, string> = {
  pending: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const STAGE_STATUS_LABELS: Record<PipelineStageStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

export const AnalysisPipeline: React.FC<AnalysisPipelineProps> = ({
  phase,
  stages,
  errorMessage,
  connectionWarning,
  isConnectionPaused = false,
  isDark = true,
  onStartAnalysis,
  onRetryAnalysis,
  onCheckStatus,
  canTriggerAnalysis = false,
  actionLabel = "Start AI Analysis",
}) => {
  const isRunning = phase === "analyzing" || phase === "validating" || phase === "uploading";
  const isFailed = phase === "failed" || phase === "needs_attention";

  return (
    <section
      aria-label="AI Resume Analysis Pipeline"
      className={`p-5 sm:p-6 rounded-2xl border transition-colors ${
        isDark
          ? "bg-slate-900/80 border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning
                  ? "bg-emerald-500 motion-safe:animate-pulse"
                  : isFailed
                  ? "bg-rose-500"
                  : phase === "completed" || phase === "partial"
                  ? "bg-emerald-500"
                  : phase === "ready_for_analysis"
                  ? "bg-cyan-500"
                  : "bg-slate-500"
              }`}
              aria-hidden="true"
            />
            <h2 className="text-base font-bold tracking-tight">
              AI Analysis Pipeline
            </h2>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}
          >
            {phase === "no_resume" &&
              "Upload a PDF or DOCX resume to prepare it for AI analysis."}
            {phase === "loading" &&
              "Checking for an existing resume on your profile."}
            {phase === "uploading" &&
              "Uploading resume to backend storage."}
            {phase === "validating" &&
              "Validating document structure and preparing text for analysis."}
            {phase === "needs_attention" &&
              "Document validation requires attention before AI analysis can run."}
            {phase === "ready_for_analysis" &&
              "Resume validated and ready. Start AI Analysis explicitly when you are ready."}
            {phase === "analyzing" &&
              "Backend AI analysis is running. Progress reflects live server status."}
            {phase === "completed" &&
              "AI resume analysis completed. Review your results below or re-run analysis."}
            {phase === "partial" &&
              "Analysis completed with partial fields unavailable from the backend."}
            {phase === "failed" &&
              "Analysis did not complete. Review the error below and retry."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isConnectionPaused && onCheckStatus ? (
            <button
              type="button"
              onClick={onCheckStatus}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-sm"
            >
              Check Status
            </button>
          ) : phase === "failed" && onRetryAnalysis ? (
            <button
              type="button"
              onClick={onRetryAnalysis}
              disabled={!canTriggerAnalysis}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
            >
              {actionLabel}
            </button>
          ) : onStartAnalysis ? (
            <button
              type="button"
              onClick={onStartAnalysis}
              disabled={!canTriggerAnalysis || isRunning}
              aria-busy={phase === "analyzing"}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                phase === "completed" || phase === "partial"
                  ? isDark
                    ? "bg-slate-800 text-emerald-300 border border-emerald-500/30 hover:bg-slate-700"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              }`}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>

      {connectionWarning && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isDark
              ? "bg-amber-950/30 border-amber-700/60 text-amber-200"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <IconAlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5" />
          <p className="leading-relaxed break-words">{connectionWarning}</p>
        </div>
      )}

      {errorMessage && (phase === "failed" || phase === "needs_attention") && (
        <div
          role="alert"
          className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isDark
              ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <IconAlertTriangle size={16} className="shrink-0 text-rose-500 mt-0.5" />
          <p className="leading-relaxed break-words">{errorMessage}</p>
        </div>
      )}

      {/* Backend-Driven Stage List or Truthful General Status */}
      {stages.length > 0 ? (
        <ol className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {stages.map((stage) => {
            const isStageRunning = stage.status === "running";
            const isStageCompleted = stage.status === "completed";
            const isStageFailed = stage.status === "failed";

            return (
              <li
                key={stage.id}
                aria-current={isStageRunning ? "step" : undefined}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isStageRunning
                    ? isDark
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-emerald-50/70 border-emerald-300"
                    : isStageFailed
                    ? isDark
                      ? "bg-rose-950/20 border-rose-500/40"
                      : "bg-rose-50/70 border-rose-300"
                    : isDark
                    ? "bg-slate-950/60 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold truncate">{stage.name}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 flex items-center gap-1 ${STAGE_BADGE_STYLES[stage.status]}`}
                  >
                    {isStageRunning && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-ping"
                        aria-hidden="true"
                      />
                    )}
                    {isStageCompleted && (
                      <IconCheckCircle size={11} className="text-emerald-400" />
                    )}
                    {isStageFailed && (
                      <IconAlertTriangle size={11} className="text-rose-400" />
                    )}
                    {STAGE_STATUS_LABELS[stage.status]}
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {stage.description}
                </p>
                {stage.error && (
                  <p className="mt-1.5 text-[11px] text-rose-400 font-medium">
                    {stage.error}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div
          className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            isDark
              ? "bg-slate-950/60 border-slate-800 text-slate-400"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <span>
            {phase === "analyzing"
              ? "Backend execution in progress — detailed stage-by-stage telemetry is awaiting pipeline status data."
              : phase === "ready_for_analysis"
              ? "Step: Ready for Analysis — click Start AI Analysis to run backend evaluation."
              : phase === "completed" || phase === "partial"
              ? "Latest backend evaluation received. Stage-level breakdown unavailable from current endpoint."
              : "Stage-by-stage pipeline telemetry will appear here once backend execution begins."}
          </span>
        </div>
      )}
    </section>
  );
};
