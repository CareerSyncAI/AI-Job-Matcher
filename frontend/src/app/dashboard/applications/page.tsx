"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  IconTarget,
  IconBriefcase,
  IconBuilding,
  IconMapPin,
  IconSearch,
} from "@/components/Icons";

interface ApplicationItem {
  id: string;
  job_id: string;
  candidate_id: string;
  status: "new" | "under_review" | "shortlisted" | "rejected" | string;
  applied_at: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  match_score?: number;
}

export default function CandidateApplicationsPage() {
  const { isDark } = useTheme();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const res = await api.get("/applications/me");
        const appsData = Array.isArray(res.data) ? res.data : [];

        // Enrich with job titles where possible
        const enriched = await Promise.all(
          appsData.map(async (app: ApplicationItem) => {
            try {
              const jobRes = await api.get(`/jobs/${app.job_id}`);
              return {
                ...app,
                job_title: jobRes.data?.title || "Engineering Role",
                company_name: jobRes.data?.department || "Verified Hiring Partner",
                location: jobRes.data?.location || "Remote",
              };
            } catch {
              return {
                ...app,
                job_title: "Role Application",
                company_name: "Hiring Organization",
                location: "Remote / Hybrid",
              };
            }
          })
        );
        setApplications(enriched);
      } catch (err) {
        console.error("Failed to load applications:", err);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "shortlisted":
        return {
          label: "Shortlisted",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        };
      case "under_review":
        return {
          label: "In Review / Screening",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "rejected":
        return {
          label: "Archived / Rejected",
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        };
      case "new":
      default:
        return {
          label: "Application Submitted",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
    }
  };

  const filteredApps = applications.filter((app) => {
    const s = app.status?.toLowerCase();
    if (activeFilter === "ACTIVE" && s === "rejected") return false;
    if (activeFilter === "UNDER_REVIEW" && s !== "under_review") return false;
    if (activeFilter === "SHORTLISTED" && s !== "shortlisted") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = app.job_title?.toLowerCase().includes(q);
      const matchComp = app.company_name?.toLowerCase().includes(q);
      return matchTitle || matchComp;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <IconTarget size={20} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">My Applications Tracker</h1>
            </div>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Real-time pipeline transparency for roles you applied to across hiring teams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/jobs"
              className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <IconBriefcase size={15} />
              Browse More Opportunities
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Applied</span>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{applications.length}</p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Under Review</span>
          <p className="text-2xl font-bold mt-1 text-amber-500">
            {applications.filter((a) => a.status?.toLowerCase() === "under_review").length}
          </p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Shortlisted</span>
          <p className="text-2xl font-bold mt-1 text-purple-500">
            {applications.filter((a) => a.status?.toLowerCase() === "shortlisted").length}
          </p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Archived</span>
          <p className="text-2xl font-bold mt-1 text-slate-400">
            {applications.filter((a) => a.status?.toLowerCase() === "rejected").length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { key: "ALL", label: "All" },
            { key: "ACTIVE", label: "Active" },
            { key: "UNDER_REVIEW", label: "Under Review" },
            { key: "SHORTLISTED", label: "Shortlisted" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeFilter === f.key
                  ? "bg-[#059669] text-white"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search role or company..."
            className={`w-full text-xs rounded-xl px-3.5 py-2 pl-9 border focus:outline-none focus:border-emerald-500 transition ${
              isDark
                ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <IconSearch size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {loading ? (
          <div className={`p-10 text-center rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"} animate-pulse`}>
            Loading your applications...
          </div>
        ) : filteredApps.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <IconTarget size={32} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold">No applications found in this filter</h3>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Explore available job matches and submit applications directly with your ATS resume.
            </p>
            <Link
              href="/dashboard/jobs"
              className="inline-block mt-4 px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-xl"
            >
              Discover Open Roles
            </Link>
          </div>
        ) : (
          filteredApps.map((app) => {
            const badge = getStatusBadge(app.status);
            return (
              <div
                key={app.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isDark
                    ? "bg-slate-900 border-slate-800 hover:border-emerald-500/30 text-slate-100 shadow-xs"
                    : "bg-white border-slate-200 hover:border-emerald-500/40 text-slate-900 shadow-xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-semibold text-base">{app.job_title || "Software Engineering Role"}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className={`flex flex-wrap items-center gap-4 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="flex items-center gap-1 font-medium">
                        <IconBuilding size={14} className="text-emerald-500" />
                        {app.company_name || "Enterprise Partner"}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconMapPin size={14} />
                        {app.location || "Remote / Hybrid"}
                      </span>
                      <span>
                        Applied {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {app.match_score && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Match Score</span>
                        <span className="text-base font-bold font-mono text-emerald-500">{app.match_score}%</span>
                      </div>
                    )}

                    <Link
                      href="/dashboard/jobs"
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                        isDark
                          ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                          : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      View Job Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
