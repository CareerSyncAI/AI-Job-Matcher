# CareerSync AI — Modern Web Frontend

The **CareerSync AI Frontend** is a modern, responsive web application built on **Next.js (App Router)** and **React 19 / TypeScript**. It provides intuitive, glassmorphic interfaces for both hiring teams and job candidates, featuring real-time ATS pipeline tracking, verbatim evidence-backed candidate scorecards, and interactive resume ATS optimization.

---

## 🎨 UI Architecture & Design System

The frontend follows the **Hybrid Glassmorphism Design System** documented in [`docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md):
- **Visual Aesthetic**: Translucent frosted panels with subtle borders, backdrop blurs, and layered elevations (`bg-card/40 backdrop-blur-md`).
- **Typography & Icons**: Geist font family with Lucide React iconography.
- **Theme Palette**: Tri-theme support with accessible contrast ratios, dynamic accents, and semantic status chips.
- **Motion Primitives**: Smooth micro-interactions powered by Framer Motion.

---

## 🚀 Key Features & Portals

### 🏢 Recruiter Portal
- **Talent Pipeline (Kanban)**: Live drag-and-drop or column-based applicant management (`Applied`, `Reviewing`, `Shortlisted`, `Interviewing`, `Offered`, `Rejected`) with instant backend synchronization.
- **Candidate Evaluation Cards**: Detailed match score breakdowns showing exact verbatim evidence, hard skill overlaps, transferable competencies, and verified experience intervals.
- **Uncertainty-First Tiers**: Clear visual distinction between confirmed skill gaps and unconfirmed/unmentioned skills (`not_detected`).
- **Requisition Management**: Secure job creation with internal scoring weight controls (strictly hidden from candidates).

### 👤 Candidate Portal
- **Target Role Compatibility**: Interactive role matching displaying transparent gap analysis and transferable skill suggestions.
- **ATS Resume Studio**: Real-time resume inspection highlighting parse quality, structural readability, and keyword density.
- **Application Tracker**: Live tracking of submitted applications with direct status updates from the recruiter's ATS pipeline.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (React 19, TypeScript)
- **Styling**: Tailwind CSS, CSS Variables for Design Tokens
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State & Networking**: Native React Hooks, fetch API with type-safe envelopes

---

## 📂 Project Structure

```text
frontend/
├── app/                  # Next.js App Router
│   ├── auth/             # Login, register, and session handling
│   ├── dashboard/        # Recruiter & Candidate shared/role dashboards
│   │   ├── recruiter/    # Candidates list, Kanban pipeline, job creation
│   │   ├── candidate/    # ATS Resume Studio, role matcher, profile
│   │   └── applications/ # Live application status tracking
│   ├── layout.tsx        # Root layout with theme provider and navigation
│   └── page.tsx          # Landing page and platform overview
├── components/           # Reusable UI components
│   ├── ui/               # Core atomic components (Button, Modal, Input, Badge)
│   ├── recruiter/        # Pipeline Kanban, Candidate scorecard, Filter bars
│   └── candidate/        # Resume upload, ATS scanner, Gap visualizers
├── lib/                  # Utilities, API client bindings, and helpers
└── styles/               # Global CSS and Tailwind directives
```

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the `frontend/` directory:
```ini
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
```

### 4. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Production Build & Verification
```bash
npm run build
npm run start
```
