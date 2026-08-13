'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function LiquidBackground() {
  return (
    <div 
      className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[var(--ink-base)] transition-colors duration-500 will-change-transform"
      style={{ contain: 'strict' }}
    >
      {/* Background Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.025] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        style={{
          backgroundImage: `linear-gradient(to right, var(--text-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Mesh Gradient Orb 1: Upper Left */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 60, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[130px] opacity-[0.14] will-change-transform"
        style={{ 
          background: 'radial-gradient(circle, var(--aperture-500) 0%, transparent 70%)',
          transform: 'translateZ(0)'
        }}
      />

      {/* Mesh Gradient Orb 2: Lower Right */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -60, 0],
          y: [0, 45, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-[0.12] will-change-transform"
        style={{ 
          background: 'radial-gradient(circle, var(--signal-500) 0%, transparent 70%)',
          transform: 'translateZ(0)'
        }}
      />

      {/* Mesh Gradient Orb 3: Center Ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 30, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[35%] left-[25%] w-[45%] h-[45%] rounded-full blur-[110px] opacity-[0.06] will-change-transform"
        style={{ 
          background: 'radial-gradient(circle, var(--success) 0%, transparent 70%)',
          transform: 'translateZ(0)'
        }}
      />
    </div>
  );
}
