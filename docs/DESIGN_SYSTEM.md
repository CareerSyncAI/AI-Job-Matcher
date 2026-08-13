# CareerSync AI — Design System & UI Architecture

This document defines the visual design system, component hierarchy, motion tokens, and tri-theme palette powering the CareerSync AI frontend.

---

## 🎨 Design Philosophy: Hybrid Glassmorphism

CareerSync AI utilizes a custom **Hybrid Design Architecture** combining **Glassmorphism**, **Obsidian Minimalism**, and **Specular Refraction**:

1. **Lightweight Backdrops & Ambient Mesh Orbs**: Organic background glows (`LiquidBackground.tsx`) with dynamic CSS blur filters (`backdrop-blur-xl`).
2. **Specular Glass Borders & Spotlight Hover**: Cards track the user's cursor position (`SpotlightCard`) and illuminate translucent border highlights (`border-gradient-glass`).
3. **Tri-Theme Engine**:
   - **Obsidian Aurora (`dark`)**: Deep space black (`#07090E`) with royal indigo & soft cyan glow.
   - **Emerald Cyber (`cyber`)**: High-tech slate matrix (`#060D12`) with electric emerald & cyan accents.
   - **Titanium Frost (`light`)**: Clean porcelain white (`#F8FAFC`) with frosted sapphire glass and crisp slate typography.

---

## 💎 Motion Tokens & Component Hierarchy

- **Motion Durations**:
  - Micro-interactions (hover, active tap): `100ms - 150ms`
  - Standard transitions (drawers, modals, popovers): `200ms - 250ms`
  - Signature animations (score gauge count-up, aperture scanner): `300ms - 800ms`
- **Key Primitives (`src/components/motion/MotionPrimitives.tsx`)**:
  - `SpotlightCard`: Mouse-tracking radial gradient glow.
  - `InteractiveScoreGauge`: Circular SVG gauge with glowing ring & grade badge.
  - `LiquidButton` / `ShimmerButton`: Specular light sweeps with hover spring physics.
  - `ApertureLoader`: Camera lens scanner for AI processing milestones.
- **System Layer (`src/components/ui/...`)**:
  - `CommandMenu`: Global `Cmd+K` / `Ctrl+K` keyboard palette.
  - `ToastProvider`: Stacked glass notifications with live progress meters.
