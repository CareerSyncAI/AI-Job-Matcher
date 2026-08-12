"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import { pageVariants, MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

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

  // Aperture segment blades paths
  const blades = [
    "M12 2L4.3 6.5L12 12V2Z",
    "M22 12L17.5 4.3L12 12H22Z",
    "M12 22L19.7 17.5L12 12V22Z",
    "M2 12L6.5 19.7L12 12H2Z"
  ];

  // Colors depending on active state
  const getColor = () => {
    switch (state) {
      case "error":
        return "text-danger";
      case "settled":
        return "text-success";
      default:
        return "text-aperture-500";
    }
  };

  // Rotations depending on states
  const getRotation = () => {
    if (shouldReduceMotion) return 0;
    if (state === "processing") return [0, 360];
    if (state === "opening") return [45, 0];
    return 0;
  };

  const getTransition = (): any => {
    if (state === "processing" && !shouldReduceMotion) {
      return {
        repeat: Infinity,
        duration: 3,
        ease: "linear"
      };
    }
    return {
      duration: MOTION_DURATIONS.signature,
      ease: MOTION_EASINGS.standard
    };
  };

  const getScale = () => {
    if (state === "closed") return 0.2;
    if (state === "opening") return 0.7;
    return 1;
  };

  return (
    <motion.div
      animate={{
        rotate: getRotation(),
        scale: getScale()
      }}
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
        {/* Core center focus */}
        <circle cx="12" cy="12" r="2.5" className="fill-ink-surface stroke-current" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
};
