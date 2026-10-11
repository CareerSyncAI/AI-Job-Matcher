"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  IconLayers,
  IconBriefcase,
  IconX,
  IconUsers,
  IconCheckCircle,
} from "@/components/Icons";

interface CandidateEvidenceItem {
  requirement: string;
  claim: string;
  sourceText?: string | null;
  type: string;
  details?: string | null;
}

interface PipelineCandidate {
  id: string;
  application_id: string;
  jobId: string;
  name: string;
  currentRole?: string | null;
  matchScore: number;
  status: "new" | "under_review" | "shortlisted" | "rejected";
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  evidence: CandidateEvidenceItem[];
  recruiterNotes?: string | null;
}

interface JobSummary {
  id: string;
  title: string;
  status: string;
  applicant_count: number;
}

const STAGES = [
  { key: "new", title: "New Applicants", color: "border-slate-500 text-slate-400" },
  { key: "under_review", title: "Under Review", color: "border-amber-500 text-amber-400" },
  { key: "shortlisted", title: "Shortlisted", color: "border-emerald-500 text-emerald-400" },
  { key: "rejected", title: "Archived / Rejected", color: "border-rose-500 text-rose-400" },
] as const;

export default function RecruiterPipelinePage() {
  const { isDark } = useTheme();

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Fetch recruiter's jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/jobs");
        const list: JobSummary[] = Array.isArray(res.data) ? res.data : [];
        setJobs(list);
        if (list.length > 0) {
          setSelectedJobId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load recruiter jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Fetch candidates for selected job
  useEffect(() => {
    if (!selectedJobId) {
      setCandidates([]);
      return;
    }

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/jobs/${selectedJobId}/candidates`);
        const list: PipelineCandidate[] = Array.isArray(res.data) ? res.data : [];
        setCandidates(list);
      } catch (err) {
        console.error("Failed to load pipeline candidates:", err);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [selectedJobId]);

  const moveStage = async (cand: PipelineCandidate, newStage: PipelineCandidate["status"]) => {
    try {
      await api.patch(`/applications/${cand.application_id}/status`, {
        status: newStage,
      });
      setCandidates((prev) =>
        prev.map((c) =>
          c.application_id === cand.application_id ? { ...c, status: newStage } : c
        )
      );
      if (selectedCandidate?.application_id === cand.application_id) {
        setSelectedCandidate({ ...selectedCandidate, status: newStage });
      }
    } catch (err) {
      console.error("Failed to update candidate pipeline stage:", err);
    }
  };

  const handleAddNote = async (candidate: PipelineCandidate) => {
    if (!noteInput.trim()) return;
    try {
      setSavingNote(true);
      await api.post(`/applications/${candidate.application_id}/notes`, {
        body: noteInput.trim(),
      });
      const updatedNotes = candidate.recruiterNotes
        ? `${candidate.recruiterNotes}\n• ${noteInput.trim()}`
        : noteInput.trim();

      setCandidates((prev) =>
        prev.map((c) =>
          c.application_id === candidate.application_id
            ? { ...c, recruiterNotes: updatedNotes }
            : c
        )
      );
      if (selectedCandidate?.application_id === candidate.application_id) {
        setSelectedCandidate({ ...selectedCandidate, recruiterNotes: updatedNotes });
      }
      setNoteInput("");
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
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
                <IconLayers size={20} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Hiring Pipeline &amp; ATS Kanban</h1>
            </div>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Track candidate progressions from newly parsed applications through under-review to final offer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-2xl border flex items-center gap-2 px-3 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              <IconBriefcase size={16} className="text-emerald-500" />
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className={`text-xs font-semibold rounded-xl bg-transparent border-none focus:outline-none cursor-pointer py-1 ${
                  isDark ? "text-slate-200" : "text-slate-800"
                }`}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id} className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                    {j.title} ({j.applicant_count ?? 0} applicants)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className={`p-16 text-center rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"} animate-pulse`}>
          Loading ATS pipeline stages...
        </div>
      ) : candidates.length === 0 ? (
        <div className={`p-16 text-center rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
          <IconUsers size={36} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No Applications in Pipeline</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload resumes to this job requisition or await candidate submissions to populate this ATS Kanban board.
          </p>
          <Link
            href="/dashboard/recruiter/jobs"
            className="inline-block mt-4 px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-xl"
          >
            Manage Requisitions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const stageCandidates = candidates.filter((c) => {
              const statusNormalized = (c.status || "new").toLowerCase();
              if (col.key === "new") return statusNormalized === "new";
              if (col.key === "under_review") return statusNormalized === "under_review" || statusNormalized === "screened";
              if (col.key === "shortlisted") return statusNormalized === "shortlisted";
              if (col.key === "rejected") return statusNormalized === "rejected";
              return false;
            });

            return (
              <div
                key={col.key}
                className={`rounded-2xl border flex flex-col min-h-[500px] ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.color.split(" ")[0]}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">{col.title}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {stageCandidates.length}
                  </span>
                </div>

                {/* Candidate Cards */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {stageCandidates.map((cand) => (
                    <div
                      key={cand.application_id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isDark
                          ? "bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-slate-100"
                          : "bg-white border-slate-200 hover:border-emerald-500/40 text-slate-900 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm leading-snug">{cand.name}</h4>
                          <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {cand.currentRole || "Candidate"}
                          </p>
                        </div>
                        <span className="text-xs font-bold font-mono text-emerald-500 shrink-0">
                          {cand.matchScore}%
                        </span>
                      </div>

                      {cand.matchedSkills && cand.matchedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cand.matchedSkills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-medium"
                            >
                              {s}
                            </span>
                          ))}
                          {cand.matchedSkills.length > 3 && (
                            <span className="text-[9px] text-slate-400 self-center">
                              +{cand.matchedSkills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stage Progression Buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px]">
                        {col.key !== "under_review" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStage(cand, "under_review");
                            }}
                            className="text-amber-400 hover:underline"
                          >
                            → Review
                          </button>
                        )}
                        {col.key !== "shortlisted" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStage(cand, "shortlisted");
                            }}
                            className="text-emerald-400 font-semibold hover:underline"
                          >
                            ✓ Shortlist
                          </button>
                        )}
                        {col.key !== "rejected" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStage(cand, "rejected");
                            }}
                            className="text-slate-400 hover:text-rose-400 hover:underline"
                          >
                            ✕ Archive
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Detail Modal with Notes */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`relative w-full max-w-lg rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold">{selectedCandidate.name}</h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {selectedCandidate.currentRole || "Candidate"} • Deterministic Match:{" "}
                  <span className="text-emerald-400 font-bold font-mono">{selectedCandidate.matchScore}%</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Quick Status Changers */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Application Status:</span>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => moveStage(selectedCandidate, s.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedCandidate.status === s.key
                        ? "bg-[#059669] text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Recruiter Notes Section */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <span className="text-xs font-semibold text-slate-300 block">Recruiter Audit Notes:</span>
              {selectedCandidate.recruiterNotes ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line">
                  {selectedCandidate.recruiterNotes}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No notes added yet for this applicant.</p>
              )}

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add evaluation note..."
                  className="flex-1 text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={savingNote || !noteInput.trim()}
                  onClick={() => handleAddNote(selectedCandidate)}
                  className="px-4 py-2 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
                >
                  {savingNote ? "Saving..." : "Add Note"}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
