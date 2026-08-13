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
          {score}%
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
// 4. Aperture High-Tech Scanner
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
  const shouldReduceMotion = useReducedMotion();

  const dimensions = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  const blades = [
    "M12 2L4.3 6.5L12 12V2Z",
    "M22 12L17.5 4.3L12 12H22Z",
    "M12 22L19.7 17.5L12 12V22Z",
    "M2 12L6.5 19.7L12 12H2Z"
  ];

  const getColor = () => {
    switch (state) {
      case "error": return "text-danger";
      case "settled": return "text-success";
      default: return "text-aperture-500";
    }
  };

  const getRotation = () => {
    if (shouldReduceMotion) return 0;
    if (state === "processing") return [0, 360];
    if (state === "opening") return [45, 0];
    return 0;
  };

  const getTransition = (): any => {
    if (state === "processing" && !shouldReduceMotion) {
      return { repeat: Infinity, duration: 3, ease: "linear" };
    }
    return { duration: MOTION_DURATIONS.signature, ease: MOTION_EASINGS.standard };
  };

  return (
    <motion.div
      animate={{ rotate: getRotation() }}
      transition={getTransition()}
      className={cn("relative shrink-0 flex items-center justify-center", dimensions[size], getColor(), className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-full h-full stroke-ink-surface"
        strokeWidth="0.5"
      >
        {blades.map((d, index) => (
          <path key={index} d={d} className="opacity-90" />
        ))}
        <circle cx="12" cy="12" r="2.5" className="fill-ink-surface stroke-current" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
};

// =========================================================================
// 5. Liquid & Shimmer Buttons
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
      whileHover={{ y: -1.5, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(
        "relative overflow-hidden px-4 py-2 rounded-full font-medium text-xs text-text-primary group inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none",
        variant === 'primary' && 'bg-signal-500 hover:bg-signal-600 text-white font-semibold shadow-sm hover:shadow-signal-500/25',
        variant === 'secondary' && 'bg-white/5 hover:bg-white/10 text-text-primary border border-ink-border hover:border-signal-500/40',
        variant === 'cyber' && 'bg-success/15 border border-success/30 text-success hover:bg-success/25',
        variant === 'danger' && 'bg-danger/15 border border-danger/30 text-danger hover:bg-danger/25',
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative inline-flex items-center justify-center px-6 py-3 overflow-hidden rounded-full font-medium text-sm text-white shadow-glass-lg group bg-gradient-to-r from-signal-600 to-aperture-600 border border-white/20",
        className
      )}
      {...props}
    >
      {/* Specular shimmer overlay */}
      <span className="absolute top-0 right-0 w-12 -mt-1 h-32 transition-all duration-1000 transform translate-x-12 bg-white opacity-20 rotate-12 group-hover:-translate-x-60 ease" />
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
