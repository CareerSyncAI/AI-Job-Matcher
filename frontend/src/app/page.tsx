"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"candidate" | "recruiter">("candidate");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-sans selection:bg-emerald-500/20 selection:text-emerald-700 antialiased overflow-x-hidden">
      {/* NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-display font-extrabold text-lg shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              T
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-slate-900 tracking-tight leading-none">
                Talent<span className="text-[#059669]">IQ</span> AI
              </span>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase mt-0.5">
                CareerSync Intelligence
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              Features
            </a>
            <a href="#how-it-works" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              How it works
            </a>
            <a href="#solutions" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              For Candidates & Recruiters
            </a>
            <a href="#faq" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              FAQ
            </a>
          </div>

          {/* Right Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-xl transition shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 hover:-translate-y-0.5 flex items-center gap-1.5"
            >
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3 shadow-xl">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
              Features
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
              How it works
            </a>
            <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
              Solutions
            </a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
              FAQ
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link href="/login" className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl">
                Sign in
              </Link>
              <Link href="/register" className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#059669] rounded-xl shadow">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-24 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-slate-50/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_20%_25%,rgba(5,150,105,0.09)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_80%_65%,rgba(13,148,136,0.07)_0%,transparent_50%)]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(5,150,105,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.05) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 75%)",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Kicker */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span className="font-mono text-xs font-semibold text-[#059669] tracking-wider uppercase">
                AI Vector Matching · Resume Parsing · Career Engine
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
              AI Job Matching &amp; Resume Intelligence,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] via-emerald-600 to-[#0d9488]">
                powered by deep vector embeddings
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
              Stop endless job applications. <strong>TalentIQ AI</strong> analyzes candidate skill vectors, rewrites resumes for ATS compatibility, and matches top talent with dream tech roles instantly.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Create Candidate Account
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:border-emerald-500/40 hover:-translate-y-0.5 transition shadow-sm flex items-center justify-center gap-2"
              >
                Recruiter Portal →
              </Link>
            </div>
          </div>

          {/* Interactive Live Demo Preview Widget */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  96%
                </div>
                <div>
                  <h3 className="text-slate-100 font-bold text-sm sm:text-base">
                    Senior Full Stack AI Engineer Match
                  </h3>
                  <p className="text-slate-400 text-xs">Vector Match Affinity Score • High Confidence</p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0">
                ⚡ Vector Embeddings Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Candidate Skills Identified</h4>
                <div className="flex flex-wrap gap-2">
                  {["React / Next.js", "FastAPI / Python", "TypeScript", "Vector Databases", "LangChain"].map((s, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">ATS Optimization Score</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Semantic Skill Alignment</span>
                    <span className="font-semibold text-emerald-400">98%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full w-[98%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 bg-white border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              CORE CAPABILITIES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
              Engineered for precision job matching
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Powered by PyTorch, SentenceTransformers, and FastAPI for real-time career intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuresList.map((feat, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/40 hover:-translate-y-1 transition duration-300 shadow-sm hover:shadow-md group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[#059669] border border-emerald-500/20 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="font-display font-bold text-slate-900 text-lg mb-3">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              FOUR STEPS TO SUCCESS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              From upload to tailored application
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stepsList.map((step) => (
              <div key={step.num} className="text-center group">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white font-display font-bold text-lg flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CANDIDATES VS RECRUITERS TABBED SECTION */}
      <section id="solutions" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              TAILORED SOLUTIONS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-6">
              Built for Candidates &amp; Recruiters
            </h2>

            {/* Role Toggle Switch */}
            <div className="inline-flex p-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setActiveTab("candidate")}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "candidate"
                    ? "bg-[#059669] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                For Job Candidates
              </button>
              <button
                onClick={() => setActiveTab("recruiter")}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "recruiter"
                    ? "bg-[#059669] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                For Recruiters &amp; Employers
              </button>
            </div>
          </div>

          {/* Role Dynamic Content */}
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="px-3 py-1 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full inline-block">
                {activeTab === "candidate" ? "Candidate Workspace" : "Recruiter Command Center"}
              </span>
              <h3 className="font-display text-2xl font-bold text-slate-100">
                {activeTab === "candidate"
                  ? "Land interviews with AI-tailored applications & ATS scores"
                  : "Filter 100+ applications into top 5% matched talent"}
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                {activeTab === "candidate"
                  ? "Upload your resume once. Our vector embedding model extracts your skill graph, matches high-affinity roles, and suggests exact keyword enhancements for ATS success."
                  : "Post job requirements and let our semantic matching engine evaluate incoming resumes based on multi-dimensional weights (skills, experience, education, semantic similarity)."}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/30"
              >
                {activeTab === "candidate" ? "Start Matching Now" : "Post a Job & Find Talent"} →
              </Link>
            </div>

            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="text-xs font-mono text-emerald-400 font-semibold uppercase">
                {activeTab === "candidate" ? "Candidate Highlights" : "Recruiter Metrics"}
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                {(activeTab === "candidate" ? candidateHighlights : recruiterHighlights).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold text-sm">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Questions, answered
            </h2>
          </div>

          <div className="space-y-3">
            {faqList.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl bg-white overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-semibold text-sm sm:text-base text-slate-900 flex justify-between items-center gap-4 hover:text-[#059669] transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-xl text-[#059669] font-bold shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="py-20 bg-gradient-to-r from-[#059669] via-[#047857] to-[#0d9488] text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to find your next AI-matched role?
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto">
            Experience deep vector resume intelligence and automated job alignment today.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3.5 bg-white text-[#059669] font-bold text-sm rounded-xl hover:bg-emerald-50 transition shadow-lg shadow-black/10 hover:-translate-y-0.5"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#059669] text-white flex items-center justify-center font-display font-bold text-xs">
              T
            </div>
            <span className="font-display font-bold text-slate-900 text-sm">
              TalentIQ AI
            </span>
            <span>© {new Date().getFullYear()} CareerSync AI Intelligence</span>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed">
            FastAPI + Next.js Vector Embeddings &amp; Candidate Match Scoring System.
          </p>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-slate-900 transition">Privacy</a>
            <a href="#terms" className="hover:text-slate-900 transition">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Custom Feature Content
const featuresList = [
  {
    icon: "🧠",
    title: "Vector Embeddings & Semantic Search",
    description: "Go beyond rigid keyword matching. Our AI parses candidate experience into dense vector embeddings to calculate true semantic job fit.",
  },
  {
    icon: "📄",
    title: "Resume Studio & ATS Optimizer",
    description: "Extract structured skill entities from PDF/DOCX resumes and receive instant feedback on keyword alignment and formatting.",
  },
  {
    icon: "🎯",
    title: "Recruiter Radar Pipeline",
    description: "Recruiters configure custom scoring weights across skills, experience, education, and semantic similarity to automatically rank applicants.",
  },
];

const stepsList = [
  {
    num: "1",
    title: "Create Account",
    description: "Register as a Candidate or Recruiter with role-based dashboard access.",
  },
  {
    num: "2",
    title: "Upload Resume / Job",
    description: "Upload your CV or publish a new job specification with required skills.",
  },
  {
    num: "3",
    title: "AI Match Calculation",
    description: "Vector models analyze skill graphs and compute multi-dimensional affinity scores.",
  },
  {
    num: "4",
    title: "Apply & Hire",
    description: "Apply with tailored ATS resumes or review top candidate rankings instantly.",
  },
];

const candidateHighlights = [
  "Automatic skill extraction from PDF & DOCX resumes",
  "Semantic similarity matching against 1,000+ open tech roles",
  "ATS Score breakdown with missing keyword suggestions",
  "AI Mock Interview prep and guidance",
];

const recruiterHighlights = [
  "Automated resume screening with custom weight parameters",
  "Side-by-side candidate comparison & ranking radar",
  "FastAPI async pipeline handling bulk resume processing",
  "Role-based access control with secure JWT session handling",
];

const faqList = [
  {
    q: "How does the AI vector matching engine work?",
    a: "The backend uses PyTorch and Transformer models to project resume texts and job descriptions into high-dimensional vector spaces. Cosine distance between vectors determines match affinity.",
  },
  {
    q: "Is ATS scoring accurate for custom resumes?",
    a: "Yes! Our parser checks formatting, section structure, keyword density, and quantified achievement metrics to ensure maximum ATS pass rates.",
  },
  {
    q: "Can recruiters customize evaluation criteria?",
    a: "Absolutely. Recruiters can adjust evaluation weights for Skills, Experience, Education, and Semantic Fit to total 100% per job posting.",
  },
];
