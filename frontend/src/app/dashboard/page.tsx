"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
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
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
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
            <Link href="/dashboard/jobs" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Open Verified Roles</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconSearch size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">{openJobs.length}</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">Live</span>
              </div>
            </Link>

            <Link href="/dashboard/applications" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Submitted Applications</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconDocument size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">{myApplications.length}</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">Active</span>
              </div>
            </Link>

            <Link href="/dashboard/applications" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Under Review</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconCheckCircle size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">
                  {myApplications.filter((a) => a.status === "under_review" || a.status === "shortlisted").length}
                </span>
                <span className="text-xs font-medium text-emerald-400 leading-none">In Pipeline</span>
              </div>
            </Link>

            <Link href="/dashboard/resume" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">ATS Resume Status</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconDocument size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">ATS Ready</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">Deterministic</span>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/dashboard/recruiter/jobs" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Total Requisitions</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconBriefcase size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">{recruiterJobs.length}</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">{activePostingsCount} Open</span>
              </div>
            </Link>

            <Link href="/dashboard/recruiter/candidates" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Applicants Evaluated</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconUsers size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">{totalApplicants}</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">Total Sourced</span>
              </div>
            </Link>

            <Link href="/dashboard/recruiter/pipeline" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">ATS Pipeline</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconLayers size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">{topCandidates.length}</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">Ranked</span>
              </div>
            </Link>

            <Link href="/dashboard/recruiter/jobs" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group block">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Scoring Engine</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><IconNetwork size={18} /></div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition leading-none">v2.1</span>
                <span className="text-xs font-medium text-emerald-400 leading-none">Deterministic</span>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {isCandidate ? "Live Open Requisitions" : "Recent Evaluated Candidates"}
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  {isCandidate
                    ? "Verified open positions scored by deterministic skill requirements"
                    : "Top candidates ranked by deterministic multi-tier coverage"}
                </p>
              </div>
              <Link
                href={isCandidate ? "/dashboard/jobs" : "/dashboard/recruiter/candidates"}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
              >
                {isCandidate ? "View All Jobs →" : "View All Candidates →"}
              </Link>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading directory...</div>
              ) : isCandidate ? (
                openJobs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No open requisitions posted yet. Check back soon!
                  </div>
                ) : (
                  openJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <IconBriefcase size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href="/dashboard/jobs" className="group-hover:text-emerald-300 transition">
                              <h3 className="font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                                {job.title}
                              </h3>
                            </Link>
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-mono">
                              {job.employment_type}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1">
                            {job.department || "Enterprise"} • {job.location || "Remote"} • Min {job.experience_min_years} yrs exp
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(job.skills || []).slice(0, 4).map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-[10px] text-slate-300 bg-slate-900 rounded-md border border-slate-800">
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
                <div className="p-8 text-center text-xs text-slate-500">
                  No candidate evaluations recorded yet. Upload resumes to an open requisition to screen talent!
                </div>
              ) : (
                topCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] flex items-center justify-center font-bold text-white text-xs">
                        {cand.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                            {cand.name}
                          </h3>
                          <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-mono">
                            {cand.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {cand.currentRole || "Candidate"} • {cand.experienceYears} yrs experience
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/recruiter/candidates"
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
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
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="text-base font-bold text-slate-100 tracking-normal mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2.5">
              {isCandidate ? (
                <>
                  <Link
                    href="/dashboard/jobs"
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between text-xs text-slate-300 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconSearch size={14} className="text-emerald-400" />
                      Browse Live Engineering Roles
                    </div>
                    <span className="text-slate-500 font-bold group-hover:text-emerald-400">→</span>
                  </Link>
                  <Link
                    href="/dashboard/resume"
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between text-xs text-slate-300 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconDocument size={14} className="text-emerald-400" />
                      Upload &amp; Analyze ATS Resume
                    </div>
                    <span className="text-slate-500 font-bold group-hover:text-emerald-400">→</span>
                  </Link>
                  <Link
                    href="/dashboard/applications"
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between text-xs text-slate-300 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconCheckCircle size={14} className="text-emerald-400" />
                      Track Submitted Applications
                    </div>
                    <span className="text-slate-500 font-bold group-hover:text-emerald-400">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/recruiter/jobs"
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between text-xs text-slate-300 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconBriefcase size={14} className="text-emerald-400" />
                      Post New Requisition
                    </div>
                    <span className="text-slate-500 font-bold group-hover:text-emerald-400">→</span>
                  </Link>
                  <Link
                    href="/dashboard/recruiter/candidates"
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between text-xs text-slate-300 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconUsers size={14} className="text-emerald-400" />
                      Sourcing Directory &amp; Evaluator
                    </div>
                    <span className="text-slate-500 font-bold group-hover:text-emerald-400">→</span>
                  </Link>
                  <Link
                    href="/dashboard/recruiter/pipeline"
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between text-xs text-slate-300 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconLayers size={14} className="text-emerald-400" />
                      ATS Kanban Pipeline Board
                    </div>
                    <span className="text-slate-500 font-bold group-hover:text-emerald-400">→</span>
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
