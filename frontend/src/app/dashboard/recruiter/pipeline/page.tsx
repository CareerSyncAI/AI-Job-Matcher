"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api, { getApiErrorMessage } from "@/lib/api";
import { NEXT_APPLICATION_STATUS, normalizeApplicationStatus, type ApplicationStatus } from "@/lib/applicationStatus";
import { useTheme } from "@/lib/theme";
import { Modal } from "@/components/Modal";
import {
  IconLayers,
  IconBriefcase,
  IconUsers,
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
  status: ApplicationStatus | "screened";
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
  { key: "new", title: "Applied", color: "border-slate-500 text-slate-400" },
  { key: "under_review", title: "Reviewed", color: "border-amber-500 text-amber-400" },
  { key: "shortlisted", title: "Shortlisted", color: "border-emerald-500 text-emerald-400" },
  { key: "interviewing", title: "Interviewing", color: "border-sky-500 text-sky-400" },
  { key: "offered", title: "Offered", color: "border-violet-500 text-violet-400" },
  { key: "hired", title: "Hired", color: "border-emerald-500 text-emerald-400" },
  { key: "rejected", title: "Rejected", color: "border-rose-500 text-rose-400" },
] as const;

export default function RecruiterPipelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading pipeline...</div>}>
      <RecruiterPipelineContent />
    </Suspense>
  );
}

function RecruiterPipelineContent() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const requestedJobId = searchParams.get("jobId");

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingApplicationId, setSavingApplicationId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Fetch recruiter's jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/jobs");
        const list: JobSummary[] = Array.isArray(res.data) ? res.data : [];
        setJobs(list);
        if (list.length > 0) {
          const matchRequested = requestedJobId && list.some((j) => j.id === requestedJobId);
          setSelectedJobId(matchRequested ? requestedJobId : list[0].id);
          setFetchError(null);
        } else {
          setCandidates([]);
        }
      } catch (err) {
        console.error("Failed to load recruiter jobs:", err);
        setFetchError("Unable to retrieve job requisitions from the server.");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [requestedJobId]);

  // Fetch candidates for selected job
  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    let isMounted = true;
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/jobs/${selectedJobId}/candidates`);
        if (isMounted) {
          const list: PipelineCandidate[] = Array.isArray(res.data) ? res.data : [];
          setCandidates(list.map((candidate) => ({
            ...candidate,
            status: normalizeApplicationStatus(candidate.status) || candidate.status,
          })));
        }
      } catch (err) {
        console.error("Failed to load pipeline candidates:", err);
        if (isMounted) {
          setCandidates([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchCandidates();

    return () => {
      isMounted = false;
    };
  }, [selectedJobId]);

  const moveStage = async (cand: PipelineCandidate, newStage: PipelineCandidate["status"]) => {
    if (savingApplicationId) return;
    setSavingApplicationId(cand.application_id);
    setStatusError(null);
    try {
      const response = await api.patch(`/applications/${cand.application_id}/status`, {
        status: newStage,
      });
      const updatedStatus = response.data?.status || newStage;
      setCandidates((prev) =>
        prev.map((c) =>
          c.application_id === cand.application_id ? { ...c, status: updatedStatus } : c
        )
      );
      if (selectedCandidate?.application_id === cand.application_id) {
        setSelectedCandidate({ ...selectedCandidate, status: updatedStatus });
      }
    } catch (err) {
      console.error("Failed to update candidate pipeline stage:", err);
      setStatusError(getApiErrorMessage(err, "The application status could not be updated. Refresh and try again."));
    } finally {
      setSavingApplicationId(null);
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
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setCandidates([]);
                }}
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
      ) : fetchError ? (
        <div className={`p-16 text-center rounded-2xl border ${isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
          <IconUsers size={36} className="mx-auto text-rose-400 mb-3" />
          <h3 className="text-base font-semibold">Failed to Load Pipeline</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            {fetchError}
          </p>
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
        <>
        {statusError && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {statusError}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-5 overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const stageCandidates = candidates.filter((c) => {
              const statusNormalized = (c.status || "new").toLowerCase();
              return statusNormalized === col.key || (col.key === "under_review" && statusNormalized === "screened");
            });

            return (
              <div
                key={col.key}
                className={`rounded-2xl border flex flex-col min-h-[500px] ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                {/* Column Header */}
                <div className={`p-4 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.color.split(" ")[0]}`} />
                    <h3 className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{col.title}</h3>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-800"}`}>
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
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {cand.currentRole || "Candidate"}
                          </p>
                        </div>
                        <span className={`text-sm font-bold font-mono shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                          {cand.matchScore}%
                        </span>
                      </div>

                      {cand.matchedSkills && cand.matchedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cand.matchedSkills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                isDark
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                          {cand.matchedSkills.length > 3 && (
                            <span className={`text-xs self-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                              +{cand.matchedSkills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Status changes follow the next valid stage; rejection is available while active. */}
                      <div className={`pt-2 border-t flex items-center justify-between gap-1 text-xs ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
                        {NEXT_APPLICATION_STATUS[cand.status as ApplicationStatus] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStage(cand, NEXT_APPLICATION_STATUS[cand.status as ApplicationStatus]!);
                            }}
                            disabled={savingApplicationId !== null}
                            className={`${isDark ? "text-emerald-400" : "text-emerald-700"} font-semibold hover:underline cursor-pointer disabled:opacity-50`}
                          >
                            {savingApplicationId === cand.application_id ? "Saving…" : `→ ${STAGES.find((stage) => stage.key === NEXT_APPLICATION_STATUS[cand.status as ApplicationStatus])?.title}`}
                          </button>
                        )}
                        {!(["rejected", "hired"] as string[]).includes(cand.status) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStage(cand, "rejected");
                            }}
                            disabled={savingApplicationId !== null}
                            className={`${isDark ? "text-slate-400 hover:text-rose-400" : "text-slate-600 hover:text-rose-700"} hover:underline cursor-pointer disabled:opacity-50`}
                          >
                            ✕ Reject
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
        </>
      )}

      {/* Candidate Detail Modal with Notes */}
      <Modal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title={selectedCandidate?.name}
        description={selectedCandidate ? `${selectedCandidate.currentRole || "Candidate"} • Deterministic Match: ${selectedCandidate.matchScore}%` : undefined}
        maxWidth="max-w-lg"
        className={`max-h-[90vh] overflow-y-auto ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {selectedCandidate && (
          <div className="space-y-5 pt-1">
            {statusError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                <span>{statusError}</span>
                <button
                  type="button"
                  onClick={() => setStatusError(null)}
                  className="text-rose-400 hover:text-rose-200 font-semibold cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}
            {/* Current status and next valid action */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Application Status:</span>
              <p className="text-sm font-semibold">{STAGES.find((stage) => stage.key === selectedCandidate.status)?.title || selectedCandidate.status}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {NEXT_APPLICATION_STATUS[selectedCandidate.status as ApplicationStatus] && (
                  <button
                    type="button"
                    disabled={savingApplicationId !== null}
                    onClick={() => moveStage(selectedCandidate, NEXT_APPLICATION_STATUS[selectedCandidate.status as ApplicationStatus]!)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50"
                  >
                    {savingApplicationId === selectedCandidate.application_id ? "Saving…" : `Advance to ${STAGES.find((stage) => stage.key === NEXT_APPLICATION_STATUS[selectedCandidate.status as ApplicationStatus])?.title}`}
                  </button>
                )}
                {!(["rejected", "hired"] as string[]).includes(selectedCandidate.status) && (
                  <button
                    type="button"
                    disabled={savingApplicationId !== null}
                    onClick={() => moveStage(selectedCandidate, "rejected")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 disabled:opacity-50"
                  >
                    Reject application
                  </button>
                )}
              </div>
            </div>

            {/* Recruiter Notes Section */}
            <div className={`space-y-2 border-t pt-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <span className={`text-xs font-semibold block ${isDark ? "text-slate-300" : "text-slate-700"}`}>Recruiter Audit Notes:</span>
              {selectedCandidate.recruiterNotes ? (
                <div className={`p-3 rounded-xl border text-xs whitespace-pre-line ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
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
                  aria-label="Add recruiter evaluation note"
                  className={`flex-1 text-xs rounded-xl px-3 py-2 border focus:outline-none focus:border-emerald-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                  }`}
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

            <div className={`pt-2 flex justify-end border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
