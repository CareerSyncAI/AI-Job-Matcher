"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  BookOpen, 
  TrendingUp, 
  Plus, 
  Layers, 
  Compass, 
  ExternalLink,
  Zap,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  SpotlightCard, 
  InteractiveScoreGauge, 
  LiquidButton,
  ShimmerButton 
} from "@/components/motion/MotionPrimitives";
import { simulateSkillAddition } from "@/lib/services/matchingEngine";

interface TargetRoleConfig {
  id: string;
  title: string;
  department: string;
  baseSalary: string;
  marketDemand: "High" | "Extremely High" | "Surging";
  requiredSkills: string[];
  transferableSkills: { name: string; mapsTo: string }[];
  missingSkills: { name: string; difficulty: "Easy" | "Medium" | "Advanced"; estimatedWeeks: number }[];
}

export default function SkillGapPage() {
  const { profile, updateProfile } = useApplicant();
  const { success, info } = useToast();

  const targetRoles: TargetRoleConfig[] = [
    {
      id: "role-1",
      title: "Principal AI Systems Architect",
      department: "AI & Distributed Compute",
      baseSalary: "$220,000 - $280,000",
      marketDemand: "Surging",
      requiredSkills: ["PyTorch", "CUDA Optimization", "Distributed Vector Search", "Kubernetes", "FastAPI"],
      transferableSkills: [
        { name: "PostgreSQL", mapsTo: "Vector DB (pgvector / Milvus)" },
        { name: "React / Next.js", mapsTo: "Full-Stack AI Interface Architecture" }
      ],
      missingSkills: [
        { name: "CUDA Kernel Optimization", difficulty: "Advanced", estimatedWeeks: 3 },
        { name: "Triton Inference Server", difficulty: "Medium", estimatedWeeks: 2 },
        { name: "Distributed Ray Clusters", difficulty: "Medium", estimatedWeeks: 2 }
      ]
    },
    {
      id: "role-2",
      title: "Staff Distributed Backend Lead",
      department: "Core Cloud Infrastructure",
      baseSalary: "$200,000 - $260,000",
      marketDemand: "Extremely High",
      requiredSkills: ["Go", "Distributed Consensus (Raft)", "gRPC", "Kubernetes", "Kafka"],
      transferableSkills: [
        { name: "Node.js Microservices", mapsTo: "Go High-Throughput Services" },
        { name: "Redis Caching", mapsTo: "Distributed Memory Fabrics" }
      ],
      missingSkills: [
        { name: "Raft / Paxos Consensus", difficulty: "Advanced", estimatedWeeks: 4 },
        { name: "eBPF Kernel Tracing", difficulty: "Advanced", estimatedWeeks: 3 }
      ]
    },
    {
      id: "role-3",
      title: "Lead Full-Stack Product Architect",
      department: "Product Engineering",
      baseSalary: "$185,000 - $240,000",
      marketDemand: "High",
      requiredSkills: ["Next.js App Router", "TypeScript", "Tailwind CSS", "GraphQL", "Edge Compute"],
      transferableSkills: [
        { name: "Express.js", mapsTo: "Next.js Server Actions & Edge Middleware" },
        { name: "REST APIs", mapsTo: "GraphQL & tRPC Schema Design" }
      ],
      missingSkills: [
        { name: "Cloudflare Edge Workers", difficulty: "Easy", estimatedWeeks: 1 },
        { name: "WebAssembly (WASM)", difficulty: "Medium", estimatedWeeks: 2 }
      ]
    }
  ];

  const [selectedRoleId, setSelectedRoleId] = useState<string>("role-1");
  const activeRole = targetRoles.find((r) => r.id === selectedRoleId) || targetRoles[0];

  const [simulatedSkills, setSimulatedSkills] = useState<string[]>([]);
  const [matchScore, setMatchScore] = useState<number>(76);

  const handleSimulateSkill = (skillName: string) => {
    if (simulatedSkills.includes(skillName)) return;

    const result = simulateSkillAddition(
      matchScore,
      activeRole.requiredSkills,
      profile?.skills || [],
      skillName
    );

    setSimulatedSkills((prev) => [...prev, skillName]);
    setMatchScore(result.updatedScore);
    success(
      `Skill Added: ${skillName}`,
      `Simulated Match Score increased by +${result.gainedPoints}%! Total Fit: ${result.updatedScore}%`
    );
  };

  const handleSaveToProfile = async () => {
    if (simulatedSkills.length === 0) return;
    try {
      const updatedList = Array.from(new Set([...(profile?.skills || []), ...simulatedSkills]));
      await updateProfile({ skills: updatedList });
      success("Profile Synchronized", `${simulatedSkills.length} new skills permanently added to your profile!`);
      setSimulatedSkills([]);
    } catch {
      info("Error", "Could not synchronize skills.");
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aperture-500/15 text-aperture-500 text-xs font-mono border border-aperture-500/30">
            <Target className="w-3.5 h-3.5" />
            <span>AI Career Optimizer</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
            Target Role & Skill Gap Matrix
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Select a target trajectory to simulate algorithmic compatibility and bridge required competencies.
          </p>
        </div>

        {simulatedSkills.length > 0 && (
          <LiquidButton variant="cyber" onClick={handleSaveToProfile} className="shrink-0">
            <Zap className="w-4 h-4 mr-1.5" />
            Commit {simulatedSkills.length} Skills to Resume
          </LiquidButton>
        )}
      </div>

      {/* Target Role Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {targetRoles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          return (
            <button
              key={role.id}
              onClick={() => {
                setSelectedRoleId(role.id);
                setSimulatedSkills([]);
                setMatchScore(role.id === "role-1" ? 76 : role.id === "role-2" ? 82 : 91);
              }}
              className={`text-left p-5 rounded-2xl glass-card border transition-all duration-200 ${
                isSelected
                  ? "border-aperture-500 bg-aperture-500/15 shadow-glass-lg"
                  : "border-ink-border hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
                <span className="font-mono">{role.department}</span>
                <span className="font-mono text-success">{role.marketDemand} Demand</span>
              </div>
              <h3 className="font-display font-bold text-base text-text-primary mb-1">{role.title}</h3>
              <p className="font-mono text-xs text-text-secondary">{role.baseSalary}</p>
            </button>
          );
        })}
      </div>

      {/* Trajectory Simulation Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Skill Breakdown & Bridge Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Critical Missing Skills Section */}
          <SpotlightCard className="p-6 space-y-5 border-amber-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-ink-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="font-display text-base font-bold text-text-primary">
                  Identified Skill Gaps for {activeRole.title}
                </h3>
              </div>
              <span className="text-xs text-text-tertiary font-mono">
                Click + to simulate closure
              </span>
            </div>

            <div className="space-y-3">
              {activeRole.missingSkills.map((skill) => {
                const isAdded = simulatedSkills.includes(skill.name);
                return (
                  <div
                    key={skill.name}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isAdded 
                        ? "bg-success/10 border-success/30" 
                        : "bg-white/5 border-ink-border hover:border-white/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text-primary">{skill.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-text-tertiary border border-ink-border">
                          {skill.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Estimated effort: ~{skill.estimatedWeeks} weeks to production readiness.
                      </p>
                    </div>

                    <button
                      onClick={() => handleSimulateSkill(skill.name)}
                      disabled={isAdded}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        isAdded
                          ? "bg-success text-white cursor-default"
                          : "glass-card border border-ink-border hover:border-signal-500 hover:text-signal-500 text-text-primary"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Added (+8%)
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Bridge Skill
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </SpotlightCard>

          {/* Transferable Skills Detected */}
          <SpotlightCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-ink-border">
              <Layers className="w-4 h-4 text-signal-500" />
              <h3 className="font-display text-base font-bold text-text-primary">
                Semantic Transferable Skills Detected
              </h3>
            </div>
            <p className="text-xs text-text-secondary">
              CareerSync AI identified that your existing proficiency maps directly to this role&apos;s architecture:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {activeRole.transferableSkills.map((t, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-ink-border space-y-1">
                  <div className="text-xs font-mono text-text-tertiary">Your experience:</div>
                  <div className="text-xs font-bold text-text-primary">{t.name}</div>
                  <div className="text-xs text-signal-500 flex items-center gap-1 font-mono pt-1">
                    &rarr; Maps to {t.mapsTo}
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>

          {/* Curated Learning Roadmap */}
          <SpotlightCard className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-aperture-500" />
                <h3 className="font-display text-base font-bold text-text-primary">
                  Fast-Track Learning Path
                </h3>
              </div>
              <span className="text-xs font-mono text-text-tertiary">Curated by AI</span>
            </div>

            <div className="space-y-3">
              {[
                { title: "DeepLearning.AI: Distributed GPU Computing & Triton", duration: "12 Hours", url: "#" },
                { title: "Building Production Vector Databases with pgvector", duration: "8 Hours", url: "#" },
                { title: "Kubernetes Operator Architecture for AI Workloads", duration: "16 Hours", url: "#" }
              ].map((res, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-ink-border flex items-center justify-between hover:border-aperture-500/30 transition-colors">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-text-primary">{res.title}</h4>
                    <p className="text-[11px] text-text-secondary font-mono">{res.duration} of coursework & lab</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-tertiary hover:text-aperture-500 cursor-pointer transition-colors" />
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>

        {/* Right Column (1 Col): Live Score Gauge & Action Widget */}
        <div className="space-y-6">
          <SpotlightCard className="p-6 text-center space-y-6 border border-ink-border sticky top-24">
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                Projected Compatibility
              </span>
              <h3 className="font-display text-lg font-bold text-text-primary">
                {activeRole.title}
              </h3>
            </div>

            {/* Circular Gauge */}
            <div className="flex justify-center py-2">
              <InteractiveScoreGauge score={matchScore} size={130} strokeWidth={10} />
            </div>

            {/* Score Delta Badge */}
            {simulatedSkills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl bg-success/15 border border-success/30 text-xs text-success font-medium space-y-0.5"
              >
                <div className="font-bold flex items-center justify-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +{matchScore - 76}% Match Score Jump!
                </div>
                <div className="text-[11px] text-text-secondary">
                  Based on {simulatedSkills.length} bridged competency milestones.
                </div>
              </motion.div>
            )}

            <div className="space-y-2 pt-2 border-t border-ink-border text-left text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-secondary">Core Skills Fit:</span>
                <span className="font-mono text-text-primary font-bold">{matchScore >= 85 ? "Strong" : "Moderate"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-secondary">Experience Alignment:</span>
                <span className="font-mono text-text-primary font-bold">4.5 Years</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Salary Bracket:</span>
                <span className="font-mono text-success font-bold">{activeRole.baseSalary.split("-")[0]}</span>
              </div>
            </div>

            <Link href="/app/jobs" className="block pt-2">
              <ShimmerButton className="w-full text-xs">
                Browse Matching Jobs Now &rarr;
              </ShimmerButton>
            </Link>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
