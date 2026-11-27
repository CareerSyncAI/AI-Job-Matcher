import React from "react";

export interface MatchScoreTier {
  tier: "strong" | "moderate" | "developing" | "unavailable";
  label: string;
  color: "emerald" | "amber" | "rose" | "slate";
  strokeColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  score: number | null;
}

export function getMatchScoreTier(score: number | null | undefined): MatchScoreTier {
  if (score == null || isNaN(score)) {
    return {
      tier: "unavailable",
      label: "Pending",
      color: "slate",
      strokeColor: "#94a3b8",
      badgeBg: "bg-slate-500/10",
      badgeBorder: "border-slate-500/20",
      badgeText: "text-slate-400",
      description: "Evaluation in progress or score unavailable",
      score: null,
    };
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= 80) {
    return {
      tier: "strong",
      label: "Strong Match",
      color: "emerald",
      strokeColor: "#10b981",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/20",
      badgeText: "text-emerald-500",
      description: "High alignment with key job requirements",
      score: clamped,
    };
  }
  if (clamped >= 60) {
    return {
      tier: "moderate",
      label: "Moderate Match",
      color: "amber",
      strokeColor: "#f59e0b",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/20",
      badgeText: "text-amber-500",
      description: "Meets core requirements with a few potential gaps",
      score: clamped,
    };
  }
  return {
    tier: "developing",
    label: "Developing Match",
    color: "rose",
    strokeColor: "#f43f5e",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/20",
    badgeText: "text-rose-500",
    description: "Foundational alignment with significant qualification gaps",
    score: clamped,
  };
}

interface MatchScoreGaugeProps {
  score: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showTierBadge?: boolean;
}

export const MatchScoreGauge: React.FC<MatchScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
  className = "",
  showTierBadge = false,
}) => {
  const tierInfo = getMatchScoreTier(score);
  const hasScore = tierInfo.score !== null;
  const clampedScore = tierInfo.score ?? 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let trackColor = "rgba(16, 185, 129, 0.15)";
  let textColor = "text-emerald-500";

  if (!hasScore) {
    trackColor = "rgba(148, 163, 184, 0.15)";
    textColor = "text-slate-400";
  } else if (tierInfo.color === "rose") {
    trackColor = "rgba(244, 63, 94, 0.15)";
    textColor = "text-rose-500";
  } else if (tierInfo.color === "amber") {
    trackColor = "rgba(245, 158, 11, 0.15)";
    textColor = "text-amber-500";
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="relative inline-flex items-center justify-center select-none"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={hasScore ? clampedScore : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Overall match score gauge: ${hasScore ? `${clampedScore}% (${tierInfo.label})` : "Pending"}`}
      >
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated Progress Arc */}
          {hasScore && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={tierInfo.strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>
        {/* Central Value */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          {hasScore ? (
            <>
              <span className={`font-mono text-3xl font-extrabold tracking-tight ${textColor}`}>
                {clampedScore}
                <span className="text-sm font-bold align-top ml-0.5">%</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                Match
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Pending</span>
          )}
        </div>
      </div>

      {showTierBadge && hasScore && (
        <span
          className={`mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tierInfo.badgeBg} ${tierInfo.badgeBorder} ${tierInfo.badgeText}`}
        >
          {tierInfo.label}
        </span>
      )}
    </div>
  );
};
