"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { getApplicationStatusLabel } from "@/lib/applicationStatus";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MatchScoreGauge, getMatchScoreTier } from "@/components/MatchScoreGauge";
import {
  IconBriefcase,
  IconBuilding,
  IconCheckCircle,
  IconAlertTriangle,
  IconTarget,
  IconTrendUp,
  IconSearch,
  IconX,
} from "@/components/Icons";
import {
  CandidateMatchResults,
  SkillEvidenceItem,
  ISOLATED_TEST_MATCH_RESULTS_FIXTURE,
} from "@/lib/types/matchResults";

export default function CandidateMatchResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { isDark } = useTheme();

  const applicationId = params?.id as string;
  const runId = searchParams?.get("run_id");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CandidateMatchResults | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useDevFixture, setUseDevFixture] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Evidence filtering and search states
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "matched" | "transferable" | "not_detected">("all");
  const [evidenceSearch, setEvidenceSearch] = useState("");

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    if (useDevFixture) {
      const timer = setTimeout(() => {
        if (active) {
          setData({
            ...ISOLATED_TEST_MATCH_RESULTS_FIXTURE,
            application_id: applicationId || "test-app",
          });
          setLoading(false);
          setErrorStatus(null);
          setErrorMessage(null);
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const loadData = async () => {
      if (!applicationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorStatus(null);
        setErrorMessage(null);
        const queryParam = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
        const res = await api.get(`/applications/${applicationId}/match-results${queryParam}`);
        if (active) {
          setData(res.data);
        }
      } catch (err: unknown) {
        if (!active) return;
        const response = (err as { response?: { status?: number; data?: { detail?: string; error?: { message?: string } } } })?.response;
        const status = response?.status || 500;
        const detail = response?.data?.detail || response?.data?.error?.message;

        setErrorStatus(status);
        if (status === 404) {
          setErrorMessage(detail || "The requested job application or evaluation run was not found.");
        } else if (status === 403 || status === 401) {
          setErrorMessage(detail || "You do not have permission to view evaluation results for this application.");
        } else {
          setErrorMessage(detail || "Unable to load match results from server. Please try again later.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [applicationId, runId, useDevFixture, refreshKey]);

  // Derived state
  const isCompleted = data?.evaluation_status === "completed" && typeof data?.overall_match_score === "number";
  const isPending = data?.evaluation_status === "pending" || data?.evaluation_status === "queued" || data?.evaluation_status === "running";
  const isFailed = data?.evaluation_status === "failed";

  const scoreTier = useMemo(() => {
    return getMatchScoreTier(data?.overall_match_score);
  }, [data?.overall_match_score]);

  // Skill requirement & type lookup
  const skillRequirementMap = useMemo(() => {
    const map = new Map<string, { required: boolean | null; type: string }>();
    if (data?.skill_evidence) {
      for (const ev of data.skill_evidence) {
        if (ev.requirement) {
          map.set(ev.requirement.toLowerCase(), {
            required:
              typeof ev.required === "boolean"
                ? ev.required
                : ev.details === "required"
                ? true
                : ev.details === "preferred"
                ? false
                : null,
            type: ev.type,
          });
        }
      }
    }
    return map;
  }, [data]);

  // Skill calculations for presentation
  const matchedCount = data?.matched_skills?.length || 0;
  const transferableCount = data?.transferable_skills?.length || 0;
  const missingCount = data?.missing_skills?.length || 0;
  const totalDirectRequirements = matchedCount + missingCount;
  const totalSkillsEncountered = matchedCount + transferableCount + missingCount;

  // Filtered evidence list
  const skillEvidence = data?.skill_evidence;
  const filteredEvidence = useMemo(() => {
    if (!skillEvidence) return [];
    return skillEvidence.filter((item: SkillEvidenceItem) => {
      // Type filter
      if (evidenceFilter !== "all" && item.type !== evidenceFilter) {
        return false;
      }
      // Search filter
      if (evidenceSearch.trim()) {
        const query = evidenceSearch.toLowerCase();
        const matchesReq = item.requirement.toLowerCase().includes(query);
        const matchesClaim = item.claim.toLowerCase().includes(query);
        const matchesSource = item.sourceText ? item.sourceText.toLowerCase().includes(query) : false;
        return matchesReq || matchesClaim || matchesSource;
      }
      return true;
    });
  }, [skillEvidence, evidenceFilter, evidenceSearch]);

  // Strengths and Weaknesses derived directly from backend response data
  const { strengths, weaknesses } = useMemo(() => {
    const str: { title: string; detail: string; badge?: string }[] = [];
    const weak: { title: string; detail: string; badge?: string }[] = [];

    if (!data) return { strengths: str, weaknesses: weak };

    // 1. Direct matched skills
    if (matchedCount > 0) {
      str.push({
        title: `${matchedCount} Direct Skill Match${matchedCount > 1 ? "es" : ""}`,
        detail: `Direct evidence matching role requirements: ${data.matched_skills.slice(0, 4).join(", ")}${matchedCount > 4 ? ` (+${matchedCount - 4} more)` : ""}.`,
        badge: "Direct Evidence",
      });
    }

    // 2. Transferable skills
    if (transferableCount > 0) {
      str.push({
        title: `${transferableCount} Transferable Competenc${transferableCount > 1 ? "ies" : "y"}`,
        detail: `Adjacent capabilities identified via ESCO taxonomy: ${data.transferable_skills.slice(0, 3).join(", ")}${transferableCount > 3 ? ` (+${transferableCount - 3} more)` : ""}.`,
        badge: "Transferable",
      });
    }

    // 3. Experience alignment
    if (data.experience) {
      const expScore = data.experience.alignment_score ?? 0;
      const cYears = data.experience.candidate_years ?? 0;
      const rYears = data.experience.required_years ?? 0;

      if (expScore >= 80 || (rYears > 0 && cYears >= rYears)) {
        str.push({
          title: "Strong Experience Alignment",
          detail: `Verified tenure of ${cYears} years meets or exceeds the required ${rYears} years (${Math.round(expScore)}% alignment).`,
          badge: "Experience Met",
        });
      } else if (rYears > 0 && cYears < rYears) {
        const gap = (rYears - cYears).toFixed(1);
        weak.push({
          title: "Experience Tenure Deficit",
          detail: `Documented tenure (${cYears} yrs) is below the requested ${rYears} years (${gap} yr delta).`,
          badge: "Tenure Gap",
        });
      }
    }

    // 4. Education alignment
    if (data.education) {
      const eduScore = data.education.alignment_score ?? 0;
      if (eduScore >= 80) {
        str.push({
          title: "Education Requirement Fulfilled",
          detail: `Documented credential (${data.education.candidate_degree || "Degree"}) satisfies the required ${data.education.required_education || "standard"} (${Math.round(eduScore)}% alignment).`,
          badge: "Education Met",
        });
      } else if (eduScore < 80) {
        weak.push({
          title: "Education Requirement Mismatch",
          detail: `Documented credential (${data.education.candidate_degree || "Unspecified"}) does not fully align with requested ${data.education.required_education || "level"}.`,
          badge: "Education Gap",
        });
      }
    }

    // 5. Missing skills
    if (missingCount > 0) {
      const missingRequired = data.missing_skills.filter(
        (s) => skillRequirementMap.get(s.toLowerCase())?.required === true
      );
      const missingPreferred = data.missing_skills.filter(
        (s) => skillRequirementMap.get(s.toLowerCase())?.required === false
      );

      if (missingRequired.length > 0) {
        weak.push({
          title: `${missingRequired.length} Required Skill Gap${missingRequired.length > 1 ? "s" : ""} (Not Detected)`,
          detail: `Mandatory role requirements not detected in candidate evidence: ${missingRequired.slice(0, 4).join(", ")}${missingRequired.length > 4 ? ` (+${missingRequired.length - 4} more)` : ""}.`,
          badge: "Mandatory Gap",
        });
      }

      if (missingPreferred.length > 0) {
        weak.push({
          title: `${missingPreferred.length} Preferred Skill${missingPreferred.length > 1 ? "s" : ""} (Growth Area)`,
          detail: `Optional nice-to-have capabilities not detected: ${missingPreferred.slice(0, 4).join(", ")}${missingPreferred.length > 4 ? ` (+${missingPreferred.length - 4} more)` : ""}. These are non-mandatory enhancement opportunities.`,
          badge: "Preferred Area",
        });
      }

      if (missingRequired.length === 0 && missingPreferred.length === 0) {
        weak.push({
          title: `${missingCount} Skill Gap${missingCount > 1 ? "s" : ""} (Not Detected)`,
          detail: `Requisition skills not detected in candidate evidence: ${data.missing_skills.slice(0, 4).join(", ")}${missingCount > 4 ? ` (+${missingCount - 4} more)` : ""}.`,
          badge: "Skill Gap",
        });
      }
    }

    // 6. Actionable recommendations from backend
    if (data.recommendations && data.recommendations.length > 0) {
      weak.push({
        title: "Actionable Resume Enhancements",
        detail: `Review ${data.recommendations.length} targeted recommendation${data.recommendations.length > 1 ? "s" : ""} to emphasize missing keywords or relevant coursework.`,
        badge: "Growth Action",
      });
    }

    return { strengths: str, weaknesses: weak };
  }, [data, matchedCount, transferableCount, missingCount, skillRequirementMap]);

  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-5xl mx-auto font-sans pb-16 px-4 sm:px-6">
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/dashboard/applications"
              className={`font-semibold inline-flex items-center gap-1 transition ${
                isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>←</span>
              <span>My Applications</span>
            </Link>
            <span className={isDark ? "text-slate-600" : "text-slate-300"}>/</span>
            <span className={`font-semibold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
              Match Results
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Offline dev fixture preview toggle for demonstration/testing */}
            {process.env.NODE_ENV !== "production" && (
              <button
                type="button"
                onClick={() => setUseDevFixture(!useDevFixture)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition ${
                  useDevFixture
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : isDark
                    ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Toggle offline fixture for visual testing"
              >
                {useDevFixture ? "Demo Fixture Active" : "Simulate Endpoint"}
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
              }`}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div
            className={`p-16 text-center rounded-2xl border space-y-4 animate-pulse ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto" />
            <h3 className="text-base font-semibold">Retrieving Application Match Analysis...</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Fetching deterministic skill alignment and evidence evaluation from Resume AI Analyzer.
            </p>
          </div>
        )}

        {/* ERROR & UNAUTHORIZED / NOT FOUND STATES */}
        {!loading && errorStatus && (
          <div
            className={`p-8 sm:p-12 text-center rounded-2xl border space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                errorStatus === 404
                  ? isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200"
                  : isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-200"
              }`}
            >
              <IconAlertTriangle size={28} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">
                {errorStatus === 404
                  ? "Application Not Found"
                  : errorStatus === 403 || errorStatus === 401
                  ? "Access Restricted"
                  : "Unable to Load Match Results"}
              </h2>
              <p className={`text-xs max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard/applications"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Back to My Applications
              </Link>
              <button
                type="button"
                onClick={handleRefresh}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                  isDark ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Retry Request
              </button>
            </div>
          </div>
        )}

        {/* NO EVALUATION / PENDING / FAILED STATE */}
        {!loading && !errorStatus && !isCompleted && (
          <div
            className={`p-10 sm:p-12 text-center rounded-2xl border space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              isFailed
                ? isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-200"
                : isPending
                ? isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {isFailed ? <IconAlertTriangle size={28} /> : <IconTarget size={28} />}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">
                {isFailed
                  ? "Application Evaluation Failed"
                  : isPending
                  ? "Application Evaluation in Progress"
                  : "No Evaluation Results Available Yet"}
              </h2>
              <p className={`text-xs max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {isFailed
                  ? "The evaluation run encountered an issue or could not be completed. You can re-check the status or contact support if the issue persists."
                  : isPending
                  ? "Your resume is currently being evaluated against this job requisition. Results will be available shortly."
                  : "An automated evaluation has not been processed for this application. Please check back later or contact the hiring team."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
              >
                {isFailed ? "Retry Evaluation Check" : "Check Evaluation Status"}
              </button>
              <Link
                href="/dashboard/applications"
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                  isDark ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Back to Applications
              </Link>
            </div>
          </div>
        )}

        {/* SUCCESSFUL EVALUATION DASHBOARD */}
        {!loading && !errorStatus && isCompleted && data && (
          <>
            {/* Header Job Summary Banner */}
            <div
              className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
                isDark
                  ? "bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
                  : "bg-white border-slate-200 text-slate-900 shadow-sm"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  {/* Status & Timestamp Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                        data.application_status === "shortlisted"
                          ? isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200"
                          : data.application_status === "interviewing"
                          ? isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"
                          : data.application_status === "hired"
                          ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : data.application_status === "rejected"
                          ? isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200"
                          : isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {getApplicationStatusLabel(data.application_status)}
                    </span>

                    {/* Match Tier Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${scoreTier.badgeBg} ${scoreTier.badgeBorder} ${scoreTier.badgeText}`}
                    >
                      <span>✦</span>
                      <span>{scoreTier.label}</span>
                    </span>

                    {data.evaluated_at && (
                      <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        • Evaluated on {new Date(data.evaluated_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Job Title & Requisition */}
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                      {data.job_title}
                    </h1>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {scoreTier.description}
                    </p>
                  </div>

                  {/* Company & ID Info */}
                  <div className={`flex flex-wrap items-center gap-4 text-xs pt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {data.company_name && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <IconBuilding size={15} className="text-emerald-500 shrink-0" />
                        <span>{data.company_name}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <IconBriefcase size={15} className="shrink-0 text-slate-400" />
                      <span>App ID: {data.application_id.slice(0, 8)}...</span>
                    </span>
                  </div>
                </div>

                {/* Score Gauge & Tier Summary */}
                <div className="flex flex-col items-center sm:items-end justify-center shrink-0 self-center lg:self-auto pt-2 lg:pt-0">
                  <div className="flex items-center gap-4">
                    <MatchScoreGauge score={data.overall_match_score} size={136} strokeWidth={9} />
                  </div>
                  <div className="text-center sm:text-right mt-1">
                    <span className={`text-xs font-semibold block ${scoreTier.badgeText}`}>
                      {scoreTier.label} ({Math.round(data.overall_match_score ?? 0)}%)
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Deterministic AI match index
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Metrics Strip */}
              <div
                className={`mt-6 pt-5 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                  isDark ? "border-slate-800" : "border-slate-100"
                }`}
              >
                {/* Metric 1: Skill Coverage */}
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200/80"}`}>
                  <span className="text-slate-400 text-[11px] block font-medium">Skill Coverage</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-emerald-500">{matchedCount}</span>
                    <span className="text-slate-400 text-xs">/ {totalDirectRequirements > 0 ? totalDirectRequirements : totalSkillsEncountered} req</span>
                  </div>
                </div>

                {/* Metric 2: Transferable Skills */}
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200/80"}`}>
                  <span className="text-slate-400 text-[11px] block font-medium">Transferable Skills</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-teal-400">{transferableCount}</span>
                    <span className="text-slate-400 text-xs">detected</span>
                  </div>
                </div>

                {/* Metric 3: Experience Alignment */}
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200/80"}`}>
                  <span className="text-slate-400 text-[11px] block font-medium">Experience Fit</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-base font-bold font-mono ${
                      (data.experience?.alignment_score ?? 0) >= 80 ? "text-emerald-500" : "text-amber-500"
                    }`}>
                      {data.experience?.alignment_score != null ? `${Math.round(data.experience.alignment_score)}%` : "N/A"}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {data.experience?.candidate_years != null ? `(${data.experience.candidate_years}y)` : ""}
                    </span>
                  </div>
                </div>

                {/* Metric 4: Missing Skills Gap */}
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200/80"}`}>
                  <span className="text-slate-400 text-[11px] block font-medium">Skill Gaps</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-base font-bold font-mono ${missingCount === 0 ? "text-emerald-500" : "text-amber-500"}`}>
                      {missingCount}
                    </span>
                    <span className="text-slate-400 text-xs">{missingCount === 0 ? "All met" : "to address"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STRENGTHS AND WEAKNESSES ANALYSIS (KEY FEATURE) */}
            <div
              className={`p-6 sm:p-7 rounded-2xl border space-y-5 ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                    <IconTrendUp size={16} />
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-bold">
                    Match Analysis: Key Strengths &amp; Focus Areas
                  </h2>
                </div>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Objective breakdown of how your verified qualifications align with this role, highlighting competitive advantages and areas for enhancement.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Strengths */}
                <div
                  className={`p-5 rounded-xl border space-y-3 ${
                    isDark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <IconCheckCircle size={15} />
                      Key Match Strengths ({strengths.length})
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Competitive Advantage
                    </span>
                  </div>

                  {strengths.length > 0 ? (
                    <ul className="space-y-3 pt-1">
                      {strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${
                                  isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                              {item.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-xs italic ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      No primary strengths detected from current candidate evidence.
                    </p>
                  )}
                </div>

                {/* Column 2: Weaknesses / Gaps */}
                <div
                  className={`p-5 rounded-xl border space-y-3 ${
                    isDark ? "bg-amber-950/20 border-amber-500/20" : "bg-amber-50/50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs tracking-wider uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <IconAlertTriangle size={15} />
                      Focus Areas &amp; Gaps ({weaknesses.length})
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Improvement Target
                    </span>
                  </div>

                  {weaknesses.length > 0 ? (
                    <ul className="space-y-3 pt-1">
                      {weaknesses.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="text-amber-500 font-bold shrink-0 mt-0.5">!</span>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${
                                  isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-100 text-amber-900 border-amber-200"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                              {item.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 space-y-1">
                      <span className="font-semibold block">Outstanding Alignment!</span>
                      <p className="text-[11px]">No critical skill gaps or qualification mismatches identified for this requisition.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SKILLS ALIGNMENT BREAKDOWN & DISTRIBUTION */}
            <div className="space-y-4">
              {/* Distribution Overview Bar */}
              {totalSkillsEncountered > 0 && (
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-2xs"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-semibold block">Overall Skill Requirement Distribution</span>
                    <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {matchedCount} directly matched • {transferableCount} transferable • {missingCount} missing from {totalSkillsEncountered} skills evaluated
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Visual Progress Bar */}
                    <div className="w-48 sm:w-60 h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex shrink-0">
                      {matchedCount > 0 && (
                        <div
                          style={{ width: `${(matchedCount / totalSkillsEncountered) * 100}%` }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`${matchedCount} Matched Skills`}
                        />
                      )}
                      {transferableCount > 0 && (
                        <div
                          style={{ width: `${(transferableCount / totalSkillsEncountered) * 100}%` }}
                          className="bg-teal-400 h-full transition-all"
                          title={`${transferableCount} Transferable Skills`}
                        />
                      )}
                      {missingCount > 0 && (
                        <div
                          style={{ width: `${(missingCount / totalSkillsEncountered) * 100}%` }}
                          className="bg-amber-500 h-full transition-all"
                          title={`${missingCount} Missing Skills`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3-COLUMN SKILLS ALIGNMENT GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Matched Skills Card */}
                <div
                  className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between transition ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <h3 className="font-semibold text-sm">Matched Skills</h3>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isDark ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-emerald-700"
                        }`}
                      >
                        {matchedCount}
                      </span>
                    </div>

                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Direct evidence verified in your profile and credentials that satisfies the requisition.
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.matched_skills.length > 0 ? (
                        data.matched_skills.map((skill) => {
                          const reqStatus = skillRequirementMap.get(skill.toLowerCase())?.required;
                          return (
                            <span
                              key={skill}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                                isDark
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              <span className="font-bold text-[10px]">✓</span> {skill}
                              {reqStatus === true && (
                                <span className={`text-[10px] font-semibold px-1 py-0.2 rounded border ${
                                  isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                }`}>
                                  Required
                                </span>
                              )}
                              {reqStatus === false && (
                                <span className={`text-[10px] font-medium px-1 py-0.2 rounded border ${
                                  isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>
                                  Preferred
                                </span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className={`text-xs italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          No direct skill matches detected.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`pt-3 border-t text-[11px] font-medium flex items-center justify-between ${
                    isDark ? "border-slate-800/80 text-emerald-400/80" : "border-slate-100 text-emerald-700/80"
                  }`}>
                    <span>Verified Qualification</span>
                    <span className="font-mono text-[10px]">100% Alignment</span>
                  </div>
                </div>

                {/* Transferable Skills Card */}
                <div
                  className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between transition ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm">
                          ⇄
                        </div>
                        <h3 className="font-semibold text-sm">Transferable Skills</h3>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isDark ? "bg-slate-800 text-teal-400" : "bg-slate-100 text-teal-700"
                        }`}
                      >
                        {transferableCount}
                      </span>
                    </div>

                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Adjacent skills recognized through the ESCO canonical skill taxonomy.
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.transferable_skills.length > 0 ? (
                        data.transferable_skills.map((skill) => (
                          <span
                            key={skill}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                              isDark
                                ? "bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20"
                                : "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                            }`}
                          >
                            <span className="text-[10px]">⇄</span> {skill}
                          </span>
                        ))
                      ) : (
                        <span className={`text-xs italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          No transferable skills mapped for this role.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`pt-3 border-t text-[11px] font-medium flex items-center justify-between ${
                    isDark ? "border-slate-800/80 text-teal-400/80" : "border-slate-100 text-teal-700/80"
                  }`}>
                    <span>Adaptive Competency</span>
                    <span className="font-mono text-[10px]">Taxonomy Mapped</span>
                  </div>
                </div>

                {/* Missing / Unmentioned Skills Card */}
                <div
                  className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between transition ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                          ✕
                        </div>
                        <h3 className="font-semibold text-sm">Skills Not Detected</h3>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isDark ? "bg-slate-800 text-amber-400" : "bg-slate-100 text-amber-700"
                        }`}
                      >
                        {missingCount}
                      </span>
                    </div>

                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Qualifications from the job posting not detected in candidate evidence.
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.missing_skills.length > 0 ? (
                        data.missing_skills.map((skill) => {
                          const reqStatus = skillRequirementMap.get(skill.toLowerCase())?.required;
                          const isReq = reqStatus === true;
                          const isPref = reqStatus === false;

                          return (
                            <span
                              key={skill}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                                isPref
                                  ? isDark
                                    ? "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                  : isDark
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              }`}
                            >
                              <span className="font-bold text-[10px]">{isPref ? "○" : "✕"}</span>
                              <span>{skill}</span>
                              {isReq && (
                                <span className={`text-[10px] font-semibold px-1 py-0.2 rounded border ${
                                  isDark ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-amber-100 text-amber-900 border-amber-300"
                                }`}>
                                  Required
                                </span>
                              )}
                              {isPref && (
                                <span className={`text-[10px] font-medium px-1 py-0.2 rounded border ${
                                  isDark ? "bg-slate-700 text-slate-300 border-slate-600" : "bg-slate-200 text-slate-600 border-slate-300"
                                }`}>
                                  Preferred
                                </span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <div className="text-xs p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 space-y-0.5">
                          <span className="font-semibold block">Full Match!</span>
                          <p className="text-[11px]">All evaluated job competencies were successfully identified in your profile.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`pt-3 border-t text-[11px] font-medium flex items-center justify-between ${
                    isDark ? "border-slate-800/80 text-amber-400/80" : "border-slate-100 text-amber-800/80"
                  }`}>
                    <span>Target for Profile Optimization</span>
                    <span className="font-mono text-[10px]">High Impact</span>
                  </div>
                </div>
              </div>
            </div>

            {/* EXPERIENCE & EDUCATION ALIGNMENT ROW */}
            {(data.experience || data.education) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Experience Alignment */}
                {data.experience && (
                  <div
                    className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <IconBriefcase size={16} className="text-emerald-500" />
                          Experience Tenure Alignment
                        </h3>
                        {typeof data.experience.alignment_score === "number" && (
                          <span
                            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                              data.experience.alignment_score >= 80
                                ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {Math.round(data.experience.alignment_score)}% Alignment
                          </span>
                        )}
                      </div>

                      {/* Side by side metric comparison */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                          <span className="text-slate-400 block text-[11px] font-medium">Your Verified Tenure</span>
                          <span className="font-bold text-base font-mono mt-0.5 block text-slate-900 dark:text-slate-100">
                            {data.experience.candidate_years !== undefined && data.experience.candidate_years !== null
                              ? `${data.experience.candidate_years} Years`
                              : "Not specified"}
                          </span>
                        </div>
                        <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                          <span className="text-slate-400 block text-[11px] font-medium">Required Tenure</span>
                          <span className="font-bold text-base font-mono mt-0.5 block text-slate-900 dark:text-slate-100">
                            {data.experience.required_years !== undefined && data.experience.required_years !== null
                              ? `${data.experience.required_years} Years`
                              : "Any"}
                          </span>
                        </div>
                      </div>

                      {/* Alignment Status Delta Pill */}
                      {typeof data.experience.tenure_delta_years === "number" && (
                        <div className="text-xs flex items-center gap-1.5 pt-0.5">
                          <span className="text-slate-400 text-[11px]">Tenure Differential:</span>
                          <span className={`font-mono font-semibold px-2 py-0.2 rounded text-[11px] ${
                            data.experience.tenure_delta_years >= 0
                              ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                              : isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-800"
                          }`}>
                            {data.experience.tenure_delta_years >= 0 ? `+${data.experience.tenure_delta_years}` : data.experience.tenure_delta_years} Years
                          </span>
                        </div>
                      )}

                      {data.experience.evidence && (
                        <div
                          className={`p-3 rounded-xl border text-xs italic ${
                            isDark ? "bg-slate-950/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          &ldquo;{data.experience.evidence}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Education Alignment */}
                {data.education && (
                  <div
                    className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <IconCheckCircle size={16} className="text-emerald-500" />
                          Education Degree Alignment
                        </h3>
                        {typeof data.education.alignment_score === "number" && (
                          <span
                            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                              data.education.alignment_score >= 80
                                ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {Math.round(data.education.alignment_score)}% Alignment
                          </span>
                        )}
                      </div>

                      {/* Side by side metric comparison */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                          <span className="text-slate-400 block text-[11px] font-medium">Your Documented Degree</span>
                          <span className="font-bold text-sm mt-0.5 block capitalize text-slate-900 dark:text-slate-100">
                            {data.education.candidate_degree || "Not specified"}
                          </span>
                        </div>
                        <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                          <span className="text-slate-400 block text-[11px] font-medium">Requisition Requirement</span>
                          <span className="font-bold text-sm mt-0.5 block capitalize text-slate-900 dark:text-slate-100">
                            {data.education.required_education || "Any"}
                          </span>
                        </div>
                      </div>

                      {data.education.evidence && (
                        <div
                          className={`p-3 rounded-xl border text-xs italic ${
                            isDark ? "bg-slate-950/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          &ldquo;{data.education.evidence}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RECOMMENDATIONS & IMPROVEMENT SUGGESTIONS */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div
                className={`p-6 sm:p-7 rounded-2xl border space-y-4 ${
                  isDark
                    ? "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800"
                    : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                      ★
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">
                        Evidence-Backed Profile Recommendations
                      </h3>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        Targeted suggestions derived from missing competencies to elevate your match index:
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    isDark ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-emerald-700"
                  }`}>
                    {data.recommendations.length} Action{data.recommendations.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  {data.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`text-xs p-3.5 rounded-xl border flex items-start gap-3 transition ${
                        isDark ? "bg-slate-950/70 border-slate-800/90 text-slate-300 hover:border-slate-700" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <span className="font-medium leading-relaxed block">{rec}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VERBATIM DOCUMENT EVIDENCE ANCHORING WITH INTERACTIVE SEARCH & FILTER */}
            {data.skill_evidence && data.skill_evidence.length > 0 && (
              <div
                className={`p-6 sm:p-7 rounded-2xl border space-y-5 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">Verbatim Evidence Anchoring</h3>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Inspect source snippets and AI reasoning for each requirement
                    </p>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search evidence..."
                        value={evidenceSearch}
                        onChange={(e) => setEvidenceSearch(e.target.value)}
                        className={`text-xs px-3 py-1.5 pl-8 rounded-xl border transition w-40 sm:w-48 outline-none ${
                          isDark
                            ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-emerald-500"
                            : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500"
                        }`}
                      />
                      <IconSearch size={14} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
                      {evidenceSearch && (
                        <button
                          type="button"
                          onClick={() => setEvidenceSearch("")}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                          aria-label="Clear search"
                        >
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("all")}
                    className={`px-3 py-1 rounded-lg border font-medium transition ${
                      evidenceFilter === "all"
                        ? isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : isDark ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Evidence ({data.skill_evidence.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("matched")}
                    className={`px-3 py-1 rounded-lg border font-medium transition ${
                      evidenceFilter === "matched"
                        ? isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : isDark ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Direct Matches ({data.skill_evidence.filter((i: SkillEvidenceItem) => i.type === "matched").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("transferable")}
                    className={`px-3 py-1 rounded-lg border font-medium transition ${
                      evidenceFilter === "transferable"
                        ? isDark ? "bg-teal-500/20 text-teal-300 border-teal-500/30" : "bg-teal-50 text-teal-800 border-teal-300"
                        : isDark ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Transferable ({data.skill_evidence.filter((i: SkillEvidenceItem) => i.type === "transferable").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvidenceFilter("not_detected")}
                    className={`px-3 py-1 rounded-lg border font-medium transition ${
                      evidenceFilter === "not_detected"
                        ? isDark ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-800 border-amber-300"
                        : isDark ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Not Detected ({data.skill_evidence.filter((i: SkillEvidenceItem) => i.type === "not_detected").length})
                  </button>
                </div>

                {/* Evidence Items List */}
                <div className="space-y-3 pt-2">
                  {filteredEvidence.length > 0 ? (
                    filteredEvidence.map((ev: SkillEvidenceItem, idx: number) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-2 transition ${
                          isDark ? "bg-slate-950/50 border-slate-800/80 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {ev.requirement}
                            </span>
                            {ev.required !== null && ev.required !== undefined && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  ev.required
                                    ? isDark
                                      ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                    : isDark
                                    ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {ev.required ? "Required" : "Preferred"}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                              ev.type === "matched"
                                ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : ev.type === "transferable"
                                ? isDark ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-200"
                                : isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {ev.type === "matched" ? "Direct Match" : ev.type === "transferable" ? "Transferable" : ev.type?.replace("_", " ")}
                          </span>
                        </div>

                        <p className={isDark ? "text-slate-300" : "text-slate-700"}>{ev.claim}</p>

                        {/* Truthful Source Section & Character Range Attribution */}
                        {(ev.source_section || (ev.character_start != null && ev.character_end != null)) && (
                          <div className={`flex flex-wrap items-center gap-2 text-[11px] font-mono pt-0.5 ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}>
                            {ev.source_section && (
                              <span className="flex items-center gap-1">
                                <span className="font-sans text-[10px] uppercase font-semibold text-slate-500">Source:</span>
                                <span className="capitalize font-medium">
                                  {ev.source_section === "unknown" ? "Unknown / Unspecified" : ev.source_section.replace(/_/g, " ")}
                                </span>
                              </span>
                            )}
                            {ev.character_start != null && ev.character_end != null && (
                              <span className="text-[10px] text-slate-400">
                                (span {ev.character_start}–{ev.character_end})
                              </span>
                            )}
                          </div>
                        )}

                        {ev.sourceText && (
                          <div
                            className={`p-2.5 rounded-lg border text-[11px] font-mono leading-relaxed mt-2 ${
                              isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <span className="text-slate-400 block text-[10px] font-sans not-italic mb-1 font-semibold uppercase tracking-wider">
                              Verbatim Source Excerpt:
                            </span>
                            &ldquo;{ev.sourceText}&rdquo;
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div
                      className={`p-8 text-center rounded-xl border ${
                        isDark ? "bg-slate-950/30 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <p className="text-xs">No evidence items match your active filter and search query.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEvidenceFilter("all");
                          setEvidenceSearch("");
                        }}
                        className="mt-2 text-xs text-emerald-500 font-semibold hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
