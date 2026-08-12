"use client";

import React, { useState, useRef } from "react";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { Upload, File, CheckCircle2, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  stage: string;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  resultId?: string;
}

export default function UploadPage() {
  const { jobs, selectedJobId, setSelectedJobId, uploadResume, currentJob } = useRecruiter();
  
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    // Filter PDF and DOCX only
    const validFiles = files.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "docx" || file.type === "application/pdf" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    });

    if (validFiles.length === 0) {
      alert("Please upload PDF or DOCX resume files only.");
      return;
    }

    const newItems: UploadQueueItem[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      file,
      progress: 0,
      stage: "Queued",
      status: "idle"
    }));

    setQueue((prev) => [...prev, ...newItems]);

    // Automatically trigger processing for newly added idle items
    newItems.forEach((item) => {
      processFile(item);
    });
  };

  const processFile = async (item: UploadQueueItem) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q))
    );

    try {
      const candidate = await uploadResume(item.file, (progress, stage) => {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, progress, stage } : q
          )
        );
      });

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                progress: 100,
                stage: "Matching Complete",
                status: "success",
                resultId: candidate.id
              }
            : q
        )
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse resume document";
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: "error",
                error: errorMessage
              }
            : q
        )
      );
    }
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div>
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Bulk Resume Processing
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Upload resumes (PDF/DOCX) into the active job scope. Natural language parsing computes matching criteria dynamically.
        </p>
      </div>

      {/* Grid Settings & Upload zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings & Job selector */}
        <div className="space-y-4">
          <div className="bg-ink-surface border border-ink-border rounded p-4 space-y-4 text-xs">
            <h3 className="font-semibold text-text-primary uppercase tracking-wider text-[10px]">
              Upload Settings
            </h3>
            
            <div className="space-y-2">
              <label className="block text-text-secondary font-semibold">
                Target Job Requisition
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-ink-base/40 border border-ink-border rounded space-y-1">
              <p className="font-semibold text-text-secondary">Expected Schema</p>
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                Matches are evaluated against:
                <br />
                - Required Skills: {currentJob?.requiredSkills.join(", ")}
                <br />
                - Minimum Experience: {currentJob?.minimumExperience} years
              </p>
            </div>
          </div>
        </div>

        {/* Drag & Drop Main Zone */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
              isDragging
                ? "border-signal-500 bg-signal-500/5"
                : "border-ink-border bg-ink-surface hover:border-ink-border/80"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.docx"
              className="hidden"
            />
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded bg-signal-500/10 text-signal-500 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">
                  Drag and drop candidate resume files here
                </p>
                <p className="text-xs text-text-tertiary">
                  Support formats: PDF or DOCX. Max file size: 5MB.
                </p>
              </div>
              <div>
                <button
                  onClick={triggerFileSelect}
                  className="px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>

          {/* Processing Queue Card */}
          {queue.length > 0 && (
            <div className="bg-ink-surface border border-ink-border rounded overflow-hidden">
              <div className="p-3 bg-ink-base border-b border-ink-border flex justify-between items-center">
                <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wider">
                  Processing Queue
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">
                  {queue.length} files queued
                </span>
              </div>

              <div className="divide-y divide-ink-border">
                {queue.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <File className="w-5 h-5 text-text-secondary shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex justify-between items-center gap-2">
                          <p className="font-semibold text-text-primary truncate">
                            {item.file.name}
                          </p>
                          <span className="font-mono text-[10px] text-text-tertiary shrink-0">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>

                        {/* Progress slider bar */}
                        {item.status === "uploading" && (
                          <div className="space-y-1">
                            <div className="w-full bg-ink-base h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-signal-500 h-full transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9.5px] text-text-tertiary">
                              <span className="truncate">{item.stage}</span>
                              <span className="font-mono">{item.progress}%</span>
                            </div>
                          </div>
                        )}

                        {/* Error info */}
                        {item.status === "error" && (
                          <p className="text-[10px] text-danger">{item.error}</p>
                        )}

                        {/* Success info */}
                        {item.status === "success" && (
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-success font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Parsed successfully
                            </p>
                            {item.resultId && (
                              <Link
                                href={`/recruiter/jobs/${selectedJobId}/candidates/${item.resultId}`}
                                className="text-[10px] text-signal-500 hover:text-signal-600 font-semibold flex items-center gap-0.5"
                              >
                                View Evidence
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete item button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 hover:bg-ink-border text-text-tertiary hover:text-danger rounded transition-colors shrink-0 cursor-pointer"
                      aria-label="Remove item from queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
