"use client";

import React from "react";
import Link from "next/link";
import { ParsedResumeData, getResumeQualitySummary } from "@/lib/resumeStudio";
import { MatchScoreGauge } from "@/components/MatchScoreGauge";

interface ResumeStudioResultsProps {
  data: ParsedResumeData;
  isPartial: boolean;
  isDemoPreview: boolean;
  isDark?: boolean;
}

export const ResumeStudioResults: React.FC<ResumeStudioResultsProps> = ({
  data,
  isPartial,
  isDemoPreview,
  isDark = true,
}) => {
  const qualitySummary = getResumeQualitySummary(data.atsScore);

  const dimensions = [
    {
      label: "Keyword & Skill Density",
      value: data.skillsScore,
      barClass: "bg-emerald-500",
    },
    {
      label: "Formatting & Readability",
      value: data.formattingScore,
      barClass: "bg-teal-500",
    },
    {
      label: "Action Verbs & Impact",
      value: data.impactScore,
      barClass: "bg-emerald-600",
    },
    {
      label: "Section Organization",
      value: data.sectionScore,
      barClass: "bg-cyan-500",
    },
  ];

  const detectedSectionEntries = data.detectedSections
    ? Object.entries(data.detectedSections)
    : [];

  return (
    <div className="space-y-6">
      {/* Distinction Notice: Resume Quality vs Job Suitability */}
      <div
        role="note"
        className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark
            ? "bg-slate-900/60 border-slate-800 text-slate-300"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}
      >
        <div>
          <span className="font-semibold">Resume Quality vs. Job Suitability: </span>
          <span className={isDark ? "text-slate-400" : "text-slate-600"}>
            ATS compatibility reflects resume structure, clarity, and taxonomy skill coverage—not suitability for a specific job requisition.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/jobs"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
          >
            Browse &amp; Match Jobs
          </Link>
          <Link
            href="/dashboard/applications"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isDark
                ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            View Applications
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview & ATS Compatibility */}
        <div
          className={`p-6 rounded-2xl border backdrop-blur-md space-y-6 ${
            isDark
              ? "bg-slate-900/80 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">ATS Compatibility</h2>
              {isPartial && !isDemoPreview && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Partial
                </span>
              )}
            </div>
            {data.grade ? (
              <span
                className={`px-2.5 py-0.5 text-xs font-bold font-mono rounded-full border ${
                  isDark
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                Grade {data.grade}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-mono rounded-full border text-slate-400 border-slate-700">
                Grade —
              </span>
            )}
          </div>

          <div
            className={`flex flex-col items-center justify-center p-5 rounded-xl border ${
              isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <MatchScoreGauge score={data.atsScore} size={132} strokeWidth={10} />
            <span className="text-xs font-semibold mt-2 text-emerald-500">
              {qualitySummary.label}
            </span>
          </div>

          {/* Sub-Score Dimensions */}
          <div className="space-y-4">
            {dimensions.map((dim) => {
              const hasVal = typeof dim.value === "number";
              const clamped = hasVal ? Math.min(100, Math.max(0, dim.value as number)) : 0;
              return (
                <div key={dim.label}>
                  <div
                    className={`flex justify-between text-xs font-semibold mb-1 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <span>{dim.label}</span>
                    <span>{hasVal ? `${dim.value}%` : "Unavailable"}</span>
                  </div>
                  <div
                    className={`w-full rounded-full h-2 overflow-hidden ${
                      isDark ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`${dim.barClass} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${clamped}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Telemetry */}
          <div
            className={`grid grid-cols-3 gap-2 pt-3 border-t text-center ${
              isDark ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <div>
              <p className="text-sm font-bold">{data.wordCount ?? "—"}</p>
              <p className="text-[11px] text-slate-400">Words</p>
            </div>
            <div>
              <p className="text-sm font-bold">{data.metricsCount ?? 0}</p>
              <p className="text-[11px] text-slate-400">Metrics</p>
            </div>
            <div>
              <p className="text-sm font-bold">{data.actionVerbs?.length ?? 0}</p>
              <p className="text-[11px] text-slate-400">Action Verbs</p>
            </div>
          </div>

          {/* Strengths */}
          {Array.isArray(data.strengths) && data.strengths.length > 0 && (
            <div
              className={`pt-3 border-t ${
                isDark ? "border-slate-800/60" : "border-slate-200"
              }`}
            >
              <h3 className="text-xs font-semibold mb-2">Detected Strengths</h3>
              <ul className="space-y-1.5">
                {data.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-500 shrink-0">✓</span>
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      {str}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Skills, Sections, Experience/Education, Weaknesses & Recommendations */}
        <div
          className={`lg:col-span-2 p-6 rounded-2xl border backdrop-blur-md space-y-6 ${
            isDark
              ? "bg-slate-900/80 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">
                Extracted Skills &amp; Section Findings
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Canonical skills and structural signals grounded in the uploaded resume.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                isDark
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              {data.skills.length} Skills Detected
            </span>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-xs font-semibold mb-2.5">Extracted Skills</h3>
            <div className="flex flex-wrap gap-2">
              {data.skills.length > 0 ? (
                data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border ${
                      isDark
                        ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                        : "text-emerald-800 bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <div
                  className={`p-3 rounded-xl border text-xs w-full ${
                    isDark
                      ? "bg-slate-950/40 border-slate-800 text-slate-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  No explicit technical skills were recognized in this resume.
                </div>
              )}
            </div>
          </div>

          {/* Section Recognition (Experience, Education, Summary, Contact, Skills) */}
          {detectedSectionEntries.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold mb-2.5">
                Section Recognition &amp; Uncertainty
              </h3>
              <div className="flex flex-wrap gap-2">
                {detectedSectionEntries.map(([section, present]) => (
                  <span
                    key={section}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${
                      present
                        ? isDark
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isDark
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {present ? "✓" : "⚠"} {section}
                  </span>
                ))}
              </div>
              {data.missingCriticalSections && data.missingCriticalSections.length > 0 && (
                <p className="text-[11px] text-amber-500 mt-2">
                  Missing critical sections: {data.missingCriticalSections.join(", ")}.
                </p>
              )}
            </div>
          )}

          {/* Experience & Education Findings */}
          <div>
            <h3 className="text-xs font-semibold mb-2.5">
              Experience &amp; Education Findings
            </h3>
            {data.experience.length > 0 ? (
              <div className="space-y-3">
                {data.experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      isDark
                        ? "bg-slate-950/80 border-slate-800"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between text-xs font-bold">
                      <span>{exp.title}</span>
                      <span className="font-normal text-slate-400">{exp.period}</span>
                    </div>
                    <p className="text-xs font-semibold mt-0.5 text-emerald-500">
                      {exp.company}
                    </p>
                    <p className="text-xs mt-2 leading-relaxed opacity-85">{exp.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  isDark
                    ? "bg-slate-950/80 border-slate-800 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex flex-wrap gap-4">
                  <span>
                    Experience section:{" "}
                    {data.detectedSections?.experience ? (
                      <strong className="text-emerald-500">Detected</strong>
                    ) : (
                      <strong className="text-amber-500">Not detected / Uncertain</strong>
                    )}
                  </span>
                  <span>
                    Education section:{" "}
                    {data.detectedSections?.education ? (
                      <strong className="text-emerald-500">Detected</strong>
                    ) : (
                      <strong className="text-amber-500">Not detected / Uncertain</strong>
                    )}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Detailed experience timeline, tenure, and degree alignment are evaluated against specific job requirements when you apply or run job matching.
                </p>
              </div>
            )}
          </div>

          {/* Weaknesses & Supported AI Recommendations */}
          <div>
            <h3 className="text-xs font-semibold mb-2.5">
              Weaknesses &amp; Supported Recommendations ({data.issues?.length ?? 0})
            </h3>
            {data.issues && data.issues.length > 0 ? (
              <div className="space-y-2">
                {data.issues.map((iss, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs ${
                      iss.severity === "critical"
                        ? isDark
                          ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                          : "bg-rose-50 border-rose-200 text-rose-900"
                        : isDark
                        ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <p className="font-semibold">{iss.issue}</p>
                    <p className={`mt-0.5 text-[11px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Recommendation: {iss.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  isDark
                    ? "bg-slate-950/40 border-slate-800 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                No critical ATS formatting or structural issues were flagged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
