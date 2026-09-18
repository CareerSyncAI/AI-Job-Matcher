"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants, HTMLMotionProps } from "framer-motion";
import { pageVariants, MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

// =========================================================================
// 1. Page Transitions & Collapse
// =========================================================================

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion 
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }
    : pageVariants as Variants;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface CollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Collapse: React.FC<CollapseProps> = ({ isOpen, children, className }) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return isOpen ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: MOTION_DURATIONS.standard, ease: MOTION_EASINGS.standard },
            opacity: { duration: MOTION_DURATIONS.micro }
          }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =========================================================================
// 2. Spotlight Card (Mouse-tracking radial glow)
// =========================================================================

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor,
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => setOpacity(1);
  const handleBlur = () => setOpacity(0);
  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-2xl glass-card border border-ink-border overflow-hidden group card-hover",
        className
      )}
      {...props}
    >
      {/* Mouse Radial Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${
            spotlightColor || "var(--spotlight-color)"
          }, transparent 80%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// =========================================================================
// 3. Interactive Circular Score Gauge with Glowing Ring
// =========================================================================

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showGrade?: boolean;
  className?: string;
}

export const InteractiveScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 110,
  strokeWidth = 9,
  showGrade = true,
  className
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 85) return "text-success";
    if (s >= 70) return "text-signal-500";
    if (s >= 50) return "text-warning";
    return "text-danger";
  };

  const getGrade = (s: number) => {
    if (s >= 90) return "A+";
    if (s >= 80) return "A";
    if (s >= 70) return "B+";
    if (s >= 60) return "B";
    return "C";
  };

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10 fill-transparent"
        />
        {/* Animated Fill Stroke */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
          className={cn("fill-transparent transition-colors duration-300", getColor(score))}
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-bold text-2xl tracking-tight text-text-primary">
          <AnimatedNumber value={score} suffix="%" duration={0.4} />
        </span>
        {showGrade && (
          <span className={cn("text-[11px] font-mono font-semibold uppercase tracking-wider", getColor(score))}>
            {getGrade(score)} Match
          </span>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 4. Precision Status Glyph / Loader
// =========================================================================

interface ApertureLoaderProps {
  state: "closed" | "opening" | "processing" | "settled" | "error";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ApertureLoader: React.FC<ApertureLoaderProps> = ({
  state,
  size = "md",
  className
}) => {
  const dimensions = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  const getColor = () => {
    switch (state) {
      case "error": return "text-danger";
      case "settled": return "text-success";
      default: return "text-signal-500";
    }
  };

  return (
    <div className={cn("relative shrink-0 flex items-center justify-center", dimensions[size], getColor(), className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("w-full h-full", state === "processing" ? "animate-spin" : "")}
      >
        <circle cx="12" cy="12" r="9" className="opacity-25" />
        <path d="M12 3a9 9 0 0 1 9 9" className="opacity-90 stroke-current" />
        <circle cx="12" cy="12" r="3" className="fill-current stroke-none" />
      </svg>
    </div>
  );
};

// =========================================================================
// 5. Tactile Buttons (Linear / Stripe Craft)
// =========================================================================

interface LiquidButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'cyber';
}

export const LiquidButton: React.FC<LiquidButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}) => {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "relative overflow-hidden px-3.5 py-1.5 rounded-lg font-medium text-xs group inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none border",
        variant === 'primary' && 'bg-signal-500 hover:bg-signal-600 text-white border-signal-500 shadow-sm',
        variant === 'secondary' && 'bg-white/5 hover:bg-white/10 text-text-primary border-ink-border hover:border-white/20',
        variant === 'cyber' && 'bg-white/5 hover:bg-white/10 text-text-primary border-ink-border',
        variant === 'danger' && 'bg-danger/10 border-danger/25 text-danger hover:bg-danger/20',
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
};

export const ShimmerButton: React.FC<LiquidButtonProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "relative inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-xs sm:text-sm text-white bg-signal-600 hover:bg-signal-500 border border-signal-500/50 shadow-sm transition-all cursor-pointer",
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};

// =========================================================================
// 6. Stagger Animation Variants
// =========================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

export const staggerItem: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18
    }
  }
};

// =========================================================================
// 7. Dynamic Animated Counter with Ease-Out Physics
// =========================================================================

export const AnimatedNumber: React.FC<{
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}> = ({ value, duration = 0.8, className, suffix = "", prefix = "" }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  React.useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = prevValue.current;
    const endVal = value;
    prevValue.current = value;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeProgress);
      setDisplayValue(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, duration]);

  return (
    <span className={cn("tabular-nums inline-block font-mono", className)}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};

// =========================================================================
// 8. Live Status Pulse Indicator
// =========================================================================

export const LiveIndicator: React.FC<{
  color?: "green" | "blue" | "amber" | "rose";
  label?: string;
  className?: string;
}> = ({ color = "green", label, className }) => {
  const colors = {
    green: { ping: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-500" },
    blue: { ping: "bg-blue-500", dot: "bg-blue-500", text: "text-blue-500" },
    amber: { ping: "bg-amber-500", dot: "bg-amber-500", text: "text-amber-500" },
    rose: { ping: "bg-rose-500", dot: "bg-rose-500", text: "text-rose-500" },
  }[color];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-mono select-none", className)}>
      <span className="relative flex h-2 w-2">
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colors.ping)} />
        <span className={cn("relative inline-flex rounded-full h-2 w-2", colors.dot)} />
      </span>
      {label && <span className={colors.text}>{label}</span>}
    </span>
  );
};

// =========================================================================
// 9. 3D Perspective Tilt Card with Glare Reflection
// =========================================================================

export const TiltCard: React.FC<React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  maxTilt?: number;
}> = ({ children, className, maxTilt = 5, ...props }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -maxTilt;
    const tiltY = ((x - centerX) / centerX) * maxTilt;
    setTilt({ x: tiltX, y: tiltY });
    setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 0.12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        transformStyle: "preserve-3d"
      }}
      className={cn("relative overflow-hidden rounded-xl", className)}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-20"
        style={{
          background: `radial-gradient(circle 350px at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.08), transparent 70%)`,
          opacity: glare.opacity
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

// =========================================================================
// 10. Segmented Pill Dock with Fluid Sliding Pill
// =========================================================================

export const SegmentedPillDock: React.FC<{
  tabs: { id: string; label: string; icon?: React.ElementType; badge?: string }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ tabs, activeId, onChange, className }) => {
  return (
    <div className={cn("inline-flex items-center p-1 rounded-lg bg-ink-surface border border-ink-border gap-1", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer select-none flex items-center gap-1.5 z-10",
              isActive ? "text-text-primary font-semibold" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="segmentedPillActive"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                className="absolute inset-0 bg-white/10 rounded-md border border-ink-border shadow-sm -z-10"
              />
            )}
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 border border-ink-border text-text-tertiary">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

