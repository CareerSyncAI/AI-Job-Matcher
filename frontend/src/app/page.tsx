"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CareerSyncBrand,
  IconNetwork,
  IconDocument,
  IconTarget,
} from "@/components/Icons";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500/20 selection:text-emerald-700 antialiased overflow-x-hidden">
      {/* FIXED GLASS NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <CareerSyncBrand size={32} showTagline={true} isLight={true} />
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition">
              Features
            </a>
            <a href="#how-it-works" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition">
              How it works
            </a>
            <a href="#solutions" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition">
              Solutions
            </a>
            <a href="#free-forever" className="px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg transition">
              Free Access
            </a>
            <a href="#faq" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition">
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

          {/* Mobile Menu Toggle */}
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
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl p-4 space-y-3 shadow-xl max-h-[calc(100vh-4.5rem)] overflow-y-auto">
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
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-24 overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50/50">
        {/* Animated Background Mesh & Grids */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(5,150,105,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.06) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 75%)",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Kicker */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8 backdrop-blur-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-ping" />
              <span className="font-mono text-xs font-bold text-[#059669] tracking-wider uppercase">
                100% Free AI Job Matcher &amp; ATS Resume Engine
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12] mb-6">
              Match jobs &amp; optimize resumes with<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] via-emerald-600 to-[#0d9488]">
                AI vector intelligence for free
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
              Upload your CV once. <strong>CareerSync AI</strong> parses your skill graph, matches high-affinity tech jobs, and optimizes your resume for ATS screening — completely free without hidden fees.
            </p>

            {/* Hero Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Create Free Account
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:border-emerald-500/50 hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Sign In to Dashboard →
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Instant AI Vector Matching
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Free Resume ATS Analyzer
              </span>
            </div>
          </div>

          {/* Clean Demo Preview Card */}
          <div className="max-w-4xl mx-auto mt-16 rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                  96%
                </div>
                <div>
                  <h3 className="text-slate-100 font-bold text-sm sm:text-base">
                    Senior Full Stack AI Engineer
                  </h3>
                  <p className="text-slate-400 text-xs">Vector Match Affinity • High Confidence</p>
                </div>
              </div>
              <span className="px-3.5 py-1 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0">
                ⚡ 100% Free Matching Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Extracted Skill Graph</h4>
                <div className="flex flex-wrap gap-2">
                  {["React / Next.js", "FastAPI / Python", "TypeScript", "Vector DB", "PostgreSQL"].map((s, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">ATS Score Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Semantic Match Alignment</span>
                    <span className="font-semibold text-emerald-400">96%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full w-[96%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              PLATFORM FEATURES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
              Comprehensive Career &amp; Hiring Intelligence
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Designed for candidates looking to boost match rates and recruiters seeking top talent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuresList.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[#059669] border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <IconComp size={24} className="text-[#059669]" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-lg mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              FOUR STEPS TO SUCCESS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Simple 4-Step Matching Workflow
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

      {/* FREE FOREVER HIGHLIGHT SECTION */}
      <section id="free-forever" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white border border-emerald-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 text-center max-w-2xl mx-auto space-y-6">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold tracking-wider uppercase inline-block border border-emerald-500/30">
                100% FREE FOR ALL USERS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                No Paid Subscriptions. No Gated Features.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Whether you are a job candidate tailoring resumes or a recruiter screening applicants, CareerSync AI is completely free to use.
              </p>
              <div className="pt-2">
                <Link
                  href="/register"
                  className="px-8 py-3.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 inline-block"
                >
                  Create Your Free Account Now
                </Link>
              </div>
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

      {/* FOOTER */}
      <footer className="py-12 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <CareerSyncBrand size={24} showTagline={false} isLight={true} />
            <span className="text-slate-400">© {new Date().getFullYear()} CareerSync Platform</span>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed">
            Enterprise Semantic Matching &amp; ATS Resume Intelligence Environment.
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

const featuresList = [
  {
    icon: IconNetwork,
    title: "Semantic Vector Embeddings",
    description: "Multi-dimensional matching model analyzes verified candidate experience profiles rather than brittle keyword queries.",
  },
  {
    icon: IconDocument,
    title: "ATS Resume Studio",
    description: "Extract skill entities from PDF/DOCX resumes and get keyword density and formatting scores instantly.",
  },
  {
    icon: IconTarget,
    title: "Recruiter Radar",
    description: "Recruiters evaluate applicants across customizable scoring weights for skills, experience, and education.",
  },
];

const stepsList = [
  {
    num: "1",
    title: "Create Free Account",
    description: "Sign up as Candidate or Recruiter for full platform access.",
  },
  {
    num: "2",
    title: "Upload Resume / Job",
    description: "Upload CVs or create job specifications with target skills.",
  },
  {
    num: "3",
    title: "Vector Matching",
    description: "Our AI computes multi-dimensional match affinity scores.",
  },
  {
    num: "4",
    title: "Apply & Connect",
    description: "Apply with optimized ATS resumes or review top talent matches.",
  },
];

const faqList = [
  {
    q: "Is CareerSync AI really 100% free?",
    a: "Yes! Both job candidates and recruiters can use all features—including resume parsing, ATS scoring, and vector job matching—completely free.",
  },
  {
    q: "How does the AI vector matching engine work?",
    a: "Our backend converts resume texts and job specifications into high-dimensional vector embeddings, computing cosine similarity scores for true semantic fit.",
  },
  {
    q: "How do I optimize my resume for ATS screening?",
    a: "Use our built-in Resume Studio to upload your CV. The system checks keyword alignment, section formatting, and skill density to ensure maximum pass rates.",
  },
];
