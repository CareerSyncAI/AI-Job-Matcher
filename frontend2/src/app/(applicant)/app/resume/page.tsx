"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Download, 
  Eye, 
  Star,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  SpotlightCard, 
  LiquidButton, 
  ShimmerButton 
} from "@/components/motion/MotionPrimitives";

export default function ResumeVaultPage() {
  const { profile, uploadResume, setPrimaryResume, deleteResume } = useApplicant();
  const { success, info, ai } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("res-1");

  // Simulated parsed entity details
  const parsedEntities = {
    name: "Dhruv Gajera",
    headline: "Senior AI & Distributed Systems Engineer",
    experienceYears: 4.5,
    extractedSkills: [
      { name: "PyTorch", confidence: "99%", category: "AI & ML" },
      { name: "Distributed Systems", confidence: "96%", category: "Infrastructure" },
      { name: "Next.js 15 App Router", confidence: "98%", category: "Frontend Architecture" },
      { name: "FastAPI / Python", confidence: "95%", category: "Backend" },
      { name: "Kubernetes / Docker", confidence: "91%", category: "Cloud" },
      { name: "pgvector / Vector Search", confidence: "94%", category: "Database" },
      { name: "TypeScript", confidence: "97%", category: "Languages" },
      { name: "Tailwind CSS", confidence: "95%", category: "UI & Motion" }
    ],
    education: "B.Tech in Computer Engineering & AI (GPA: 3.9/4.0)"
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    ai("AI Engine Active", "Starting 4-stage document extraction pipeline...");

    try {
      await uploadResume(file, (progress, stage) => {
        setUploadProgress(progress);
        setUploadStage(stage);
      });
      success("Resume Parsed Successfully", "Document embedded into 768-dim vector space and indexed.");
    } catch {
      info("Upload Failed", "Please check the file format and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aperture-500/15 text-aperture-500 text-xs font-mono border border-aperture-500/30">
            <Cpu className="w-3.5 h-3.5" />
            <span>Deep Semantic Parser</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
            Resume Intelligence Vault
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Upload PDF/DOCX documents to execute deterministic OCR, entity extraction, and vector embedding.
          </p>
        </div>
      </div>

      {/* Upload Dropzone & Live 4-Stage Progress */}
      <SpotlightCard className="p-8 border-dashed border-2 border-ink-border hover:border-aperture-500/50 transition-colors">
        {isUploading ? (
          <div className="space-y-6 py-4 max-w-lg mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-aperture-500/20 text-aperture-500 flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-text-primary">
                Processing Document Intelligence
              </h3>
              <p className="text-xs text-text-secondary font-mono">
                {uploadStage || "Executing optical character recognition..."}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-signal-500 to-aperture-500 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-xs font-mono text-text-tertiary">{uploadProgress}% Complete</div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer space-y-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-ink-border flex items-center justify-center text-text-secondary group-hover:text-aperture-500 group-hover:scale-110 transition-all">
              <Upload className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <p className="font-display font-bold text-base text-text-primary">
                Drop your updated resume here, or <span className="text-aperture-500 underline">browse files</span>
              </p>
              <p className="text-xs text-text-secondary">
                Supports PDF, DOCX (Max 10MB). Automatically de-identified for zero bias compliance.
              </p>
            </div>

            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </SpotlightCard>

      {/* Main Grid: Saved Versions & Parsed Entity Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (1 Col): Resume Versions */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-signal-500" />
            <span>Indexed Document Versions</span>
          </h2>

          <div className="space-y-3">
            {[
              { id: "res-1", name: "Dhruv_Gajera_Resume_v2.4.pdf", date: "Uploaded Today", isPrimary: true },
              { id: "res-2", name: "Dhruv_Gajera_FullStack_v1.2.pdf", date: "Uploaded 2w ago", isPrimary: false }
            ].map((res) => {
              const isSelected = selectedResumeId === res.id;
              return (
                <SpotlightCard
                  key={res.id}
                  onClick={() => setSelectedResumeId(res.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? "border-aperture-500 bg-aperture-500/10 shadow-glass-sm" : "border-ink-border hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-text-primary truncate">{res.name}</p>
                        {res.isPrimary && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-success/20 text-success border border-success/30 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-tertiary font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {res.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!res.isPrimary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryResume(res.id);
                            success("Primary Updated", "Active resume version updated.");
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                          title="Set as active primary"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteResume(res.id);
                          info("Resume Removed", "Version archived from index.");
                        }}
                        className="p-1.5 rounded-lg hover:bg-danger/20 text-text-tertiary hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 Cols): Parsed Entities & Vector Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <SpotlightCard className="p-6 space-y-6 border border-ink-border">
            <div className="flex items-center justify-between pb-3 border-b border-ink-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-aperture-500" />
                <h3 className="font-display text-base font-bold text-text-primary">
                  Structured AI Extraction Inspector
                </h3>
              </div>
              <span className="text-xs font-mono text-success flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 768-dim Vector Generated
              </span>
            </div>

            {/* Profile Extraction Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white/5 border border-ink-border space-y-1">
                <span className="text-[11px] font-mono text-text-tertiary uppercase">Candidate Title</span>
                <div className="text-xs font-bold text-text-primary">{parsedEntities.headline}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-ink-border space-y-1">
                <span className="text-[11px] font-mono text-text-tertiary uppercase">Experience & Education</span>
                <div className="text-xs font-bold text-text-primary">{parsedEntities.experienceYears} Years &bull; B.Tech AI</div>
              </div>
            </div>

            {/* Extracted Skills List with Confidence Scores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">Extracted Competency Vectors ({parsedEntities.extractedSkills.length})</span>
                <span className="text-text-tertiary font-mono">Confidence Threshold &ge; 90%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {parsedEntities.extractedSkills.map((skill) => (
                  <div
                    key={skill.name}
                    className="p-2.5 rounded-xl bg-white/5 border border-ink-border flex items-center justify-between hover:border-white/20 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-text-primary">{skill.name}</div>
                      <div className="text-[10px] font-mono text-text-tertiary">{skill.category}</div>
                    </div>
                    <span className="text-xs font-mono text-signal-500 font-bold px-2 py-0.5 rounded bg-signal-500/10 border border-signal-500/20">
                      {skill.confidence}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
