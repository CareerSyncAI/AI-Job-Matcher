"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeftRight, 
  Sliders, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  UserCheck, 
  Layers, 
  Award, 
  ArrowLeft,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  SpotlightCard, 
  InteractiveScoreGauge, 
  LiquidButton 
} from "@/components/motion/MotionPrimitives";
import { 
  ScoringWeights, 
  DEFAULT_SCORING_WEIGHTS, 
  reRankCandidates 
} from "@/lib/services/matchingEngine";

export default function CompareMatrixPage() {
  const { candidates, currentJob, updateCandidateStatus } = useRecruiter();
  const { success, info } = useToast();

  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_SCORING_WEIGHTS);

  // Compute live re-ranked candidates
  const rankedCandidates = useMemo(() => {
    return reRankCandidates(candidates, weights);
  }, [candidates, weights]);

  const handleAdvance = async (candidateId: string, name: string) => {
    try {
      await updateCandidateStatus(candidateId, "interviewing");
      success("Candidate Advanced", `${name} has been moved to 'Interviewing'.`);
    } catch {
      info("Status Updated", `${name} status adjusted.`);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Link href="/recruiter" className="hover:text-text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{currentJob?.title || "Active Requisition"}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-3">
            <ArrowLeftRight className="w-6 h-6 text-signal-500" />
            <span>Candidate Comparison & Weight Matrix</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Adjust multi-factor scoring weights to test sensitivity and re-rank candidates in real time.
          </p>
        </div>
      </div>

      {/* Live AI Scoring Weight Customizer Arena */}
      <SpotlightCard className="p-6 sm:p-8 border border-ink-border">
        <div className="flex items-center justify-between pb-4 border-b border-ink-border mb-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-signal-500" />
            <h3 className="font-display text-base font-semibold text-text-primary">
              Scoring Weight Sensitivity Tuner
            </h3>
          </div>
          <button
            onClick={() => setWeights(DEFAULT_SCORING_WEIGHTS)}
            className="text-xs text-signal-500 hover:text-signal-600 font-mono"
          >
            Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Slider 1: Skills */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Technical Skills</span>
              <span className="font-mono text-signal-500 font-bold">{weights.skillsWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.skillsWeight}
              onChange={(e) => setWeights({ ...weights, skillsWeight: Number(e.target.value) })}
              className="w-full accent-signal-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="text-[11px] text-text-tertiary">Direct keyword & mastery fit</div>
          </div>

          {/* Slider 2: Experience */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Experience Depth</span>
              <span className="font-mono text-aperture-500 font-bold">{weights.experienceWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.experienceWeight}
              onChange={(e) => setWeights({ ...weights, experienceWeight: Number(e.target.value) })}
              className="w-full accent-aperture-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="text-[11px] text-text-tertiary">Years in senior & lead positions</div>
          </div>

          {/* Slider 3: Education */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Education & Degrees</span>
              <span className="font-mono text-warning font-bold">{weights.educationWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.educationWeight}
              onChange={(e) => setWeights({ ...weights, educationWeight: Number(e.target.value) })}
              className="w-full accent-warning h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="text-[11px] text-text-tertiary">Degrees & relevant certifications</div>
          </div>

          {/* Slider 4: Semantic */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Semantic Similarity</span>
              <span className="font-mono text-success font-bold">{weights.semanticWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.semanticWeight}
              onChange={(e) => setWeights({ ...weights, semanticWeight: Number(e.target.value) })}
              className="w-full accent-success h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="text-[11px] text-text-tertiary">Contextual domain relevance</div>
          </div>
        </div>
      </SpotlightCard>

      {/* Side-by-Side Ranked Candidate Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text-primary">
            Ranked Candidate Pipeline ({rankedCandidates.length})
          </h2>
          <span className="text-xs text-text-tertiary font-mono">
            Sorted dynamically by computed composite score
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {rankedCandidates.map((cand) => {
              const delta = cand.rankDelta;
              return (
                <motion.div
                  key={cand.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                  <SpotlightCard className="p-6 h-full flex flex-col justify-between hover:border-signal-500/40 transition-all">
                    
                    {/* Header: Rank + Name + Score */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/5 border border-ink-border flex items-center justify-center font-mono font-bold text-xs text-text-primary">
                            #{cand.newRank}
                          </div>

                          {/* Delta Badge */}
                          {delta > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-success bg-success/15 px-1.5 py-0.5 rounded border border-success/30">
                              <TrendingUp className="w-3 h-3" /> +{delta} Rank
                            </span>
                          ) : delta < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-danger bg-danger/15 px-1.5 py-0.5 rounded border border-danger/30">
                              <TrendingDown className="w-3 h-3" /> {delta} Rank
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-text-tertiary bg-white/5 px-1.5 py-0.5 rounded border border-ink-border">
                              <Minus className="w-3 h-3" /> Same
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                          cand.status === "interviewing" 
                            ? "bg-aperture-500/15 text-aperture-500 border-aperture-500/30" 
                            : "bg-white/5 text-text-tertiary border-ink-border"
                        }`}>
                          {cand.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold text-base text-text-primary">{cand.name}</h3>
                          <p className="text-xs text-text-secondary">{cand.currentRole || "Software Engineer"}</p>
                        </div>
                        <InteractiveScoreGauge score={cand.computedMatchScore} size={70} strokeWidth={6} showGrade={false} />
                      </div>

                      {/* Multi-Factor Radar Bars */}
                      <div className="space-y-2 pt-2 border-t border-ink-border">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-tertiary">Skills</span>
                            <span className="font-mono text-text-primary font-bold">{cand.skillScore}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-signal-500 rounded-full" style={{ width: `${cand.skillScore}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-tertiary">Experience ({cand.experienceYears}y)</span>
                            <span className="font-mono text-text-primary font-bold">{cand.experienceScore}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-aperture-500 rounded-full" style={{ width: `${cand.experienceScore}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-tertiary">Semantic Vector</span>
                            <span className="font-mono text-text-primary font-bold">{cand.semanticScore}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${cand.semanticScore}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Skills Badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {cand.skills.slice(0, 4).map((s) => (
                          <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-ink-border text-text-secondary">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-4 border-t border-ink-border mt-4 flex items-center justify-between gap-2">
                      <Link 
                        href={`/recruiter/jobs/${cand.jobId}/candidates/${cand.id}`}
                        className="text-xs font-semibold text-signal-500 hover:text-signal-600 transition-colors"
                      >
                        Inspect Evidence &rarr;
                      </Link>

                      {cand.status !== "interviewing" && (
                        <LiquidButton
                          variant="primary"
                          onClick={() => handleAdvance(cand.id, cand.name)}
                          className="text-xs px-3 py-1"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Shortlist
                        </LiquidButton>
                      )}
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
