"use client";

import React from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { Briefcase, Clock, ChevronRight, Eye, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ApplicationsPage() {
  const { applications, isLoading: applicantLoading } = useApplicantContext();
  const { jobs, isLoading: jobsLoading } = useRecruiter();

  if (applicantLoading || jobsLoading) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Tracker...</p>
      </div>
    );
  }

  const getStatusStageNumber = (status: string) => {
    switch (status) {
      case "applied": return 1;
      case "screened": return 2;
      case "shortlisted": return 3;
      case "interviewing": return 4;
      case "offered": return 5;
      default: return 1;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-aperture-500/10 text-aperture-500 border border-aperture-500/20";
      case "screened":
        return "bg-warning/10 text-warning border border-warning/20";
      case "shortlisted":
      case "offered":
        return "bg-success/10 text-success border border-success/20";
      case "interviewing":
        return "bg-signal-500/10 text-signal-500 border border-signal-500/20";
      default:
        return "bg-ink-border text-text-secondary border border-ink-border";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-ink-border pb-4">
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Application Tracker
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Monitor your active applications through the recruitment pipeline stages.
        </p>
      </div>

      {/* Applications list */}
      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="p-12 bg-ink-surface border border-ink-border rounded text-center text-text-secondary text-xs">
            <Briefcase className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="font-semibold text-text-primary">No active applications</p>
            <p className="text-text-tertiary mt-1">Submit your matching credentials to open job listings to start tracking.</p>
            <Link href="/app/jobs" className="mt-4 inline-block px-3 py-1.5 bg-aperture-500 hover:bg-aperture-600 text-ink-base font-semibold rounded transition-colors">
              Explore Openings
            </Link>
          </div>
        ) : (
          applications.map((app) => {
            const job = jobs.find((j) => j.id === app.jobId);
            const currentStage = getStatusStageNumber(app.status);
            const maxStages = 5;

            return (
              <div
                key={app.id}
                className="bg-ink-surface border border-ink-border rounded p-5 space-y-4"
              >
                {/* Header card details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-text-primary">
                      {job ? job.title : "Unknown Requisition"}
                    </h3>
                    <p className="text-[10px] text-text-tertiary font-semibold uppercase mt-0.5">
                      {job ? job.department : "Engineering"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider capitalize",
                        getStatusColor(app.status)
                      )}
                    >
                      {app.status === "screened" ? "Reviewed" : app.status}
                    </span>
                    
                    <Link
                      href={`/app/applications/${app.id}`}
                      className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      Track Timeline
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Progress bar pipeline visual */}
                {app.status !== "rejected" && (
                  <div className="space-y-2 pt-2 border-t border-ink-border/50">
                    <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                      <span className={cn(currentStage >= 1 && "text-aperture-500")}>Applied</span>
                      <span className={cn(currentStage >= 2 && "text-warning")}>Reviewed</span>
                      <span className={cn(currentStage >= 3 && "text-success")}>Shortlisted</span>
                      <span className={cn(currentStage >= 4 && "text-signal-500")}>Interview</span>
                      <span className={cn(currentStage >= 5 && "text-success font-bold")}>Offer</span>
                    </div>
                    {/* Visual bar slider */}
                    <div className="w-full bg-ink-base h-2 rounded-full overflow-hidden flex gap-0.5">
                      {Array.from({ length: maxStages }).map((_, idx) => {
                        const stageIdx = idx + 1;
                        let color = "bg-ink-border";
                        if (stageIdx <= currentStage) {
                          if (app.status === "shortlisted" || app.status === "offered") color = "bg-success";
                          else if (app.status === "interviewing") color = "bg-signal-500";
                          else if (app.status === "screened") color = "bg-warning";
                          else color = "bg-aperture-500";
                        }
                        return (
                          <div key={idx} className={cn("flex-1 h-full rounded-sm", color)} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Date stamp */}
                <div className="text-[10px] text-text-tertiary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted: {new Date(app.appliedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
