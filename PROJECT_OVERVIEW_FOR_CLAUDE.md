# CareerSync AI — Project Handover & Architecture Overview

## 🎯 1. Project Summary
**CareerSync AI** (AI-Based Resume Screening and Candidate Ranking System) is a 5th-semester System Group Project (SGP) at CHARUSAT University (DEPSTAR / B.Tech IT).

- **Objective**: Automate resume parsing, skill extraction, semantic matching, and explainable candidate ranking for recruiters while preserving full human recruiter agency ("Human-in-the-loop").
- **Product Philosophy**:
  1. *Decision First* — Present clear, actionable decision-focused UI.
  2. *Evidence First* — Always display explainable evidence & skill match breakdowns rather than black-box scores.
  3. *Uncertainty First* — "Not Detected" ≠ "Doesn't Exist".
  4. *Human in the Loop* — AI assists and scores, human recruiter makes the final call.

---

## 🛠️ 2. Repository & Tech Stack
- **Frontend (`frontend2/`)**:
  - **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
  - **Styling**: Tailwind CSS v4 + Vanilla CSS Design Tokens (`src/app/globals.css`)
  - **Animation**: Framer Motion (`src/components/motion/MotionPrimitives.tsx`)
  - **Icons**: Lucide React
  - **Data Visualization**: Recharts (Candidate distribution, skill radar, match analytics)
  - **State Management**: React Context (`ApplicantContext.tsx`, `RecruiterContext.tsx`, `ThemeContext.tsx`) + Mock Services (`mock.ts`, `matchingEngine.ts`)

- **Backend (`backend/`)** *(To be developed/integrated)*:
  - Node.js / Express.js REST API

- **AI Microservice (`ai-services/`)** *(To be developed/integrated)*:
  - Python / FastAPI for PDF resume parsing, spaCy NER, sentence-transformers semantic embeddings, cosine similarity ranking.

- **Database (`database/`)**:
  - MongoDB schemas for Candidates, Resumes, Jobs, Applications, Match Analytics.

---

## 📂 3. Codebase Structure
```text
AI-Job-Matcher/
├── docs/                                # Detailed technical specifications
│   ├── ARCHITECTURE.md                  # System architecture & component design
│   ├── REQUIREMENTS.md                  # Functional & non-functional requirements
│   ├── API.md                           # REST API contracts
│   ├── DATABASE.md                      # MongoDB schema design
│   ├── PROJECT_STATE.md                 # Current phase tracker
│   ├── README_AI.md                     # AI developer guide & coding rules
│   └── ...
├── frontend2/                           # Next.js App Router Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (applicant)/app/         # Candidate Portal (Dashboard, Jobs, Resume, Applications, Skill-Gap)
│   │   │   ├── recruiter/               # Recruiter Portal (Job listings, Candidates, Detailed Evaluation, Comparison, Upload)
│   │   │   ├── globals.css              # Theme tokens & glassmorphism system
│   │   │   └── page.tsx                 # Landing / Portal Selector
│   │   ├── components/
│   │   │   ├── layout/                  # Shell, Topbar, Sidebar, LiquidBackground, Header
│   │   │   ├── recruiter/               # CandidateTable, filter bars, radar charts
│   │   │   └── ui/                      # CommandMenu, ToastProvider, custom buttons
│   │   ├── lib/
│   │   │   ├── context/                 # State management (Applicant, Recruiter, Theme)
│   │   │   └── services/                # mock.ts (rich mock data), matchingEngine.ts
│   │   └── types/                       # Core TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── careersync-ai-master-context.md      # Master single-source-of-truth document
├── careersync-ai-frontend-design-plan.md# Design specifications & UX blueprints
└── README.md
```

---

## 🚀 4. How to Run the Frontend
1. Navigate to the `frontend2` directory:
   ```bash
   cd frontend2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web app at `http://localhost:3000`.

---

## 🧭 5. Next Steps for Claude & Developers
1. **Backend Integration**: Wire `frontend2/src/lib/services/api.ts` to connect with backend endpoints.
2. **AI Microservice**: Implement Python FastAPI parsing pipeline in `ai-services/` for PDF resume parsing and embedding generation.
3. **Database Layer**: Implement Mongoose models in `backend/` and `database/`.
