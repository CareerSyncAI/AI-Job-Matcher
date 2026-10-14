"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  IconUsers,
  IconSearch,
  IconMapPin,
  IconX,
  IconBriefcase,
  IconCheckCircle,
} from "@/components/Icons";

interface CandidateEvidenceItem {
  requirement: string;
  claim: string;
  sourceText?: string | null;
  type: string;
  details?: string | null;
}

interface CandidateCardDTO {
  id: string;
  application_id: string;
  jobId: string;
  name: string;
  currentRole?: string | null;
  location?: string | null;
  experienceYears: number;
  education?: string | null;
  skills: string[];
  matchScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  semanticScore: number;
  matchedSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
  status: string;
  evidence: CandidateEvidenceItem[];
  recruiterNotes?: string | null;
}

interface JobSummary {
  id: string;
  title: string;
  status: string;
  applicant_count: number;
}

export default function RecruiterCandidatesPage() {
  const { isDark } = useTheme();

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [candidates, setCandidates] = useState<CandidateCardDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("All");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateCardDTO | null>(null);

  // Fetch recruiter's jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/jobs");
        const jobsList: JobSummary[] = Array.isArray(res.data) ? res.data : [];
        setJobs(jobsList);
        if (jobsList.length > 0) {
          setSelectedJobId(jobsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load recruiter jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Fetch candidate applications whenever selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) {
      setCandidates([]);
      return;
    }

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/jobs/${selectedJobId}/candidates`);
        setCandidates(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load job candidates:", err);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [selectedJobId]);

  // Derive unique skills across all loaded candidates
  const allSkills = [
    "All",
    ...Array.from(
      new Set(
        candidates.flatMap((c) => [...(c.skills || []), ...(c.matchedSkills || [])])
      )
    ).slice(0, 8),
  ];

  const filteredCandidates = candidates.filter((c) => {
    const candidateSkills = [...(c.skills || []), ...(c.matchedSkills || [])];
    if (selectedSkill !== "All" && !candidateSkills.some((s) => s.toLowerCase() === selectedSkill.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchRole = (c.currentRole || "").toLowerCase().includes(q);
      const matchSkill = candidateSkills.some((s) => s.toLowerCase().includes(q));
      return matchName || matchRole || matchSkill;
    }
    return true;
  });

  const toggleShortlist = async (candidate: CandidateCardDTO) => {
    const newStatus = candidate.status === "shortlisted" ? "under_review" : "shortlisted";
    try {
      await api.patch(`/applications/${candidate.application_id}/status`, {
        status: newStatus,
      });
      setCandidates((prev) =>
        prev.map((c) =>
          c.application_id === candidate.application_id ? { ...c, status: newStatus } : c
        )
      );
      if (selectedCandidate?.application_id === candidate.application_id) {
        setSelectedCandidate({ ...selectedCandidate, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update candidate status:", err);
    }
  };

  const shortlistedCount = candidates.filter((c) => c.status === "shortlisted").length;

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
                <IconUsers size={20} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Talent Discovery &amp; Sourcing</h1>
            </div>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Explore verified candidate profiles scored by deterministic skill affinity against your open requisitions.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              Shortlisted: <strong className={`font-mono ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{shortlistedCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Job Requisition Selector */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3">
          <IconBriefcase size={18} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
          <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>Target Requisition:</span>
          {jobs.length === 0 ? (
            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>No active requisitions found</span>
          ) : (
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              aria-label="Target Requisition"
              className={`text-xs font-semibold rounded-xl px-3 py-2 border focus:outline-none focus:border-emerald-500 transition cursor-pointer ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.applicant_count ?? 0} applicants) [{job.status.charAt(0).toUpperCase() + job.status.slice(1)}]
                </option>
              ))}
            </select>
          )}
        </div>

        <Link
          href="/dashboard/recruiter/jobs"
          className={`text-xs font-semibold transition flex items-center gap-1 self-start sm:self-auto ${
            isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-700 hover:text-emerald-800"
          }`}
        >
          Manage All Requisitions →
        </Link>
      </div>

      {/* Search and Skill Filters */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, professional headline, or specific skill..."
            className={`w-full text-xs rounded-xl px-4 py-3 pl-10 border focus:outline-none focus:border-emerald-500 transition ${
              isDark
                ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <IconSearch size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>

        {allSkills.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <span className={`text-xs font-medium shrink-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Filter Skill:
            </span>
            {allSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => setSelectedSkill(skill)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedSkill === skill
                    ? "bg-[#059669] text-white"
                    : isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Grid */}
      {loading ? (
        <div className={`p-12 text-center rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"} animate-pulse`}>
          Retrieving evaluated candidates...
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <IconUsers size={32} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-sm font-semibold">No candidates evaluated yet for this requisition</h3>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Upload applicant resumes directly to this job to generate deterministic evidence-backed evaluations.
          </p>
          <Link
            href="/dashboard/recruiter/jobs"
            className="inline-block mt-4 px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-xl"
          >
            Upload Resumes to Job
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCandidates.map((candidate) => {
            const isShortlisted = candidate.status === "shortlisted";
            return (
              <div
                key={candidate.id}
                className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                  isDark
                    ? "bg-slate-900 border-slate-800 hover:border-emerald-500/30 text-slate-100"
                    : "bg-white border-slate-200 hover:border-emerald-500/40 text-slate-900 shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base leading-snug">{candidate.name}</h3>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {candidate.currentRole || "Candidate"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium block ${isDark ? "text-slate-400" : "text-slate-600"}`}>Deterministic Match</span>
                      <span className={`text-2xl font-bold font-mono leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{candidate.matchScore}%</span>
                    </div>
                  </div>

                  <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    <span className="flex items-center gap-1">
                      <IconMapPin size={13} />
                      {candidate.location || "Remote / Not Specified"}
                    </span>
                    <span>{candidate.experienceYears} Yrs Experience</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                      isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {candidate.status?.replace("_", " ") || "Under Review"}
                    </span>
                  </div>

                  {candidate.education && (
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Degree: <span className={`font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{candidate.education}</span>
                    </p>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <span className={`text-xs font-semibold block ${isDark ? "text-slate-400" : "text-slate-700"}`}>Verified Skills Breakdown:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                            isDark
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {candidate.missingSkills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                            isDark
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          ✕ {skill} (Missing)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-3 pt-3 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    }`}
                  >
                    View Evaluation &amp; Evidence
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleShortlist(candidate)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isShortlisted
                        ? "bg-emerald-600 text-white"
                        : "bg-[#059669] hover:bg-[#047857] text-white shadow-sm"
                    }`}
                  >
                    {isShortlisted ? "✓ Shortlisted" : "+ Shortlist"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Profile / Evidence Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-bold text-xl">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedCandidate.name}</h3>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {selectedCandidate.currentRole || "Candidate"} • {selectedCandidate.location || "Location Not Provided"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-3.5 rounded-xl border text-center ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-xs text-slate-400 font-medium block">Match Score</span>
                <span className="text-2xl font-bold font-mono leading-none mt-1.5 text-emerald-500 block">{selectedCandidate.matchScore}%</span>
              </div>
              <div className={`p-3.5 rounded-xl border text-center ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-xs text-slate-400 font-medium block">Skills Score</span>
                <span className="text-2xl font-bold font-mono leading-none mt-1.5 text-slate-200 block">{selectedCandidate.skillScore}%</span>
              </div>
              <div className={`p-3.5 rounded-xl border text-center ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-xs text-slate-400 font-medium block">Experience</span>
                <span className="text-2xl font-bold font-mono leading-none mt-1.5 text-slate-200 block">{selectedCandidate.experienceScore}%</span>
              </div>
              <div className={`p-3.5 rounded-xl border text-center ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-xs text-slate-400 font-medium block">Education</span>
                <span className="text-2xl font-bold font-mono leading-none mt-1.5 text-slate-200 block">{selectedCandidate.educationScore}%</span>
              </div>
            </div>

            {/* Verbatim Grounded Evidence Claims */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-emerald-400 block">
                Evidence-Backed Assessment Claims
              </span>
              {selectedCandidate.evidence && selectedCandidate.evidence.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedCandidate.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        ev.type === "matched"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : ev.type === "transferable"
                          ? "bg-blue-500/5 border-blue-500/20"
                          : "bg-amber-500/5 border-amber-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-200">{ev.requirement}</span>
                        <span
                          className={`capitalize text-xs px-2.5 py-0.5 rounded font-medium ${
                            ev.type === "matched"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : ev.type === "transferable"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {ev.type}
                        </span>
                      </div>
                      <p className="text-slate-300">{ev.claim}</p>
                      {ev.sourceText && (
                        <blockquote className="border-l-2 border-slate-600 pl-2 text-xs text-slate-400 italic">
                          &ldquo;{ev.sourceText}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No detailed evidence claims recorded.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => toggleShortlist(selectedCandidate)}
                className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl"
              >
                {selectedCandidate.status === "shortlisted" ? "Remove Shortlist" : "Add to Shortlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
