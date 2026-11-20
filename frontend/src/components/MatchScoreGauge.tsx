import React from "react";

interface MatchScoreGaugeProps {
  score: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const MatchScoreGauge: React.FC<MatchScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
  className = "",
}) => {
  const hasScore = typeof score === "number" && !isNaN(score);
  const clampedScore = hasScore ? Math.max(0, Math.min(100, score)) : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Color mapping based on score
  let strokeColor = "#10b981"; // emerald-500
  let trackColor = "rgba(16, 185, 129, 0.15)";
  let textColor = "text-emerald-500";

  if (!hasScore) {
    strokeColor = "#94a3b8"; // slate-400
    trackColor = "rgba(148, 163, 184, 0.15)";
    textColor = "text-slate-400";
  } else if (clampedScore < 50) {
    strokeColor = "#f43f5e"; // rose-500
    trackColor = "rgba(244, 63, 94, 0.15)";
    textColor = "text-rose-500";
  } else if (clampedScore < 75) {
    strokeColor = "#f59e0b"; // amber-500
    trackColor = "rgba(245, 158, 11, 0.15)";
    textColor = "text-amber-500";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={hasScore ? clampedScore : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Overall match score gauge"
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
            stroke={strokeColor}
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
              {Math.round(clampedScore)}
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
  );
};
