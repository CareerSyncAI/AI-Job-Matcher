"use client";

import React, { useState } from "react";
import {
  IconDocument,
} from "@/components/Icons";

export default function ResumePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<null | typeof sampleParsedResume>(sampleParsedResume);

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setIsUploading(false);
      setParsedData(sampleParsedResume);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              CareerSync Document Parser
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 font-display mt-1">Resume Studio &amp; ATS Syntax Analyzer</h1>
          <p className="text-slate-400 text-xs mt-1">
            Upload your CV to extract structured skill entities, verify ATS keyword compatibility, and generate vector profile matrices.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold self-start sm:self-center">
          VERIFIED ATS ENGINE
        </span>
      </div>

      {/* Upload Box with Animated Scanner */}
      <div
        onClick={handleUpload}
        className="relative overflow-hidden p-8 rounded-2xl bg-slate-900/80 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 transition duration-300 backdrop-blur-md text-center group cursor-pointer"
      >
        {/* Animated Scanner Laser Bar */}
        {isUploading && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] top-0 animate-bounce transition-all duration-700 pointer-events-none" />
        )}

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition shadow-lg shadow-emerald-500/5">
          {isUploading ? (
            <svg className="w-8 h-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <IconDocument size={30} className="text-emerald-400" />
          )}
        </div>

        <h3 className="text-sm font-bold text-slate-200">
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <span>Scanning Resume Graph ({uploadProgress}%)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </span>
          ) : (
            "Click or drag PDF/DOCX resume here to analyze free"
          )}
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          Supports PDF &amp; DOCX (Max 10MB). SpaCy skill extraction + sentence-transformers embeddings.
        </p>

        {isUploading && (
          <div className="max-w-xs mx-auto mt-4">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {parsedData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ATS Score Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-6">
            <h2 className="text-base font-bold text-slate-200">ATS Score Breakdown</h2>
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                {parsedData.atsScore}/100
              </span>
              <span className="text-xs text-emerald-400 font-semibold mt-1">Excellent Candidate Alignment</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Keyword Alignment</span>
                  <span>92%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full w-[92%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Formatting &amp; Structure</span>
                  <span>88%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full w-[88%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Action Verbs &amp; Quantified Results</span>
                  <span>84%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full w-[84%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Structured Skills & Experience */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-6">
            <h2 className="text-base font-bold text-slate-200">Extracted Vector Skill Graph</h2>
            
            <div>
              <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2">Technical Skills Detected</h3>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Experience Highlights</h3>
              <div className="space-y-3">
                {parsedData.experience.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex justify-between text-xs font-bold text-slate-200">
                      <span>{exp.title}</span>
                      <span className="text-slate-400 font-normal">{exp.period}</span>
                    </div>
                    <p className="text-xs text-emerald-400 mt-0.5">{exp.company}</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{exp.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const sampleParsedResume = {
  atsScore: 88,
  skills: [
    "TypeScript", "React", "Next.js", "Python", "FastAPI", "PostgreSQL",
    "Tailwind CSS", "Docker", "REST API", "Git", "AI Embeddings"
  ],
  experience: [
    {
      title: "Senior Frontend Developer",
      company: "InnovateTech Inc.",
      period: "2022 - Present",
      summary: "Architected high-performance Next.js application handling 500k monthly active users. Integrated AI search components with vector index endpoints.",
    },
    {
      title: "Full Stack Engineer",
      company: "DataDriven Labs",
      period: "2020 - 2022",
      summary: "Built automated data processing pipelines with FastAPI and PostgreSQL. Improved query performance by 40%.",
    }
  ]
};
