"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  IconSearch,
  IconTarget,
  IconBuilding,
  IconBriefcase,
  IconMapPin,
  IconCheckCircle,
  IconAlertTriangle,
} from "@/components/Icons";

interface JobSkill {
  id: string;
  name: string;
  required: boolean;
  min_years?: number;
}

interface JobItem {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employment_type?: string;
  work_arrangement?: string;
  description: string;
  skills: JobSkill[];
  matchScore?: number;
  salary?: string;
}

export default function JobsPage() {
  const { isDark } = useTheme();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArrangement, setSelectedArrangement] = useState("all");
  const [sortBy, setSortBy] = useState<"match" | "recent">("recent");
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string; showResumeLink?: boolean } | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  // Fetch live jobs from FastAPI backend and existing applications
  useEffect(() => {
    let isMounted = true;
    const fetchJobsAndApplications = async () => {
      setLoading(true);
      try {
        const [jobsRes, appsRes] = await Promise.allSettled([
          api.get("/jobs/public/open"),
          api.get("/applications/me"),
        ]);

        if (isMounted) {
          if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
            setJobs(jobsRes.value.data);
          } else {
            setJobs([]);
          }

          if (appsRes.status === "fulfilled" && Array.isArray(appsRes.value.data)) {
            const appliedMap: Record<string, boolean> = {};
            for (const app of appsRes.value.data) {
              if (app.job_id) {
                appliedMap[app.job_id] = true;
              }
            }
            setAppliedJobs(appliedMap);
          }
        }
      } catch (err) {
        console.warn("Error fetching jobs or applications:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchJobsAndApplications();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick Filter Chips
  const filterChips = [
    { label: "All Roles", value: "all" },
    { label: "Frontend", value: "frontend" },
    { label: "AI & ML", value: "ai" },
    { label: "DevOps", value: "devops" },
    { label: "Remote Only", value: "remote" },
  ];

  // Dynamic Filtering & Sorting
  const filteredJobs = useMemo(() => {
    const result = jobs.filter((job) => {
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.department?.toLowerCase().includes(query) ||
        (job.skills || []).some((s) => s?.name?.toLowerCase().includes(query)) ||
        job.description.toLowerCase().includes(query);

      const matchArrangement =
        selectedArrangement === "all" ||
        job.work_arrangement?.toLowerCase() === selectedArrangement.toLowerCase();

      const matchCategory =
        selectedCategory === "all" ||
        (selectedCategory === "frontend" && (job.title.toLowerCase().includes("frontend") || (job.skills || []).some(s => s?.name?.toLowerCase().includes("react")))) ||
        (selectedCategory === "ai" && (job.title.toLowerCase().includes("ai") || (job.skills || []).some(s => s?.name?.toLowerCase().includes("python") || s?.name?.toLowerCase().includes("pytorch")))) ||
        (selectedCategory === "devops" && (job.title.toLowerCase().includes("devops") || (job.skills || []).some(s => s?.name?.toLowerCase().includes("kubernetes") || s?.name?.toLowerCase().includes("docker")))) ||
        (selectedCategory === "remote" && job.work_arrangement?.toLowerCase().includes("remote"));

      return matchSearch && matchArrangement && matchCategory;
    });

    if (sortBy === "match") {
      result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
    return result;
  }, [jobs, searchTerm, selectedArrangement, selectedCategory, sortBy]);

  const handleApply = async (jobId: string, jobTitle: string) => {
    try {
      setApplyingJobId(jobId);
      await api.post(`/jobs/${jobId}/applications`, {});
      setAppliedJobs((prev) => ({ ...prev, [jobId]: true }));
      setStatusMessage({
        type: "success",
        text: `Application submitted for "${jobTitle}"! Recruiter notified.`,
        showResumeLink: false,
      });
    } catch (err: unknown) {
      const errResponse = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
      const statusCode = errResponse?.status;
      const rawDetail = errResponse?.data?.detail;
      const detailStr =
        typeof rawDetail === "string"
          ? rawDetail
          : Array.isArray(rawDetail)
          ? rawDetail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
          : "";

      if (statusCode === 409) {
        setAppliedJobs((prev) => ({ ...prev, [jobId]: true }));
        setStatusMessage({
          type: "success",
          text: `You have already applied to "${jobTitle}".`,
          showResumeLink: false,
        });
      } else if (
        statusCode === 400 &&
        detailStr.toLowerCase().includes("resume")
      ) {
        setStatusMessage({
          type: "error",
          text: "No resume on file. Please upload your resume in Resume Studio before applying.",
          showResumeLink: true,
        });
      } else if (statusCode === 403) {
        setStatusMessage({
          type: "error",
          text: detailStr || "Only candidate accounts can apply to job requisitions.",
          showResumeLink: false,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: detailStr || "Failed to submit application. Please upload your resume in Resume Studio first.",
          showResumeLink: detailStr.toLowerCase().includes("resume") || !detailStr,
        });
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleSkillClick = (skillName: string) => {
    setSearchTerm(skillName);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Search Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-emerald-500">
                CareerSync • Role Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Opportunities &amp; Job Matches
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Real-time engineering positions matched against your candidate skill matrix and experience level.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                isDark
                  ? "bg-slate-950 border-slate-800 text-emerald-400"
                  : "bg-slate-50 border-slate-200 text-emerald-600"
              }`}
            >
              <IconTarget size={16} />
              <span>{filteredJobs.length} Verified Roles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Notification Toast */}
      {statusMessage && (
        <div
          role="alert"
          className={`p-4 sm:p-5 rounded-2xl border text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fadeIn ${
            statusMessage.type === "error"
              ? isDark
                ? "bg-rose-950/80 border-rose-800 text-rose-200"
                : "bg-rose-50 border-rose-300 text-rose-900 shadow-rose-100"
              : isDark
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
              : "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-100"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === "error" ? (
              <IconAlertTriangle
                size={20}
                className={isDark ? "text-rose-400 shrink-0" : "text-rose-600 shrink-0"}
              />
            ) : (
              <IconCheckCircle
                size={20}
                className={isDark ? "text-emerald-400 shrink-0" : "text-emerald-600 shrink-0"}
              />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold text-sm leading-snug">{statusMessage.text}</p>
              {statusMessage.showResumeLink && (
                <p className={`text-xs ${isDark ? "text-rose-300" : "text-rose-700"}`}>
                  Upload your CV in{" "}
                  <Link
                    href="/dashboard/resume"
                    className="underline font-bold hover:text-white transition"
                  >
                    AI Resume Studio →
                  </Link>{" "}
                  to enable one-click Quick Apply.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {statusMessage.showResumeLink && (
              <Link
                href="/dashboard/resume"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isDark
                    ? "bg-rose-900 hover:bg-rose-800 text-rose-100"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                Go to Resume Studio
              </Link>
            )}
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss notification"
              className={`p-1.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                isDark
                  ? "text-rose-400 hover:text-white hover:bg-rose-900/60"
                  : "text-rose-700 hover:text-rose-950 hover:bg-rose-200"
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search Input & Filtering Bar */}
      <div
        className={`p-5 rounded-2xl border space-y-4 shadow-sm ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main Input */}
          <div className="relative flex-1 w-full">
            <div className={`absolute left-3.5 top-3.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="Search by title, department, or skill (e.g. Next.js, Python, Docker)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full text-xs rounded-xl pl-10 pr-10 py-3 border focus:outline-none focus:border-emerald-500 transition ${
                isDark
                  ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Location Dropdown */}
          <select
            value={selectedArrangement}
            onChange={(e) => setSelectedArrangement(e.target.value)}
            aria-label="Filter by work arrangement"
            className={`w-full md:w-44 text-xs font-semibold rounded-xl px-3.5 py-3 border focus:outline-none focus:border-emerald-500 transition cursor-pointer ${
              isDark
                ? "bg-slate-950 border-slate-800 text-slate-100"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="all">All Arrangements</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "match" | "recent")}
            aria-label="Sort roles"
            className={`w-full md:w-44 text-xs font-semibold rounded-xl px-3.5 py-3 border focus:outline-none focus:border-emerald-500 transition cursor-pointer ${
              isDark
                ? "bg-slate-950 border-slate-800 text-slate-100"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="match">Highest Match Score</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>

        {/* Quick Filter Chips */}
        <div className={`flex flex-wrap items-center gap-2 pt-1 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <span className={`text-xs font-semibold mr-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Quick Filter:
          </span>
          {filterChips.map((chip) => {
            const isActive = selectedCategory === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setSelectedCategory(chip.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#059669] text-white shadow-xs"
                    : isDark
                    ? "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    : "bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Cards Listing */}
      <div className="space-y-4">
        {loading ? (
          /* Animated Skeleton Loading State */
          <div className="space-y-4">
            {[1, 2, 3].map((skeleton) => (
              <div
                key={skeleton}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden"
              >
                <div className="animate-shimmer absolute inset-0 pointer-events-none" />
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-6 bg-slate-800 rounded-lg" />
                      <div className="w-20 h-5 bg-slate-800 rounded-full" />
                    </div>
                    <div className="w-64 h-4 bg-slate-800/70 rounded-md" />
                    <div className="w-full max-w-xl h-3.5 bg-slate-800/50 rounded-md" />
                    <div className="flex gap-2 pt-2">
                      <div className="w-16 h-6 bg-slate-800 rounded-md" />
                      <div className="w-20 h-6 bg-slate-800 rounded-md" />
                      <div className="w-16 h-6 bg-slate-800 rounded-md" />
                    </div>
                  </div>
                  <div className="w-32 h-10 bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Empty Search State */
          <div className="p-12 text-center text-slate-400 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
              <IconSearch size={22} />
            </div>
            <p className="text-base font-bold text-slate-200">No matching jobs found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any roles matching &quot;{searchTerm}&quot;. Try clearing filters or searching for skills like React, Python, or Docker.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedArrangement("all");
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Real Job Cards */
          filteredJobs.map((job) => {
            const isApplied = !!appliedJobs[job.id];
            const isExpanded = expandedJobId === job.id;

            return (
              <div
                key={job.id}
                className={`p-6 rounded-2xl border transition-all duration-300 shadow-xs hover:shadow-md ${
                  isDark
                    ? "bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-slate-100"
                    : "bg-white border-slate-200 hover:border-emerald-500/50 text-slate-900"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Job Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold font-display leading-snug">
                        {job.title}
                      </h2>
                      {job.matchScore && (
                        <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{job.matchScore}% Match Affinity</span>
                        </div>
                      )}
                      <span className="px-2.5 py-0.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-md">
                        {job.work_arrangement || "Full-time"}
                      </span>
                    </div>

                    {/* Metadata line with SVG icons */}
                    <div className={`flex flex-wrap items-center gap-4 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="font-medium flex items-center gap-1.5">
                        <IconBuilding size={14} className="text-emerald-500" />
                        {job.department || "Engineering"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <IconMapPin size={14} />
                        {job.location || "Remote"}
                      </span>
                      {job.salary && (
                        <span className="text-emerald-500 font-semibold font-mono">
                          {job.salary}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <IconBriefcase size={14} />
                        {job.employment_type || "Full-time"}
                      </span>
                    </div>

                    <p className={`text-xs max-w-3xl leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {job.description}
                    </p>

                    {/* Clickable Skill Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                      <span className={`text-xs font-semibold mr-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Skills:
                      </span>
                      {(job.skills || []).map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSkillClick(s.name)}
                          title={`Click to filter by ${s.name}`}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                            isDark
                              ? "bg-slate-950 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border-slate-800"
                              : "bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200"
                          }`}
                        >
                          {s.name} {s.min_years ? `(${s.min_years}y)` : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className={`flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center justify-center gap-2.5 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 ${
                    isDark ? "border-slate-800" : "border-slate-100"
                  }`}>
                    <button
                      disabled={isApplied || applyingJobId === job.id}
                      onClick={() => handleApply(job.id, job.title)}
                      className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer ${
                        isApplied
                          ? isDark
                            ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                          : applyingJobId === job.id
                          ? "bg-emerald-700 text-white cursor-wait opacity-80"
                          : "bg-[#059669] hover:bg-[#047857] text-white hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5"
                      }`}
                    >
                      {isApplied ? "✓ Application Sent" : applyingJobId === job.id ? "Submitting..." : "Quick Apply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                        isDark
                          ? "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {isExpanded ? "Hide Details" : "Role Insights"}
                    </button>
                  </div>
                </div>

                {/* Expanded Insights Drawer */}
                {isExpanded && (
                  <div className={`mt-5 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fadeIn ${
                    isDark ? "border-slate-800" : "border-slate-100"
                  }`}>
                    <div className={`p-3.5 rounded-xl border ${
                      isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block mb-1">
                        Role Requirements Alignment
                      </span>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        Required competencies: <strong>{job.skills?.filter((s) => s.required).map((s) => s.name).join(", ") || "General experience"}</strong>. These are evaluated against your uploaded ATS resume upon application.
                      </p>
                    </div>
                    <div className={`p-3.5 rounded-xl border ${
                      isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold block mb-1">
                        ATS Resume Recommendations
                      </span>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        Ensure quantified metrics and experience regarding <strong>{job.skills?.[0]?.name || "Core Skills"}</strong> are clearly present in your resume.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
