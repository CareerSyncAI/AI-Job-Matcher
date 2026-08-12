'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function LiquidBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[var(--ink-base)] transition-colors duration-500">
      
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
          x: [0, 80, 0],
          y: [0, -40, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[130px] opacity-[0.14]"
        style={{ background: 'radial-gradient(circle, var(--aperture-500) 0%, transparent 70%)' }}
      />

      {/* Mesh Gradient Orb 2: Lower Right */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, -80, 0],
          y: [0, 60, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, var(--signal-500) 0%, transparent 70%)' }}
      />

      {/* Mesh Gradient Orb 3: Center Ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 40, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[35%] left-[25%] w-[45%] h-[45%] rounded-full blur-[110px] opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, var(--success) 0%, transparent 70%)' }}
      />

      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
