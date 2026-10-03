"use client";

import React, { useState } from "react";
import { useTheme } from "@/lib/theme";
import {
  IconLayers,
  IconX,
} from "@/components/Icons";

interface PipelineCandidate {
  id: string;
  application_id: string;
  name: string;
  headline: string;
  matchScore: number;
  stage: "NEW" | "SCREENING" | "INTERVIEWING" | "OFFERED" | "HIRED";
  skills: string[];
  applied_at: string;
}

const mockPipelineCandidates: PipelineCandidate[] = [
  {
    id: "c-101",
    application_id: "app-1",
    name: "Alice Vance",
    headline: "Senior Full-Stack Engineer",
    matchScore: 96,
    stage: "INTERVIEWING",
    skills: ["Python", "FastAPI", "React", "Next.js"],
    applied_at: "3 days ago",
  },
  {
    id: "c-102",
    application_id: "app-2",
    name: "Tariq Mansoor",
    headline: "Backend & Distributed Systems Dev",
    matchScore: 92,
    stage: "SCREENING",
    skills: ["Python", "Docker", "PostgreSQL", "Kafka"],
    applied_at: "5 days ago",
  },
  {
    id: "c-103",
    application_id: "app-3",
    name: "Jordan Lee",
    headline: "Software Engineer",
    matchScore: 89,
    stage: "NEW",
    skills: ["TypeScript", "Next.js", "Tailwind CSS"],
    applied_at: "Yesterday",
  },
  {
    id: "c-104",
    application_id: "app-4",
    name: "Samantha Reed",
    headline: "Staff Engineer (ex-Meta)",
    matchScore: 98,
    stage: "OFFERED",
    skills: ["Python", "PyTorch", "Kubernetes", "Architecture"],
    applied_at: "1 week ago",
  },
  {
    id: "c-105",
    application_id: "app-5",
    name: "David Kim",
    headline: "Full-Stack Software Engineer",
    matchScore: 85,
    stage: "NEW",
    skills: ["React", "Node.js", "MongoDB"],
    applied_at: "2 hours ago",
  },
];

const STAGES = [
  { key: "NEW", title: "New Applicants", color: "border-slate-500 text-slate-400" },
  { key: "SCREENING", title: "Screening", color: "border-amber-500 text-amber-400" },
  { key: "INTERVIEWING", title: "Technical Interview", color: "border-purple-500 text-purple-400" },
  { key: "OFFERED", title: "Offer Extended", color: "border-emerald-500 text-emerald-400" },
  { key: "HIRED", title: "Hired", color: "border-teal-500 text-teal-400" },
] as const;

export default function RecruiterPipelinePage() {
  const { isDark } = useTheme();

  const [candidates, setCandidates] = useState<PipelineCandidate[]>(mockPipelineCandidates);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState<Record<string, string[]>>({});

  const moveStage = (candId: string, newStage: PipelineCandidate["stage"]) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candId ? { ...c, stage: newStage } : c))
    );
  };

  const addNote = (candId: string) => {
    if (!noteInput.trim()) return;
    setNotes((prev) => ({
      ...prev,
      [candId]: [...(prev[candId] || []), noteInput.trim()],
    }));
    setNoteInput("");
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
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
              <h1 className="font-display text-2xl font-bold tracking-tight">Applicant Pipeline &amp; ATS Board</h1>
            </div>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Multi-stage recruitment workflow with deterministic vector compatibility scoring.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className={`text-xs font-semibold px-4 py-2.5 rounded-xl border focus:outline-none cursor-pointer ${
                isDark
                  ? "bg-slate-950 border-slate-800 text-slate-200"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <option value="all">All Requisitions (Active)</option>
              <option value="eng-1">Senior Full-Stack Engineer</option>
              <option value="ml-2">Staff Machine Learning Engineer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban ATS Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {STAGES.map((col) => {
          const colCandidates = candidates.filter((c) => c.stage === col.key);
          return (
            <div
              key={col.key}
              className={`p-4 rounded-2xl border flex flex-col min-w-56 ${
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <span className={`text-xs font-bold ${col.color}`}>{col.title}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                  {colCandidates.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {colCandidates.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-500 italic">
                    No candidates in this stage
                  </div>
                ) : (
                  colCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className={`p-3.5 rounded-xl border transition-all space-y-2 cursor-pointer ${
                        isDark
                          ? "bg-slate-950 border-slate-800 hover:border-emerald-500/40 text-slate-100"
                          : "bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-900"
                      }`}
                      onClick={() => setSelectedCandidate(cand)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-xs leading-tight">{cand.name}</p>
                          <p className={`text-[10px] truncate max-w-36 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {cand.headline}
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold font-mono shrink-0">
                          {cand.matchScore}%
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {cand.skills.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Quick stage transition button */}
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                        <span className={isDark ? "text-slate-500" : "text-slate-400"}>{cand.applied_at}</span>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {col.key !== "NEW" && (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = STAGES.findIndex((s) => s.key === col.key);
                                if (idx > 0) moveStage(cand.id, STAGES[idx - 1].key);
                              }}
                              title="Move to previous stage"
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            >
                              ←
                            </button>
                          )}
                          {col.key !== "HIRED" && (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = STAGES.findIndex((s) => s.key === col.key);
                                if (idx < STAGES.length - 1) moveStage(cand.id, STAGES[idx + 1].key);
                              }}
                              title="Advance to next stage"
                              className="px-1.5 py-0.5 rounded bg-[#059669] hover:bg-[#047857] text-white font-bold cursor-pointer"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate Pipeline Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`relative w-full max-w-lg rounded-2xl border p-6 sm:p-7 shadow-2xl space-y-5 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-bold">{selectedCandidate.name}</h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {selectedCandidate.headline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-semibold text-emerald-500">Deterministic Match Score</span>
                <span className="text-base font-bold font-mono text-emerald-500">
                  {selectedCandidate.matchScore}% Compatibility
                </span>
              </div>

              {/* Stage Changer */}
              <div className="space-y-1.5">
                <label className="font-semibold block">Application Stage</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => moveStage(selectedCandidate.id, s.key)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                        selectedCandidate.stage === s.key
                          ? "bg-[#059669] text-white"
                          : isDark
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recruiter Notes */}
              <div className="space-y-2 pt-2">
                <label className="font-semibold block">Hiring Team Notes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNote(selectedCandidate.id)}
                    placeholder="Add interview feedback or screening evaluation..."
                    className={`flex-1 text-xs rounded-xl px-3 py-2 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => addNote(selectedCandidate.id)}
                    className="px-3.5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                  {(notes[selectedCandidate.id] || []).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No notes added yet for this candidate.</p>
                  ) : (
                    (notes[selectedCandidate.id] || []).map((note, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-[11px] ${
                          isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        {note}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
