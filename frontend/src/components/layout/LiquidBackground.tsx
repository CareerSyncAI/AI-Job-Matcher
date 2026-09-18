'use client';

import React from 'react';

export function LiquidBackground() {
  return (
    <div 
      className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[var(--ink-base)] transition-colors duration-300"
      style={{ contain: 'strict' }}
    >
      {/* Subtle Studio Lighting Vignette at Top */}
      <div 
        className="absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 40% at 50% -10%, rgba(99, 102, 241, 0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 30% at 85% 90%, rgba(59, 130, 246, 0.05) 0%, transparent 60%)`
        }}
      />

      {/* Engineering Precision Dot Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000_50%,transparent_100%)]"
        style={{
          backgroundImage: `radial-gradient(var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ultra-subtle Horizontal Baseline Line at Top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--ink-border)] to-transparent" />
    </div>
  );
}

