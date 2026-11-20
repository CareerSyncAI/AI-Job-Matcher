"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MatchScoreGauge } from "@/components/MatchScoreGauge";
import {
  IconBriefcase,
  IconBuilding,
  IconCheckCircle,
  IconAlertTriangle,
  IconTarget,
} from "@/components/Icons";
import {
  CandidateMatchResults,
  ISOLATED_TEST_MATCH_RESULTS_FIXTURE,
} from "@/lib/types/matchResults";

export default function CandidateMatchResultsPage() {
  const params = useParams();
  const { isDark } = useTheme();

  const applicationId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CandidateMatchResults | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useDevFixture, setUseDevFixture] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

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
        const res = await api.get(`/applications/${applicationId}/match-results`);
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
          setErrorMessage(detail || "The requested job application was not found or does not belong to your account.");
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
  }, [applicationId, useDevFixture, refreshKey]);

  // Derived state
  const isCompleted = data?.evaluation_status === "completed" && typeof data?.overall_match_score === "number";
  const isPending = data?.evaluation_status === "pending" || data?.evaluation_status === "queued" || data?.evaluation_status === "running";

  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto font-sans pb-12">
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/dashboard/applications"
              className={`font-semibold transition ${
                isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ← My Applications
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
                className={`text-[11px] font-semibold px-3 py-1 rounded-lg border transition ${
                  useDevFixture
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : isDark
                    ? "bg-slate-800 text-slate-400 border-slate-700"
                    : "bg-slate-100 text-slate-600 border-slate-200"
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
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
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
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto" />
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
                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition"
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

        {/* NO EVALUATION / PENDING STATE */}
        {!loading && !errorStatus && !isCompleted && (
          <div
            className={`p-10 sm:p-12 text-center rounded-2xl border space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
            }`}>
              <IconTarget size={28} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">
                {isPending ? "Application Evaluation in Progress" : "No Evaluation Results Available Yet"}
              </h2>
              <p className={`text-xs max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {isPending
                  ? "Your resume is currently being evaluated against this job requisition. Results will be available shortly."
                  : "An automated evaluation has not been processed for this application. Please check back later or contact the hiring team."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition"
              >
                Check Evaluation Status
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                      data.application_status === "shortlisted"
                        ? isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200"
                        : isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {data.application_status?.replace("_", " ") || "Application Submitted"}
                    </span>
                    {data.evaluated_at && (
                      <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        • Evaluated {new Date(data.evaluated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    {data.job_title}
                  </h1>

                  <div className={`flex flex-wrap items-center gap-4 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {data.company_name && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <IconBuilding size={15} className="text-emerald-500" />
                        {data.company_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <IconBriefcase size={15} />
                      Application ID: <span className="font-mono text-[11px]">{data.application_id.slice(0, 8)}...</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 self-start md:self-auto pt-2 md:pt-0">
                  <MatchScoreGauge score={data.overall_match_score} size={130} strokeWidth={9} />
                </div>
              </div>

              {/* Explanatory Note */}
              <div
                className={`mt-6 pt-4 border-t text-xs flex items-center justify-between gap-4 ${
                  isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                }`}
              >
                <span>
                  Deterministic match score calculated by <strong>Resume AI Analyzer and Job Matcher</strong> based on verified competencies and verifiable qualifications.
                </span>
                <span className="font-medium shrink-0">Objective Decision Support</span>
              </div>
            </div>

            {/* 3-COLUMN SKILLS ALIGNMENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Matched Skills */}
              <div
                className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
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
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isDark ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-emerald-700"
                    }`}>
                      {data.matched_skills.length}
                    </span>
                  </div>

                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Competencies from your resume that directly satisfied the requisition.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {data.matched_skills.length > 0 ? (
                      data.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${
                            isDark
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          <span className="font-bold text-[10px]">✓</span> {skill}
                        </span>
                      ))
                    ) : (
                      <span className={`text-xs italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        No direct skill matches detected in resume.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Transferable Skills */}
              <div
                className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
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
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isDark ? "bg-slate-800 text-teal-400" : "bg-slate-100 text-teal-700"
                    }`}>
                      {data.transferable_skills.length}
                    </span>
                  </div>

                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Adjacent skills recognized through the ESCO canonical taxonomy.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {data.transferable_skills.length > 0 ? (
                      data.transferable_skills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${
                            isDark
                              ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                              : "bg-teal-50 text-teal-700 border-teal-200"
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
              </div>

              {/* Missing / Unmentioned Skills */}
              <div
                className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                        ✕
                      </div>
                      <h3 className="font-semibold text-sm">Missing Skills</h3>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isDark ? "bg-slate-800 text-amber-400" : "bg-slate-100 text-amber-700"
                    }`}>
                      {data.missing_skills.length}
                    </span>
                  </div>

                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Required qualifications not detected in your uploaded documents.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {data.missing_skills.length > 0 ? (
                      data.missing_skills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${
                            isDark
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          <span className="font-bold text-[10px]">✕</span> {skill}
                        </span>
                      ))
                    ) : (
                      <span className={`text-xs italic ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                        All required job skills were successfully identified!
                      </span>
                    )}
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
                    className={`p-6 rounded-2xl border space-y-4 ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <IconBriefcase size={16} className="text-emerald-500" />
                        Experience Tenure Alignment
                      </h3>
                      {typeof data.experience.alignment_score === "number" && (
                        <span className={`text-xs font-mono font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                          {Math.round(data.experience.alignment_score)}% Alignment
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <span className="text-slate-400 block text-[11px]">Your Verified Tenure</span>
                        <span className="font-bold text-sm font-mono mt-0.5 block">
                          {data.experience.candidate_years !== undefined && data.experience.candidate_years !== null
                            ? `${data.experience.candidate_years} Years`
                            : "Not specified"}
                        </span>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <span className="text-slate-400 block text-[11px]">Required Tenure</span>
                        <span className="font-bold text-sm font-mono mt-0.5 block">
                          {data.experience.required_years !== undefined && data.experience.required_years !== null
                            ? `${data.experience.required_years} Years`
                            : "Any"}
                        </span>
                      </div>
                    </div>

                    {data.experience.evidence && (
                      <p className={`text-xs italic pt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        &ldquo;{data.experience.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Education Alignment */}
                {data.education && (
                  <div
                    className={`p-6 rounded-2xl border space-y-4 ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <IconCheckCircle size={16} className="text-emerald-500" />
                        Education Degree Alignment
                      </h3>
                      {typeof data.education.alignment_score === "number" && (
                        <span className={`text-xs font-mono font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                          {Math.round(data.education.alignment_score)}% Alignment
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <span className="text-slate-400 block text-[11px]">Your Documented Degree</span>
                        <span className="font-bold text-sm mt-0.5 block capitalize">
                          {data.education.candidate_degree || "Not specified"}
                        </span>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                        <span className="text-slate-400 block text-[11px]">Requisition Requirement</span>
                        <span className="font-bold text-sm mt-0.5 block capitalize">
                          {data.education.required_education || "Any"}
                        </span>
                      </div>
                    </div>

                    {data.education.evidence && (
                      <p className={`text-xs italic pt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        &ldquo;{data.education.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RECOMMENDATIONS & IMPROVEMENT SUGGESTIONS */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div
                className={`p-6 rounded-2xl border space-y-3 ${
                  isDark
                    ? "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800"
                    : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                    ★
                  </div>
                  <h3 className="font-semibold text-sm">Evidence-Backed Profile Recommendations</h3>
                </div>

                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Actionable suggestions to improve your resume qualification alignment for this specific requisition:
                </p>

                <ul className="space-y-2 pt-1">
                  {data.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className={`text-xs p-3 rounded-xl border flex items-start gap-2.5 ${
                        isDark ? "bg-slate-950/70 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* VERBATIM DOCUMENT EVIDENCE ANCHORING */}
            {data.skill_evidence && data.skill_evidence.length > 0 && (
              <div
                className={`p-6 rounded-2xl border space-y-4 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Verbatim Resume Evidence Anchoring</h3>
                  <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    AI-assisted evaluation with supporting resume evidence
                  </span>
                </div>

                <div className="space-y-2.5">
                  {data.skill_evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{ev.requirement}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize ${
                          ev.type === "matched"
                            ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ev.type === "transferable"
                            ? isDark ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-200"
                            : isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {ev.type?.replace("_", " ")}
                        </span>
                      </div>
                      <p className={isDark ? "text-slate-300" : "text-slate-700"}>{ev.claim}</p>
                      {ev.sourceText && (
                        <p className={`font-mono text-[11px] p-2 rounded-lg border mt-1.5 ${
                          isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                        }`}>
                          &ldquo;{ev.sourceText}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
