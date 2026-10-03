"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  IconSearch,
  IconBriefcase,
  IconDocument,
  IconTrendUp,
  IconCheckCircle,
  IconNetwork,
  IconUser,
  IconBuilding,
} from "@/components/Icons";

export default function DashboardPage() {
  const { user } = useAuth();
  const isCandidate = user?.role === "candidate" || !user?.role;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full inline-block mb-3">
              {isCandidate ? "Candidate Workspace" : "Recruiter Command Center"}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{user?.full_name || user?.email?.split('@')[0] || "User"}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              {isCandidate
                ? "Your vector profile matched 1,420 open engineering roles this week. 12 high-affinity positions are ready for review."
                : "Your talent matcher has screened 84 incoming applicants with an average 91% skill alignment."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/jobs"
              className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <IconSearch size={16} />
              Explore Matches
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(isCandidate ? candidateStats : recruiterStats).map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition backdrop-blur-md group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">{stat.label}</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {stat.icon}
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition">
                {stat.value}
              </span>
              <span className="text-xs font-medium text-emerald-400">
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Section */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {isCandidate ? "Recommended Positions" : "High-Affinity Applicants"}
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  {isCandidate ? "Ranked by skill matrix overlap & experience affinity" : "Screened candidates with >85% alignment"}
                </p>
              </div>
              <Link href="/dashboard/jobs" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">
                View All Directory →
              </Link>
            </div>

            <div className="space-y-4">
              {isCandidate
                ? mockJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                          {job.company[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                              {job.title}
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-mono">
                              {job.match}% Affinity
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1">
                            {job.company} • {job.location} • {job.salary}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.tags.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-[10px] text-slate-300 bg-slate-900 rounded-md border border-slate-800">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/jobs"
                        className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-xl transition shrink-0 self-start sm:self-center"
                      >
                        Apply Position
                      </Link>
                    </div>
                  ))
                : mockCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] flex items-center justify-center font-bold text-white text-xs">
                          {cand.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                              {cand.name}
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-mono">
                              {cand.match}% Alignment
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {cand.role} • {cand.exp} exp
                          </p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer">
                        View Profile
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          {/* Skill Matrix Insights Widget */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <IconNetwork size={16} />
              Skill Matrix Optimization
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {isCandidate
                ? "Integrating verified proficiencies in 'Docker' and 'Kubernetes' in your profile increases affinity rankings for Senior Infrastructure roles by an estimated +18%."
                : "Listings specifying exact testing frameworks and CI/CD stacks receive 3.2x higher qualified candidate submissions."}
            </p>
            <Link href="/dashboard/resume" className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold rounded-xl transition text-center block">
              {isCandidate ? "Review Resume Keywords" : "Update Job Requirements"}
            </Link>
          </div>

          {/* Quick Tools */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Workspace Tools</h3>
            <div className="space-y-2.5">
              <Link
                href="/dashboard/resume"
                className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 font-medium transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <IconDocument size={16} />
                  </div>
                  Resume Studio &amp; ATS Scanner
                </div>
                <span className="text-slate-500 font-bold">→</span>
              </Link>
              <Link
                href="/dashboard/jobs"
                className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 font-medium transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <IconBriefcase size={16} />
                  </div>
                  Open Opportunities Directory
                </div>
                <span className="text-slate-500 font-bold">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const candidateStats = [
  {
    label: "Profile Match Affinity",
    value: "94%",
    change: "+4% this wk",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: "Resume ATS Score",
    value: "88/100",
    change: "Verified",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Applications Sent",
    value: "14",
    change: "Active",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    label: "Interview Requests",
    value: "3",
    change: "Active",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const recruiterStats = [
  {
    label: "Active Job Listings",
    value: "8",
    change: "Live",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Total Applicants",
    value: "142",
    change: "+24 today",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: "Candidate Alignment Rate",
    value: "89%",
    change: "High Quality",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Interviews Scheduled",
    value: "11",
    change: "This Week",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const mockJobs = [
  {
    id: "1",
    title: "Senior Full Stack AI Engineer",
    company: "Anthropic Partner AI",
    location: "Remote",
    salary: "$140,000 - $180,000",
    match: 96,
    tags: ["React", "TypeScript", "FastAPI", "Vector DB"],
  },
  {
    id: "2",
    title: "Frontend Architect (Next.js & Tailwind)",
    company: "TechScale Labs",
    location: "Hybrid / New York",
    salary: "$130,000 - $160,000",
    match: 92,
    tags: ["Next.js", "Tailwind CSS", "Zustand", "Performance"],
  },
  {
    id: "3",
    title: "Machine Learning Solutions Engineer",
    company: "DataCloud Systems",
    location: "Remote",
    salary: "$150,000 - $190,000",
    match: 87,
    tags: ["Python", "PyTorch", "LLM Fine-tuning", "REST API"],
  },
];

const mockCandidates = [
  {
    id: "1",
    name: "Alex Rivera",
    role: "Senior React Specialist",
    exp: "5 yrs",
    match: 95,
  },
  {
    id: "2",
    name: "Sarah Chen",
    role: "Full Stack Engineer (Python/Node)",
    exp: "4 yrs",
    match: 91,
  },
  {
    id: "3",
    name: "Marcus Vance",
    role: "Backend Architect (FastAPI/Postgres)",
    exp: "6 yrs",
    match: 88,
  },
];
