"use client";

import React, { useState, useRef } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { FileText, Upload, CheckCircle2, Trash2, ShieldCheck, Clock, FileCheck } from "lucide-react";
import { ApertureLoader } from "@/components/motion/MotionPrimitives";

interface UploadState {
  progress: number;
  stage: string;
  status: "idle" | "processing" | "success" | "error";
  fileName?: string;
}

export default function ResumePage() {
  const { profile, uploadResume, setPrimaryResume, deleteResume, isLoading } = useApplicantContext();

  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    stage: "",
    status: "idle"
  });

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading || !profile) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Resumes...</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      triggerUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerUpload(e.target.files[0]);
    }
  };

  const triggerUpload = async (file: File) => {
    // Validate PDF and DOCX only
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      alert("Unsupported file format. Please upload PDF or DOCX only.");
      return;
    }

    setUploadState({
      progress: 0,
      stage: "Queued",
      status: "processing",
      fileName: file.name
    });

    try {
      await uploadResume(file, (progress, stage) => {
        setUploadState((prev) => ({ ...prev, progress, stage }));
      });

      setUploadState((prev) => ({
        ...prev,
        progress: 100,
        stage: "Parsing Completed",
        status: "success"
      }));

      setTimeout(() => {
        setUploadState({ progress: 0, stage: "", status: "idle" });
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process document";
      setUploadState((prev) => ({
        ...prev,
        status: "error",
        stage: errorMessage
      }));
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-ink-border pb-4">
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Resume Vault
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Manage multiple resume versions. The primary version is used automatically for scoring matches.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Upload zone */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider text-[10px]">
            Upload Resume
          </h3>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              isDragging
                ? "border-aperture-500 bg-aperture-500/5"
                : "border-ink-border bg-ink-surface hover:border-ink-border/80"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.docx"
              className="hidden"
            />
            <div className="space-y-4">
              <div className="w-10 h-10 rounded bg-aperture-500/10 text-aperture-500 flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-text-primary">
                  Drag and drop your resume file here
                </p>
                <p className="text-[10px] text-text-tertiary">
                  Supports PDF or DOCX up to 5MB.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={triggerBrowse}
                  className="px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-primary text-xs font-semibold rounded cursor-pointer"
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>

          {/* Active processing states */}
          {uploadState.status !== "idle" && (
            <div className="p-4 bg-ink-surface border border-ink-border rounded text-xs space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-text-primary truncate max-w-[150px]">
                  {uploadState.fileName}
                </p>
                {uploadState.status === "processing" && (
                  <ApertureLoader state="processing" size="sm" />
                )}
              </div>

              {uploadState.status === "processing" && (
                <div className="space-y-1.5">
                  <div className="w-full bg-ink-base h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-aperture-500 h-full transition-all duration-300"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9.5px] text-text-tertiary">
                    <span>{uploadState.stage}</span>
                    <span className="font-mono">{uploadState.progress}%</span>
                  </div>
                </div>
              )}

              {uploadState.status === "error" && (
                <p className="text-[10px] text-danger font-semibold">
                  Error: {uploadState.stage}
                </p>
              )}

              {uploadState.status === "success" && (
                <p className="text-[10px] text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resume processed! Skills synced.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Resume list & Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-ink-border pb-2">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Resume Versions ({profile.resumes.length})
            </h2>
          </div>

          {profile.resumes.length === 0 ? (
            <div className="p-8 bg-ink-surface border border-ink-border rounded text-center text-text-secondary text-xs">
              No resumes uploaded yet. Upload a PDF or DOCX file to configure credentials.
            </div>
          ) : (
            <div className="space-y-3">
              {profile.resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`p-4 bg-ink-surface border rounded flex items-center justify-between gap-4 transition-all ${
                    resume.isPrimary ? "border-aperture-500/40" : "border-ink-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded shrink-0 ${resume.isPrimary ? "bg-aperture-500/10 text-aperture-500" : "bg-ink-border text-text-secondary"}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-text-primary truncate">
                        {resume.name}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Uploaded: {new Date(resume.uploadedAt).toLocaleDateString()} at{" "}
                        {new Date(resume.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {resume.isPrimary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-aperture-500/35 text-aperture-500 bg-aperture-500/5 text-[9px] font-semibold uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Primary Matching
                      </span>
                    ) : (
                      <button
                        onClick={() => setPrimaryResume(resume.id)}
                        className="px-2 py-1 bg-ink-border hover:bg-aperture-500 hover:text-ink-base text-text-secondary hover:text-text-primary text-[10px] font-semibold rounded transition-colors cursor-pointer"
                      >
                        Set Primary
                      </button>
                    )}

                    <button
                      onClick={() => deleteResume(resume.id)}
                      className="p-1.5 rounded hover:bg-ink-border text-text-tertiary hover:text-danger transition-colors cursor-pointer"
                      aria-label={`Delete resume ${resume.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Parsed Resume Preview Panel (Visual support only) */}
          {profile.resumes.length > 0 && (
            <div className="bg-ink-surface border border-ink-border rounded p-4 space-y-3">
              <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider border-b border-ink-border pb-2 flex items-center gap-1.5">
                <FileCheck className="w-4.5 h-4.5 text-aperture-500" />
                Parsed Resume Preview
              </h3>
              <div className="text-[11px] bg-ink-base/40 border border-ink-border/60 p-3 rounded font-mono text-text-secondary space-y-2 max-h-[160px] overflow-y-auto leading-relaxed">
                <p className="font-semibold text-text-primary">--- PARSED PROFILE ---</p>
                <p>Candidate: {profile.name}</p>
                <p>Experience: {profile.experienceYears} Years</p>
                <p>Highest Education: {profile.education || "Not specified"}</p>
                <p>Extracted Skills: {profile.skills.join(", ")}</p>
                <p className="mt-2 text-text-tertiary font-sans italic">
                  Note: CareerSync parsing engine converts PDF/DOCX records into structural data objects automatically. No raw documents enter server memory.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
