"use client";

import React, { useState } from "react";

export default function ResumePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<null | typeof sampleParsedResume>(sampleParsedResume);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setParsedData(sampleParsedResume);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">AI Resume Studio & ATS Analyzer</h1>
        <p className="text-slate-400 text-xs mt-1">
          Upload your CV to generate vector embeddings, score ATS compatibility, and extract structured skills.
        </p>
      </div>

      {/* Upload Box */}
      <div className="p-8 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 hover:border-blue-500/50 transition backdrop-blur-md text-center group cursor-pointer" onClick={handleUpload}>
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
          {isUploading ? (
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>
        <h3 className="text-sm font-bold text-slate-200">
          {isUploading ? "Extracting & Embedding Resume..." : "Click or drag PDF resume here to analyze"}
        </h3>
        <p className="text-slate-400 text-xs mt-1">Supports PDF, DOCX (Max 10MB). Uses SpaCy + Transformer extraction.</p>
      </div>

      {parsedData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ATS Score Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-6">
            <h2 className="text-base font-bold text-slate-200">ATS Score Breakdown</h2>
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/60 border border-slate-800">
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
                  <span>Formatting & Structure</span>
                  <span>88%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full w-[88%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Action Verbs & Quantified Results</span>
                  <span>84%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full w-[84%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Structured Skills & Experience */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-6">
            <h2 className="text-base font-bold text-slate-200">Extracted Vector Entities</h2>
            
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Technical Skills Detected</h3>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Experience Highlights</h3>
              <div className="space-y-3">
                {parsedData.experience.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between text-xs font-bold text-slate-200">
                      <span>{exp.title}</span>
                      <span className="text-slate-400 font-normal">{exp.period}</span>
                    </div>
                    <p className="text-xs text-blue-400 mt-0.5">{exp.company}</p>
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
