"use client";

import React, { use, useState, useEffect } from "react";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { ArrowLeft, Check, UserX, FileText, MessageSquare, HelpCircle, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { EvidenceType } from "@/types";

export default function CandidateInspectorPage({
  params
}: {
  params: Promise<{ jobId: string; candidateId: string }>;
}) {
  const { jobId, candidateId } = use(params);
  const { 
    currentJob, 
    candidates, 
    updateCandidateStatus, 
    updateCandidateNotes,
    isLoading 
  } = useRecruiter();

  const [notesText, setNotesText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Retrieve candidate
  const candidate = candidates.find((c) => c.id === candidateId);

  // Sync state notes when candidate loads
  useEffect(() => {
    if (candidate) {
      const notes = candidate.recruiterNotes || "";
      const timer = setTimeout(() => {
        setNotesText(notes);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [candidateId, candidate]);

  if (isLoading || !currentJob) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Inspector...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="space-y-4 p-6 text-center">
        <p className="text-sm text-text-secondary">Candidate not found.</p>
        <Link href={`/recruiter/jobs/${jobId}`} className="text-xs text-signal-500 font-semibold underline">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await updateCandidateNotes(candidate.id, notesText);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getEvidenceBadge = (type: EvidenceType) => {
    switch (type) {
      case "matched":
        return {
          label: "Matched",
          classes: "bg-success/10 text-success border-success/20",
          icon: CheckCircle
        };
      case "transferable":
        return {
          label: "Transferable Skill",
          classes: "bg-signal-500/10 text-signal-500 border-signal-500/20",
          icon: HelpCircle
        };
      case "not_detected":
        return {
          label: "Not Detected",
          classes: "bg-ink-border text-text-secondary border-ink-border",
          icon: EyeOff
        };
      case "not_provided":
        return {
          label: "Not Mentioned",
          classes: "bg-ink-border/55 text-text-tertiary border-ink-border/30",
          icon: HelpCircle
        };
      case "gap":
        return {
          label: "Constraint Gap",
          classes: "bg-danger/10 text-danger border-danger/20",
          icon: AlertTriangle
        };
    }
  };

  const EyeOff = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
    </svg>
  );

  // Group evidence into Pros and Cons for Decision Snapshot
  const pros = candidate.evidence.filter((e) => e.type === "matched" || e.type === "transferable");
  const cons = candidate.evidence.filter((e) => e.type === "gap");
  const missing = candidate.evidence.filter((e) => e.type === "not_detected" || e.type === "not_provided");

  return (
    <div className="space-y-6">
      {/* Back navigation & Quick status header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/recruiter/jobs/${jobId}`}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Candidate Leaderboard
        </Link>

        {/* Quick status actions */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-tertiary font-semibold uppercase mr-1">
            Current Status: {candidate.status === "screened" ? "Awaiting Review" : candidate.status}
          </span>
          {candidate.status !== "shortlisted" && (
            <button
              onClick={() => updateCandidateStatus(candidate.id, "shortlisted")}
              className="flex items-center gap-1 px-2.5 py-1 bg-success hover:bg-success/90 text-ink-base font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Shortlist
            </button>
          )}
          {candidate.status !== "rejected" && (
            <button
              onClick={() => updateCandidateStatus(candidate.id, "rejected")}
              className="flex items-center gap-1 px-2.5 py-1 bg-ink-border hover:bg-ink-border/80 text-text-primary font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5" />
              Reject
            </button>
          )}
          {candidate.status !== "interviewing" && candidate.status !== "rejected" && (
            <button
              onClick={() => updateCandidateStatus(candidate.id, "interviewing")}
              className="flex items-center gap-1 px-2.5 py-1 bg-signal-500 hover:bg-signal-600 text-ink-base font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              Interview
            </button>
          )}
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* LEFT COLUMN: Candidate Overview & Decisions */}
        <div className="space-y-6">
          {/* Candidate Card */}
          <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-text-primary">{candidate.name}</h2>
              <p className="text-xs text-text-secondary">{candidate.currentRole || "Software Professional"}</p>
              <p className="text-[11px] text-text-tertiary">{candidate.location || "Location Unknown"}</p>
            </div>

            {/* Overall Score Circle */}
            <div className="flex items-center justify-between border-t border-b border-ink-border py-4">
              <div>
                <p className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider">
                  NLP Proximity Match
                </p>
                <p className="text-[11px] text-text-secondary mt-1 max-w-[120px] leading-tight">
                  Semantic match score against job specifications.
                </p>
              </div>

              <div className="relative w-16 h-16 flex items-center justify-center border-4 border-signal-500/20 rounded-full">
                <div className="absolute inset-0 border-4 border-signal-500 rounded-full clip-half" />
                <span className="font-mono text-base font-bold text-signal-500">
                  {candidate.matchScore}%
                </span>
              </div>
            </div>

            {/* Score Breakdown list */}
            <div className="space-y-2.5 text-xs">
              <h3 className="font-semibold text-text-tertiary uppercase tracking-wider text-[11px]">
                Score Components
              </h3>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Skill Match Score:</span>
                  <span className="font-semibold text-text-primary">{candidate.skillScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Experience Fit:</span>
                  <span className="font-semibold text-text-primary">{candidate.experienceScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Education Score:</span>
                  <span className="font-semibold text-text-primary">{candidate.educationScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Semantic Score:</span>
                  <span className="font-semibold text-text-primary">{candidate.semanticScore}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Snapshot (Pros/Cons) */}
          <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-4">
            <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
              Decision Snapshot
            </h3>

            <div className="space-y-3 text-xs">
              {/* Pros */}
              <div className="space-y-1">
                <p className="font-semibold text-success flex items-center gap-1">
                  Why Ranked Here? ({pros.length})
                </p>
                {pros.length === 0 ? (
                  <p className="text-text-tertiary italic pl-4">No verified match criteria</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-text-secondary font-sans">
                    {pros.slice(0, 3).map((p, idx) => (
                      <li key={idx}>
                        <span className="font-semibold text-text-primary">{p.requirement.replace(" requirement", "")}</span>: {p.claim}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Cons */}
              <div className="space-y-1 pt-2 border-t border-ink-border/50">
                <p className="font-semibold text-danger flex items-center gap-1">
                  Why Not Higher? ({cons.length + missing.filter(m => m.type === 'not_detected').length})
                </p>
                {cons.length === 0 && missing.filter(m => m.type === 'not_detected').length === 0 ? (
                  <p className="text-success italic pl-4">No significant matching gaps</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-text-secondary font-sans">
                    {cons.map((c, idx) => (
                      <li key={idx} className="text-danger/90">
                        <span className="font-semibold text-text-primary">{c.requirement.replace(" requirement", "")}</span>: Direct gap detected ({c.details || c.claim})
                      </li>
                    ))}
                    {missing.filter(m => m.type === 'not_detected').slice(0, 2).map((m, idx) => (
                      <li key={idx}>
                        <span className="font-semibold text-text-primary">{m.requirement.replace(" requirement", "")}</span>: Missing explicit evidence
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Recruiter Notes Block */}
          <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
                Recruiter Notes
              </h3>
              <MessageSquare className="w-4 h-4 text-text-tertiary" />
            </div>

            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add evaluation comments, follow-up screening questions, or team consensus..."
              className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs font-sans focus:outline-none"
            />

            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="w-full py-1.5 bg-ink-border hover:bg-ink-border/80 border border-ink-border text-text-primary font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Evidence Vault (Claim -> Evidence mapping) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-b border-ink-border pb-2 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Evidential Audits
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Claims extracted from candidates&apos; resumes cross-referenced against requirements.
              </p>
            </div>
            <span className="text-xs text-text-tertiary font-mono">
              {candidate.evidence.length} audited items
            </span>
          </div>

          {/* Evidence Cards Stack */}
          <div className="space-y-3">
            {candidate.evidence.map((item, idx) => {
              const badge = getEvidenceBadge(item.type);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={idx}
                  className="bg-ink-surface border border-ink-border rounded p-4 space-y-3 relative overflow-hidden"
                >
                  {/* Item requirement name and match status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary">
                        {item.requirement}
                      </h4>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider shrink-0 ${badge.classes}`}
                    >
                      <BadgeIcon className="w-3 h-3 stroke-[2.5px]" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Claim Text */}
                  <div className="text-xs bg-ink-base/40 border border-ink-border/60 p-3 rounded space-y-2">
                    <div>
                      <span className="text-[9.5px] font-semibold text-text-tertiary uppercase tracking-wider block">
                        Claim Statement
                      </span>
                      <p className="text-text-primary italic mt-0.5 font-sans leading-relaxed">
                        &quot;{item.claim}&quot;
                      </p>
                    </div>

                    {/* Source citation */}
                    {item.sourceText && (
                      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary border-t border-ink-border/40 pt-2 mt-2">
                        <FileText className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>Source: {item.sourceText}</span>
                      </div>
                    )}

                    {/* Gap / Details description */}
                    {item.details && (
                      <div className="text-[11px] border-t border-ink-border/40 pt-2 mt-2 space-y-1">
                        <span className="font-semibold text-text-secondary uppercase text-[8.5px] tracking-wider block">
                          AI Reasoning / Annotations
                        </span>
                        <p className="text-text-secondary font-sans leading-relaxed">
                          {item.details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
