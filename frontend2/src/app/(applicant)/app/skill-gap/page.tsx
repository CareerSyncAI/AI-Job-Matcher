"use client";

import React, { useEffect, useState } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { CheckCircle2, ShieldCheck, EyeOff, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { EvidenceType } from "@/types";

interface AggregateSkillItem {
  skill: string;
  type: EvidenceType;
  roles: string[];
  recommendation: string;
}

export default function SkillGapPage() {
  const { profile, isLoading: applicantLoading } = useApplicantContext();
  const { jobs, isLoading: jobsLoading } = useRecruiter();
  
  const [skillAnalysis, setSkillAnalysis] = useState<AggregateSkillItem[]>([]);

  useEffect(() => {
    if (profile && jobs.length > 0) {
      // Gather all skills required or preferred across all active jobs
      const allRequiredSkills = Array.from(new Set(jobs.flatMap((j) => j.requiredSkills)));
      
      const analysis: AggregateSkillItem[] = allRequiredSkills.map((skill) => {
        // Find which jobs require this skill
        const roles = jobs
          .filter((j) => j.requiredSkills.includes(skill))
          .map((j) => j.title);

        const hasSkill = profile.skills.includes(skill);

        if (hasSkill) {
          return {
            skill,
            type: "matched" as EvidenceType,
            roles,
            recommendation: "Core match confirmed. Keep this skill prominent in your profile."
          };
        }

        // Check if it's transferable
        let isTransferable = false;
        let recommendation = "";
        if (skill === "Tailwind CSS" && profile.skills.includes("CSS3")) {
          isTransferable = true;
          recommendation = "CSS3 experience maps directly to Tailwind utility syntax. Highlight styling projects.";
        } else if (skill === "Next.js" && profile.skills.includes("React")) {
          isTransferable = true;
          recommendation = "React component experience provides solid foundation. Focus on server rendering concepts.";
        }

        if (isTransferable) {
          return {
            skill,
            type: "transferable" as EvidenceType,
            roles,
            recommendation
          };
        }

        // Default to not detected
        return {
          skill,
          type: "not_detected" as EvidenceType,
          roles,
          recommendation: "CareerSync could not verify this on your resume. Add it to your skills if you possess it."
        };
      });

      const timer = setTimeout(() => {
        setSkillAnalysis(analysis);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile, jobs]);

  if (applicantLoading || jobsLoading || !profile) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Skill Gap Matrix...</p>
      </div>
    );
  }

  const getBadgeMeta = (type: EvidenceType) => {
    switch (type) {
      case "matched":
        return {
          label: "Strong Match",
          classes: "bg-success/10 text-success border-success/20",
          icon: CheckCircle2
        };
      case "transferable":
        return {
          label: "Transferable",
          classes: "bg-aperture-500/10 text-aperture-500 border-aperture-500/20",
          icon: ShieldCheck
        };
      case "not_detected":
        return {
          label: "Not Detected",
          classes: "bg-ink-border text-text-secondary border-ink-border",
          icon: EyeOff
        };
      case "gap":
        return {
          label: "Requirement Gap",
          classes: "bg-danger/10 text-danger border-danger/20",
          icon: AlertTriangle
        };
      default:
        return {
          label: "Not Provided",
          classes: "bg-ink-border/50 text-text-tertiary border-ink-border/30",
          icon: HelpCircle
        };
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="border-b border-ink-border pb-4">
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Evidential Skill Gap Matrix
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          A constructive comparison of your declared capabilities against open job specifications.
        </p>
      </div>

      {/* Constructive definitions banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-ink-surface p-4 border border-ink-border rounded text-[11px] leading-relaxed text-text-secondary">
        <div>
          <span className="font-semibold text-text-primary block mb-1">🔍 NOT DETECTED</span>
          The resume did not contain clear evidence. This simply means CareerSync could not verify it. Add it to your credentials if you possess the experience.
        </div>
        <div>
          <span className="font-semibold text-text-primary block mb-1">⚡ TRANSFERABLE</span>
          Your knowledge of adjacent tools (e.g. React for Next.js, or CSS3 for Tailwind) indicates high learnability capability.
        </div>
        <div>
          <span className="font-semibold text-text-primary block mb-1">🚀 GAP MATCHES</span>
          Missing items are constructive indicators. Build evidence, adjust keywords, or verify certificates to align scores.
        </div>
      </div>

      {/* Matrix list */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider text-[10px]">
          Aggregated Requirement Matrix ({skillAnalysis.length})
        </h3>

        <div className="space-y-3">
          {skillAnalysis.map((item, idx) => {
            const meta = getBadgeMeta(item.type);
            const MetaIcon = meta.icon;

            return (
              <div
                key={idx}
                className="bg-ink-surface border border-ink-border rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-text-primary">
                      {item.skill}
                    </h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${meta.classes}`}>
                      <MetaIcon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                  </div>

                  <p className="text-text-secondary font-sans">
                    Required by: <strong className="text-text-primary">{item.roles.join(", ")}</strong>
                  </p>
                  
                  <p className="text-[10px] text-text-tertiary font-sans leading-normal italic">
                    Recommendation: {item.recommendation}
                  </p>
                </div>

                {item.type === "not_detected" && (
                  <Link
                    href="/app/profile"
                    className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-0.5 shrink-0 self-start md:self-center"
                  >
                    Add to profile
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
