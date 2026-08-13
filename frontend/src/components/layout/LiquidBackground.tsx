'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function LiquidBackground() {
  return (
    <div 
      className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[var(--ink-base)] transition-colors duration-500 will-change-transform"
      style={{ contain: 'strict' }}
    >
      {/* Subtle Ambient Gradient Underlay */}
      <div 
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 80%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(59, 130, 246, 0.06) 0%, transparent 70%)`
        }}
      />

      {/* Engineering Grid Pattern (Balanced Subtle Contrast) */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_20%,#000_60%,transparent_100%)]"
        style={{
          backgroundImage: `linear-gradient(to right, var(--text-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Mesh Gradient Orb 1: Upper Left (Aperture / Indigo Glow) */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 60, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-10%] left-[-5%] w-[55%] h-[55%] rounded-full blur-[130px] opacity-[0.16] dark:opacity-[0.18] will-change-transform"
        style={{ 
          background: 'radial-gradient(circle, var(--aperture-500) 0%, transparent 65%)',
          transform: 'translateZ(0)'
        }}
      />

      {/* Mesh Gradient Orb 2: Lower Right (Signal / Electric Blue Glow) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -60, 0],
          y: [0, 45, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-[0.14] dark:opacity-[0.16] will-change-transform"
        style={{ 
          background: 'radial-gradient(circle, var(--signal-500) 0%, transparent 65%)',
          transform: 'translateZ(0)'
        }}
      />

      {/* Mesh Gradient Orb 3: Center Ambient Glow (Emerald Accent) */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 30, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full blur-[110px] opacity-[0.08] dark:opacity-[0.10] will-change-transform"
        style={{ 
          background: 'radial-gradient(circle, var(--success) 0%, transparent 65%)',
          transform: 'translateZ(0)'
        }}
      />
    </div>
  );
}
