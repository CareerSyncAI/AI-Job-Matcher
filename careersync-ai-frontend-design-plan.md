# CareerSync AI — Frontend Redesign: Architecture & Design Plan

**v1.0 · Planning & design only — nothing here is built yet**

This is a self-contained, portable spec (plain Markdown, no build steps) so you can drop it straight into your v4.0 master context doc or paste it into another AI tool session, same as your usual workflow.

### Status tag legend (same convention as your master doc)
`CONFIRMED` locked · `PROPOSED` my recommendation, needs your yes/no · `OPEN` genuinely undecided, flagged for you · `OUT OF SCOPE` explicitly excluded for now

---

## Table of Contents
1. [Design Philosophy & Reference Synthesis](#1-design-philosophy--reference-synthesis)
2. [Brand Concept — "The Aperture"](#2-brand-concept--the-aperture)
3. [Information Architecture](#3-information-architecture)
4. [Access Control & Route Architecture](#4-access-control--route-architecture)
5. [Design System](#5-design-system)
6. [Signature Screens](#6-signature-screens)
7. [Responsive Behavior](#7-responsive-behavior)
8. [Accessibility Commitments](#8-accessibility-commitments)
9. [Voice & Microcopy Principles](#9-voice--microcopy-principles)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Open Decisions Requiring Your Call](#11-open-decisions-requiring-your-call)
12. [Reference Audit Appendix](#12-reference-audit-appendix)

---

## 1. Design Philosophy & Reference Synthesis

Your current UI (dark navy, purple, glassmorphic) reads as the same "AI SaaS starter kit" look most AI products default to right now. The goal here isn't a new coat of paint on the same shape — it's a system built from what CareerSync actually *is*: a tool that turns noisy, unstructured resumes and job specs into a clear, ranked, evidenced match.

That idea — **noise resolving into focus** — is the thread that runs through every decision below: the brand mark, the color logic, the one place glass is allowed to appear, and the signature data-viz element. It's also literally what your "comparative evidential judgment" screen does for a recruiter, and what the skill-gap page does for an applicant.

**`PROPOSED`** — Reject three defaults that AI-generated design tends to fall into regardless of subject: (1) warm cream + terracotta serif, (2) near-black + one acid accent, (3) hairline-rule broadsheet layout. None of these say anything about hiring or matching specifically, so none of them are used here.

I checked the five references you sent. Short version: three of the Dribbble shots (TrafficTrace, Horizon Homes, and — most likely, per the shot ID range — the Fintech Investment Portfolio piece) are all by **Phenomenon Studio**, so they're really one consistent design voice, not three. The Luno template is a generic multi-industry Bootstrap admin kit (literally the same shell reskinned for hospitals, restaurants, crypto, and job portals) — useful as a *page-type checklist*, not a look to imitate; copying its visual language would be the "template feel" you explicitly want to move away from. Full breakdown of what was kept vs. rejected from each is in [§12](#12-reference-audit-appendix).

---

## 2. Brand Concept — "The Aperture"

**Mark:** three overlapping arcs forming a camera-iris silhouette — the same shape whether it's rendered as your logo, your match-score ring, or your "AI is thinking" loading state. One glyph, three jobs. That repetition *is* the signature element (per design-system best practice: spend your boldness in one place and repeat it, don't scatter five different clever ideas).

- **Wordmark:** `CareerSync` set in Clash Display 600, tight tracking, mark to the left.
- **Tagline:** *"Bring the right match into focus."*
- **Favicon / small sizes:** the mark simplifies to a single arc + dot at 16–32px.
- **Motion identity:** the iris opens (rotates + expands from center) exactly once per session on first dashboard paint, and doubles as the AI-processing spinner during resume parsing / match computation. It never plays on every route change — that reads as decoration, not meaning.

---

## 3. Information Architecture

### Public (unauthenticated)
```
/                     Landing (marketing home)
/how-it-works
/for-recruiters       Marketing subpage, recruiter value prop
/for-applicants       Marketing subpage, applicant value prop
/about                Project context
/responsible-ai       Fairness / bias-awareness page (academic framing — ties to your
                       NYC LL144 / EU AI Act / EEOC awareness section, not a compliance claim)
/login                Applicant + Recruiter (tabbed)
/register             Applicant + Recruiter (tabbed)
/admin-login          Unlinked, direct-URL only — no public nav entry point
/404 · /403 · /500
```

### Applicant (`role: applicant`)
```
/app/dashboard         Home — profile completeness, top match, active applications
/app/profile           Editable ResumeProfile (skills, experience, education)
/app/resume            Resume manager — versions, parsed preview, re-upload
/app/jobs              Browse + search + filter
/app/jobs/[id]         Job detail + match score breakdown + skill gap for that job
/app/applications       Tracker — list with pipeline status
/app/applications/[id]  Timeline detail
/app/skill-gap          Aggregate skill-gap analysis across saved/applied jobs
/app/recommendations    Tier 3 stretch — bidirectional recommendations, interest inference
/app/notifications
/app/settings           Account, privacy, theme
```

### Recruiter (`role: recruiter`)
```
/recruiter/dashboard              Pipeline overview, open roles, funnel metrics
/recruiter/jobs                   Job postings list
/recruiter/jobs/new
/recruiter/jobs/[id]/edit
/recruiter/jobs/[id]/candidates   Ranked candidate table — the core evidential-judgment screen
/recruiter/jobs/[id]/candidates/[cid]   Candidate detail — parsed resume + evidence + notes
/recruiter/upload                 Bulk resume upload + live parse-status
/recruiter/pipeline               Kanban: Applied → Screened → Shortlisted → Interview → Offer
/recruiter/compare                Multi-candidate side-by-side workspace (flagship screen)
/recruiter/company                Company profile shown to applicants
/recruiter/notifications
/recruiter/settings
```

### Admin (`role: admin`)
```
/admin/overview        Platform health — users, jobs, applications at a glance
/admin/users           Manage recruiters + applicants
/admin/users/[id]
/admin/jobs             Moderate postings — flag / approve / remove
/admin/ai-monitor       Parsing success rate, embedding queue, match latency
/admin/audit-log        Admin + recruiter action trail
/admin/compliance       Academic fairness/bias-audit style summary (demo-scope, not a real compliance product)
/admin/settings
```

**`OPEN`** — Admin wasn't previously scoped in your Tier 1–3 breakdown; I've designed it here since you asked, but flagged it as its own phase in [§10](#10-implementation-roadmap) rather than folding it into Tier 1. Confirm whether it's core-scope for the demo or a nice-to-have.

---

## 4. Access Control & Route Architecture

### Route → role matrix

| Route prefix | Applicant | Recruiter | Admin | Guest |
|---|---|---|---|---|
| `/`, `/how-it-works`, `/for-*`, `/about`, `/responsible-ai` | ✅ | ✅ | ✅ | ✅ |
| `/login`, `/register` | redirect → own dashboard if already signed in | same | same | ✅ |
| `/admin-login` | — | — | ✅ | ✅ (form only) |
| `/app/*` | ✅ | ❌ → 403 | ❌ → 403 | → `/login` |
| `/recruiter/*` | ❌ → 403 | ✅ | ❌ → 403 | → `/login` |
| `/admin/*` | ❌ → 403 | ❌ → 403 | ✅ | → `/admin-login` |

`403` always offers a "Go to your dashboard" link rather than a dead end.

**`CONFIRMED` (recommended convention):** no public admin registration. Admin accounts are seeded or created by an existing admin from `/admin/users` — this matches how real hiring platforms handle admin provisioning and is one less form to secure.

### Next.js route-group structure (App Router)
```
app/
  (marketing)/        public pages, MarketingLayout
  (auth)/              login / register / admin-login, minimal layout
  (applicant)/app/     guarded: role === "applicant"
  (recruiter)/recruiter/  guarded: role === "recruiter"
  (admin)/admin/       guarded: role === "admin"
```
Each guarded group gets its own `layout.tsx` that checks the session role and renders the matching sidebar shell. `middleware.ts` does the first-pass redirect (unauthenticated → `/login`, wrong role → `/403`) before the page even renders, so there's no flash of the wrong dashboard.

**Important engineering note:** the Next.js middleware is a UX convenience, not a security boundary. Your Flask backend has to independently verify the role claim on every protected endpoint (`/api/recruiter/*`, `/api/admin/*`, etc.) — never trust that a request reaching an endpoint came through the "right" frontend route.

---

## 5. Design System

### 5.1 Color System

Usage discipline: **60% neutral surfaces, 30% text/borders, 10% accent** — max, on any single screen. This is the main lever against the "messy" look you're worried about; almost every generic AI dashboard fails this ratio by drowning everything in accent color.

Two accents, split by audience — because your own redesign brief already separates recruiter-side and applicant-side UX philosophy, this gives that distinction an actual visual identity instead of just different copy:

- **Signal (cool, precision)** — default for Recruiter + Admin surfaces. Data, trust, control-room feel.
- **Aperture (warm, human)** — default for Applicant surfaces. Hope, approachability, momentum.

Both live in one shared system; either can be used anywhere the *meaning* calls for it (e.g., a recruiter's own profile settings can use Aperture gold for a personal touch).

#### Dark theme tokens
| Token | Hex / value | Use |
|---|---|---|
| `ink-base` | `#0D0F14` | Page background |
| `ink-surface` | `#161922` | Level-1 card fill |
| `ink-border` | `rgba(255,255,255,0.08)` | Card / divider borders |
| `text-primary` | `#F2F3F5` | Headings, primary text |
| `text-secondary` | `#A6ACBB` | Body, labels |
| `text-tertiary` | `#6B7284` | Placeholder, disabled |
| `signal-500` | `#1FB6C4` | Primary accent (recruiter/admin) |
| `signal-600` | `#159AA6` | Hover/active |
| `aperture-500` | `#C6902F` | Primary accent (applicant) |
| `aperture-600` | `#A97522` | Hover/active |
| `success` | `#2FAE6B` | Positive status |
| `warning` | `#E3A008` | Caution |
| `danger` | `#E24C4B` | Destructive only |

#### Light theme tokens
| Token | Hex / value | Use |
|---|---|---|
| `paper-base` | `#F5F6F8` | Page background (cool neutral, deliberately not warm cream) |
| `paper-surface` | `#FFFFFF` | Level-1 card fill |
| `paper-border` | `rgba(13,15,20,0.08)` | Card / divider borders |
| `text-primary` | `#14161C` | Headings, primary text |
| `text-secondary` | `#565D6D` | Body, labels |
| `text-tertiary` | `#8A90A0` | Placeholder, disabled |
| `signal-500` / `600` | same as dark | Primary accent (recruiter/admin) |
| `aperture-500` / `600` | same as dark | Primary accent (applicant) |
| `success` / `warning` / `danger` | same as dark | Status |

**Status colors, one deliberate call:** "Rejected" applications use a neutral grey badge, not red. Red is reserved strictly for destructive actions and real errors — using it for "this person didn't get the job" is unnecessarily harsh, and it's an easy, defensible improvement over most ATS UIs.

**Score chips:** ≥80% → success green · 50–79% → signal teal · below 50% → neutral. Never danger red on a candidate's score — a low match isn't a system error, it shouldn't look like one.

### 5.2 Typography

| Role | Typeface | Weight(s) | Where |
|---|---|---|---|
| Display | Clash Display | 500 / 600 | Marketing headlines, page titles, the Aperture wordmark |
| Body | General Sans | 400 / 500 / 600 | All UI text, paragraphs, labels |
| Data | JetBrains Mono | 500 | Scores, percentages, timestamps, table numerics, skill-tag codes |

All three are free (Fontshare / open license) — no licensing cost for an SGP build.

| Style | Size / line-height | Weight |
|---|---|---|
| Display XL | 56 / 60 | Clash Display 600 — marketing hero only |
| Display L | 40 / 48 | Clash Display 600 — page titles |
| Display M | 28 / 36 | Clash Display 500 — section headers |
| Heading | 20 / 28 | General Sans 600 |
| Body L | 16 / 26 | General Sans 400 |
| Body M | 14 / 22 | General Sans 400 — default UI text |
| Caption | 12 / 16, +2% tracking, uppercase | General Sans 500 — eyebrows, labels |
| Data L | 32 / 36 | JetBrains Mono 500 — match-score numerals |
| Data M | 14 / 20 | JetBrains Mono 500 — table figures |

### 5.3 Spacing & Grid

- Base unit: 8px. Scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Sidebar: 240px expanded / 72px icon-rail collapsed.
- Content max-width: 1440px (dashboards), 1200px (marketing).
- Grid: 12-col desktop, 8-col tablet, 4-col mobile. Gutter 24 / 16 / 16.

### 5.4 Elevation & Surface System (incl. Liquid Glass)

| Level | Surface | Treatment |
|---|---|---|
| 0 | Canvas | `ink-base` / `paper-base`, no border |
| 1 | Flat card | 1px border, no shadow — default for content-heavy cards, tables, forms |
| 2 | Raised card | Soft shadow, +2px lift on hover — interactive cards, stat tiles |
| 3 | **Glass** | Translucent, blurred, specular top edge — see spec below |
| 4 | Modal / critical overlay | Glass + 40% scrim behind |

**Liquid Glass spec** (informed by Apple's current implementation guidance — glass should recede and let content stay primary, not the other way around):

| Property | Value |
|---|---|
| Backdrop blur | 24px (dashboard chrome) / 32px (marketing overlays) |
| Saturation boost | 140–160% |
| Fill — dark | `rgba(22,25,34,0.55)` |
| Fill — light | `rgba(255,255,255,0.62)` |
| Border | 1px `rgba(255,255,255,0.14)`, top/left-biased highlight |
| Motion response | 2–4° cursor/scroll parallax, desktop only |
| Fallback | `prefers-reduced-transparency` → flat Level-2, no blur |

**Where glass is allowed:** top nav bar, the ⌘K command palette, the notification drawer, the candidate-compare tray, modal dialogs, an actively-focused card.

**Where it's banned:** body cards, tables, forms, any surface carrying paragraph text as its primary content. This one rule is what keeps the whole UI from turning into the over-glassed, everything-is-translucent look your current dashboard has — glass becomes meaningful (it appears exactly when you're *focusing* on something) instead of decorative wallpaper.

### 5.5 Iconography

Lucide icon set, 1.5px stroke, rounded joins (echoes the aperture's circular geometry). 20px default, 16px in dense tables, 24px in the nav rail. Active nav items get a duotone treatment (12% accent-tint fill + accent stroke); everything else stays outline-only.

### 5.6 Motion Principles

| Moment | Timing | Notes |
|---|---|---|
| Hover / press | 120–160ms ease-out | Lift + shadow only — no scale-transform, it reads cheap |
| Panel / drawer | 200–240ms ease-in-out | Compare tray, notification drawer |
| Signature moment | 400–600ms | Aperture iris-open on first dashboard paint per session; score-ring fill on load |
| Marketing scroll reveal | 40ms stagger, rise+fade only | No bounce/elastic easing anywhere |

Everything above collapses to instant opacity swaps under `prefers-reduced-motion`. One signature moment is used, not five small clever ones — restraint is the actual differentiator here, not more motion.

### 5.7 Component Inventory

| Component | Variants | Key notes |
|---|---|---|
| Button | Primary (role-aware accent) · Secondary (outline) · Ghost (text) · Danger · Glass (inside Level-3 only) | Focus ring: 2px accent, 2px offset, never removed |
| Card | Data (stat + sparkline) · Content (job/candidate row) · Comparison (glass) · Empty-state | |
| Badge | Skill tag (with match-checkmark variant) · Status badge · Score chip | Status never relies on color alone — icon + label always present |
| Table | Sticky header, sortable, density toggle (comfortable/compact), right-aligned mono numerics | Candidate ranking table is the flagship instance |
| Form | Multi-step wizard w/ aperture-ring progress indicator · drag-drop resume dropzone with live parse status · inline validation | |
| Nav | Sidebar (collapsible icon-rail) + top bar (search/⌘K, notifications, theme toggle, avatar) + breadcrumbs | Mobile: bottom tab bar (4–5 items) + drawer for the rest |
| Modal / overlay | Glass, focus-trapped, ESC + outside-click to close | Irreversible admin actions require typed confirmation |
| Data viz | Aperture Score Ring (signature, replaces a generic donut) · Skill Radar (resume vs. requirement overlay) · Pipeline Funnel · Trend sparkline | `PLANNED`: implement with `recharts` — it's declarative and already in your available toolchain |
| Empty / loading / error | Content-shaped skeletons (mirror final layout, not generic grey bars) · empty state = icon + one line + primary CTA · error = plain explanation + retry | See [§9](#9-voice--microcopy-principles) for the copy rules behind these |

---

## 6. Signature Screens

### Landing hero
```
┌──────────────────────────────────────────────────────────┐
│ ⌾ CareerSync AI      Product  Recruiters  Applicants   [Sign in] [Get started] │
├──────────────────────────────────────────────────────────┤
│  AI-POWERED HIRING SIGNAL                                 │
│  Bring the right match                                    │
│  into focus.                                               │
│  One line explaining the value for both audiences.        │
│  [ I'm hiring → ]     [ I'm job-hunting → ]                │
│                                                              │
│        ○  scattered dim dots (resumes) drifting inward     │
│           toward one focused point (the match) — the       │
│           aperture motif, live, as the hero visual         │
└──────────────────────────────────────────────────────────┘
```

### Applicant dashboard (bento grid)
```
┌ Sidebar ┬────────────────────────────────────────────────┐
│ ⌾        │ Good evening, [name]        🔍⌘K   🔔   ☾/☀   👤 │
│ Home    ├────────────────────────────────────────────────┤
│ Profile │ ┌ Profile 72% ┐ ┌ Top match 91% ┐ ┌ Applications ┐│
│ Jobs    │ │ [Finish →]  │ │ [View →]      │ │ 4 active     ││
│ Applic. │ └─────────────┘ └───────────────┘ └──────────────┘│
│ Skills  │ ┌ Skill-gap radar ─────┐ ┌ Recommended jobs ────┐│
│ Notifs  │ │                       │ │ card · card · card    ││
│ Settings│ └───────────────────────┘ └────────────────────────┘│
└─────────┴────────────────────────────────────────────────┘
```

### Recruiter ranking + compare — the flagship "evidential judgment" screen
```
┌ Sidebar ┬────────────────────────────────────────────────┐
│         │ Frontend Engineer · 128 candidates   [Bulk upload] [Post job] │
│         ├────────────────────────────────────────────────┤
│         │ Filters: skill ▾  experience ▾  score ▾   ▢ select to compare │
│         │ ┌────────────────────────────────────────────┐ │
│         │ │ ☑ Ava T.     94%●  React, TS       Screened │ │
│         │ │ ☑ Marcus L.  88%●  Python           Applied │ │
│         │ │ ☐ Priya S.   85%●  React, Node     Applied  │ │
│         │ │  … sortable, sticky header, density toggle   │ │
│         │ └────────────────────────────────────────────┘ │
│         │            [ 2 selected · Compare ▸ ]           │
└─────────┴────────────────────────────────────────────────┘
   ── Glass compare tray slides up (Level 3) ──────────────────
   │ Ava T.  94% ●         │ Marcus L.  88% ●                │
   │ ✓ React  ✓ 5yrs exp   │ ✓ Python  ✗ AWS (gap)            │
   │ ✗ AWS (gap)           │ ✓ 4yrs exp                        │
```

### Admin AI pipeline monitor
```
┌ Sidebar ┬────────────────────────────────────────────────┐
│         │ AI Pipeline Health                              │
│         ├────────────────────────────────────────────────┤
│         │ ┌ Parse success ┐ ┌ Embed queue ┐ ┌ Match latency ┐│
│         │ │ 97.2%          │ │ 12 pending   │ │ 340ms avg     ││
│         │ └────────────────┘ └──────────────┘ └───────────────┘│
│         │ ┌ Recent parse failures ─────────────────────┐│
│         │ │ file.pdf  OCR fallback triggered   Retry ⟳  ││
│         │ └──────────────────────────────────────────────┘│
└─────────┴────────────────────────────────────────────────┘
```
This screen is a quiet but important differentiator for demo day: it visibly proves the AI/ML pipeline is real infrastructure (parsing, embeddings, latency) rather than a rules engine wearing an "AI" label.

### Job detail with match breakdown (applicant side)
Hero: job title, company, Aperture Score Ring front and center (not buried below the fold). Below: a two-column split — left is the job description, right is "Why this score" — a short evidenced list (skills matched, skills missing, experience delta) generated from the same MatchResult data the recruiter sees, just framed constructively for the applicant.

---

## 7. Responsive Behavior

| Breakpoint | Width | Sidebar | Grid | Tables |
|---|---|---|---|---|
| Mobile | < 640px | Bottom tab bar (5 items) + drawer | 1 column | Stack into cards |
| Tablet | 640–1023px | Icon-rail (72px), collapsible | 2 columns | Horizontal scroll, sticky first column |
| Desktop | 1024–1439px | Full (240px) | 3 columns | Full table |
| Wide | ≥ 1440px | Full + optional right rail | 4 columns, centered at 1440 max | Full table + extra columns |

---

## 8. Accessibility Commitments

- WCAG 2.1 AA minimum contrast (4.5:1 body, 3:1 large text/UI) verified on **both** flat and glass surfaces — glass gets a minimum-opacity floor so text never drops below AA mid-transition.
- Body/paragraph text is never placed directly on a Level-3 glass surface — glass carries chrome, short labels, and numerals only.
- `prefers-reduced-motion` disables the iris animation, parallax, and scroll reveals — swapped for instant opacity fades.
- `prefers-reduced-transparency` / `prefers-contrast` swap glass to flat Level-2 surfaces.
- Status and score never rely on color alone — always paired with an icon or label (colorblind-safe by construction, not by afterthought).
- Visible 2px focus ring on every interactive element; never removed, only restyled.
- Minimum 44×44px tap targets on touch surfaces.
- Form errors are announced inline and programmatically associated (`aria-describedby`), not color-only.
- The resume dropzone has a real, keyboard-and-screen-reader-accessible file input underneath the drag-and-drop layer — never a JS-only custom control with no fallback.

---

## 9. Voice & Microcopy Principles

- Name things by what people control, not how the system works: "Upload your resume," never "Initiate document ingestion."
- Active voice, and a button's label matches its resulting toast: "Post a job" → "Job posted."
- Empty states are an invitation, not a dead end: *"No applications yet — browse open roles to get started"* + a primary button, not just "No data."
- Errors explain what happened and offer the next step, without over-apologizing: *"We couldn't parse this file. Try a PDF or DOCX under 5MB."*
- One job per element: a label labels, an example demonstrates — nothing quietly does double duty.

---

## 10. Implementation Roadmap

Mapped to your existing Tier structure so design work and build phases stay in sync:

- **Phase 1 (Tier 1 — guaranteed demo):** design tokens + shared component library, public landing, recruiter dashboard, job posting, bulk upload, ranked candidate table, candidate detail, 2-candidate compare.
- **Phase 2 (Tier 2):** applicant auth, dashboard, profile/resume manager, job browse + detail, apply flow, application tracker.
- **Phase 3 (Tier 3 — stretch, includes the newly-requested admin role):** recommendations, dedicated skill-gap page, multi-candidate compare tray, full admin panel (overview, users, jobs, AI monitor, audit log, compliance).

### Suggested folder structure (Next.js App Router — structure only, no code)
```
app/
  (marketing)/
  (auth)/
  (applicant)/app/
  (recruiter)/recruiter/
  (admin)/admin/
components/
  ui/            → design-system primitives: Button, Card, Badge, GlassPanel, ScoreRing...
  marketing/
  applicant/
  recruiter/
  admin/
lib/
  theme/         → color.ts, type.ts, motion.ts — the tokens from §5, machine-readable
  auth/          → role/session helpers
  api/           → typed client for Flask endpoints, matching ResumeProfile/JobProfile/MatchResult
```

---

## 11. Open Decisions Requiring Your Call

- `OPEN` — Per-role default theme (dark for recruiter/admin, light for applicant, both still user-toggleable) vs. one global default for everyone.
- `OPEN` — Whether the admin role is in-scope for the actual demo build or design-now/build-later.
- `OPEN` — Whether `/recruiter/team` (multi-seat recruiter accounts) is wanted — not in your prior scoping, so it's left out of the IA above pending your call; treat as `OUT OF SCOPE` unless you say otherwise.
- `OPEN` — Formal adoption of `recharts` for the data-viz components (Score Ring, Skill Radar, Funnel) — proposed, not locked.
- Reminder: your still-open items from the master doc (Next.js 15 vs 16, skill-extraction technique) don't block this design work, but the **MatchResult data contract** does need to be finalized before real data gets wired into the Score Ring / evidence list / skill-gap components — that's the one hard dependency between this plan and your backend decisions.

---

## 12. Reference Audit Appendix

| Reference | What it actually is | Adopted here | Deliberately left out |
|---|---|---|---|
| Awwwards, "AI analysis" search | Current award-tier trend signal for 2026 | Editorial data-storytelling for the match-breakdown / skill-gap screens, bento-grid composition, oversized display type, one signature motion moment | 3D/WebGL showpiece interactions and brutalist experiments — wrong register for a hiring tool that needs to read as trustworthy fast |
| Luno (wrraptheme) admin template | A generic multi-industry Bootstrap 5 admin kit, reskinned across hospitals, restaurants, crypto, job portals, etc. | Used only as a *page-type checklist* (kanban, calendar, file manager, timeline) to sanity-check the IA isn't missing an archetype | Its visual language — it's the definition of the template-derived look you're moving away from |
| TrafficTrace (Phenomenon Studio) | SaaS analytics dashboard for a web-traffic monitoring product | Calm data density, filterable real-time widgets, customizable-dashboard pattern → applied to the recruiter funnel view | Its specific brand skin — not reused verbatim |
| Horizon Homes (Phenomenon Studio) | Real-estate marketplace dashboard | Image-forward card browsing + saved/favorite pattern → applied to the applicant Jobs Browse screen | Property-specific widgets (virtual tours, agent chat) with no hiring equivalent |
| Fintech Investment Portfolio | Data-dense financial dashboard | Numeric-forward layout discipline — right-aligned figures, mono numerals, sparklines → applied to score/funnel data | Finance-specific chart types (candlestick, allocation donuts) that don't apply |

---

*End of v1.0. This is a design spec, not a build — no components, pages, or styles have been generated from it yet.*
