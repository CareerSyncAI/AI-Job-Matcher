"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import api from "@/lib/api";
import {
  IconSearch,
  IconBriefcase,
  IconDocument,
  IconCheckCircle,
  IconNetwork,
  IconUsers,
  IconLayers,
} from "@/components/Icons";

interface RealJob {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employment_type: string;
  work_arrangement: string;
  experience_min_years: number;
  education_required: string;
  status: string;
  skills: { name: string; required: boolean }[];
  applicant_count?: number;
}

interface RealApplication {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
}

interface RealCandidateCard {
  id: string;
  application_id: string;
  name: string;
  currentRole?: string | null;
  experienceYears: number;
  matchScore: number;
  matchedSkills: string[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isCandidate = user?.role === "candidate" || !user?.role;

  const [loading, setLoading] = useState(true);
  const [openJobs, setOpenJobs] = useState<RealJob[]>([]);
  const [myApplications, setMyApplications] = useState<RealApplication[]>([]);
  const [recruiterJobs, setRecruiterJobs] = useState<RealJob[]>([]);
  const [topCandidates, setTopCandidates] = useState<RealCandidateCard[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (isCandidate) {
          // Candidate flow: fetch public open jobs and personal applications
          const [jobsRes, appsRes] = await Promise.allSettled([
            api.get("/jobs/public/open"),
            api.get("/applications/me"),
          ]);
          if (isMounted) {
            if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
              setOpenJobs(jobsRes.value.data.slice(0, 5));
            }
            if (appsRes.status === "fulfilled" && Array.isArray(appsRes.value.data)) {
              setMyApplications(appsRes.value.data);
            }
          }
        } else {
          // Recruiter flow: fetch owned jobs and candidate cards
          const jobsRes = await api.get("/jobs");
          if (isMounted && Array.isArray(jobsRes.data)) {
            setRecruiterJobs(jobsRes.data);
            if (jobsRes.data.length > 0) {
              const topJob = jobsRes.data[0];
              try {
                const candRes = await api.get(`/jobs/${topJob.id}/candidates`);
                if (isMounted && Array.isArray(candRes.data)) {
                  setTopCandidates(candRes.data.slice(0, 5));
                }
              } catch {
                // No candidates yet
              }
            }
          }
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isCandidate]);

  // Derived metrics
  const totalApplicants = recruiterJobs.reduce((acc, j) => acc + (j.applicant_count || 0), 0);
  const activePostingsCount = recruiterJobs.filter((j) => j.status === "open").length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full inline-block mb-3">
              {isCandidate ? "Candidate Workspace" : "Recruiter Command Center"}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{user?.full_name || user?.email?.split("@")[0] || "User"}</span>
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {isCandidate
                ? `You have ${myApplications.length} active applications and ${openJobs.length} verified live requisitions ready for discovery.`
                : `Managing ${recruiterJobs.length} requisitions with ${totalApplicants} evaluated candidate applications across your ATS pipeline.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isCandidate ? (
              <>
                <Link
                  href="/dashboard/jobs"
                  className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <IconSearch size={16} />
                  Explore Matches
                </Link>
                <Link
                  href="/dashboard/resume"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                >
                  <IconDocument size={16} />
                  Resume Studio
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/recruiter/jobs"
                  className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <IconBriefcase size={16} />
                  Post Requisition
                </Link>
                <Link
                  href="/dashboard/recruiter/pipeline"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                >
                  <IconLayers size={16} />
                  ATS Pipeline
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isCandidate ? (
          <>
            <Link
              href="/dashboard/jobs"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Open Verified Roles</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconSearch size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  {openJobs.length}
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Live</span>
              </div>
            </Link>

            <Link
              href="/dashboard/applications"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Submitted Applications</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconDocument size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  {myApplications.length}
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Active</span>
              </div>
            </Link>

            <Link
              href="/dashboard/applications"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Under Review</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconCheckCircle size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  {myApplications.filter((a) => a.status === "under_review" || a.status === "shortlisted").length}
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>In Pipeline</span>
              </div>
            </Link>

            <Link
              href="/dashboard/resume"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>ATS Resume Status</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconDocument size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  ATS Ready
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Deterministic</span>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard/recruiter/jobs"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Total Requisitions</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconBriefcase size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  {recruiterJobs.length}
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{activePostingsCount} Open</span>
              </div>
            </Link>

            <Link
              href="/dashboard/recruiter/candidates"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Applicants Evaluated</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconUsers size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  {totalApplicants}
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Total Sourced</span>
              </div>
            </Link>

            <Link
              href="/dashboard/recruiter/pipeline"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>ATS Pipeline</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconLayers size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  {topCandidates.length}
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Ranked</span>
              </div>
            </Link>

            <Link
              href="/dashboard/recruiter/jobs"
              className={`p-5 rounded-2xl border transition backdrop-blur-md group block ${
                isDark ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 shadow-xs hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Scoring Engine</span>
                <div className={`p-2.5 rounded-xl border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  <IconNetwork size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-2xl font-bold transition leading-none ${isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-700"}`}>
                  v2.1
                </span>
                <span className={`text-xs font-medium leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Deterministic</span>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-2xl border backdrop-blur-md ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {isCandidate ? "Live Open Requisitions" : "Recent Evaluated Candidates"}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {isCandidate
                    ? "Verified open positions scored by deterministic skill requirements"
                    : "Top candidates ranked by deterministic multi-tier coverage"}
                </p>
              </div>
              <Link
                href={isCandidate ? "/dashboard/jobs" : "/dashboard/recruiter/candidates"}
                className={`text-xs font-semibold transition ${isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-700 hover:text-emerald-800"}`}
              >
                {isCandidate ? "View All Jobs →" : "View All Candidates →"}
              </Link>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className={`p-8 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-600"}`}>Loading directory...</div>
              ) : isCandidate ? (
                openJobs.length === 0 ? (
                  <div className={`p-8 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                    No open requisitions posted yet. Check back soon!
                  </div>
                ) : (
                  openJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-4 rounded-xl border transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDark
                          ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/40"
                          : "bg-slate-50/80 border-slate-200 hover:border-emerald-500/50 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}>
                          <IconBriefcase size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href="/dashboard/jobs" className="group-hover:text-emerald-300 transition">
                              <h3 className={`font-semibold transition ${
                                isDark ? "text-slate-100 group-hover:text-emerald-300" : "text-slate-900 group-hover:text-emerald-700"
                              }`}>
                                {job.title}
                              </h3>
                            </Link>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono border ${
                              isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-800 bg-emerald-50 border-emerald-200"
                            }`}>
                              {job.employment_type}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {job.department || "Enterprise"} • {job.location || "Remote"} • Min {job.experience_min_years} yrs exp
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(job.skills || []).slice(0, 4).map((s, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 text-[10px] rounded-md border ${
                                  isDark ? "text-slate-300 bg-slate-900 border-slate-800" : "text-slate-700 bg-slate-100 border-slate-200 font-medium"
                                }`}
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/jobs"
                        className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition shadow-sm shrink-0 self-start sm:self-center"
                      >
                        View &amp; Apply
                      </Link>
                    </div>
                  ))
                )
              ) : topCandidates.length === 0 ? (
                <div className={`p-8 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                  No candidate evaluations recorded yet. Upload resumes to an open requisition to screen talent!
                </div>
              ) : (
                topCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className={`p-4 rounded-xl border transition group flex items-center justify-between ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/40"
                        : "bg-slate-50/80 border-slate-200 hover:border-emerald-500/50 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] flex items-center justify-center font-bold text-white text-xs">
                        {cand.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold transition ${
                            isDark ? "text-slate-100 group-hover:text-emerald-300" : "text-slate-900 group-hover:text-emerald-700"
                          }`}>
                            {cand.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono border ${
                            isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-800 bg-emerald-50 border-emerald-200"
                          }`}>
                            {cand.matchScore}% Match
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {cand.currentRole || "Candidate"} • {cand.experienceYears} yrs experience
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/recruiter/candidates"
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        isDark
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                          : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs"
                      }`}
                    >
                      Screen Candidate
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Quick Links */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border backdrop-blur-md ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <h2 className={`text-base font-bold tracking-normal mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Quick Actions
            </h2>
            <div className="space-y-2.5">
              {isCandidate ? (
                <>
                  <Link
                    href="/dashboard/jobs"
                    className={`p-3 rounded-xl border transition flex items-center justify-between text-xs group ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 text-slate-300"
                        : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconSearch size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      Browse Live Engineering Roles
                    </div>
                    <span className={`font-bold transition ${isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-700"}`}>→</span>
                  </Link>
                  <Link
                    href="/dashboard/resume"
                    className={`p-3 rounded-xl border transition flex items-center justify-between text-xs group ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 text-slate-300"
                        : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconDocument size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      Upload &amp; Analyze ATS Resume
                    </div>
                    <span className={`font-bold transition ${isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-700"}`}>→</span>
                  </Link>
                  <Link
                    href="/dashboard/applications"
                    className={`p-3 rounded-xl border transition flex items-center justify-between text-xs group ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 text-slate-300"
                        : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconCheckCircle size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      Track Submitted Applications
                    </div>
                    <span className={`font-bold transition ${isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-700"}`}>→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/recruiter/jobs"
                    className={`p-3 rounded-xl border transition flex items-center justify-between text-xs group ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 text-slate-300"
                        : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconBriefcase size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      Post New Requisition
                    </div>
                    <span className={`font-bold transition ${isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-700"}`}>→</span>
                  </Link>
                  <Link
                    href="/dashboard/recruiter/candidates"
                    className={`p-3 rounded-xl border transition flex items-center justify-between text-xs group ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 text-slate-300"
                        : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconUsers size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      Sourcing Directory &amp; Evaluator
                    </div>
                    <span className={`font-bold transition ${isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-700"}`}>→</span>
                  </Link>
                  <Link
                    href="/dashboard/recruiter/pipeline"
                    className={`p-3 rounded-xl border transition flex items-center justify-between text-xs group ${
                      isDark
                        ? "bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 text-slate-300"
                        : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconLayers size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      ATS Kanban Pipeline Board
                    </div>
                    <span className={`font-bold transition ${isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-700"}`}>→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
