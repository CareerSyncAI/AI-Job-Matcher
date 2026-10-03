"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function TalentAIQCareerLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-sans selection:bg-emerald-500/20 selection:text-emerald-700 antialiased overflow-x-hidden">
      {/* NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-decoration-none group">
            <div className="w-8 h-8 rounded-lg bg-[#059669] text-white flex items-center justify-center font-display font-bold text-base shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              T
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">
              Talent<span className="text-[#059669]">AIQ</span> Career
            </span>
          </Link>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#how" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              How it works
            </a>
            <a href="#pricing" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              Pricing
            </a>
            <a href="#faq" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
              FAQ
            </a>
          </div>

          {/* Right Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              TalentAIQ Labs™
            </span>
            <Link href="/login" className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-lg transition shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5"
            >
              Get Started
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
            <a
              href="#how"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              How it works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full text-center py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#059669] rounded-lg shadow"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center pt-32 pb-20 overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50/50">
        {/* Subtle Background Grids */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_30%,rgba(5,150,105,0.08)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_70%,rgba(13,148,136,0.06)_0%,transparent_50%)]" />
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(5,150,105,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.06) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 75%)",
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Pill Kicker */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="font-mono text-xs font-semibold text-[#059669] tracking-wider uppercase">
              TalentAIQ Career · by TalentAIQ Labs™
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Your next job,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#0d9488]">
              applied for while you sleep
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Upload your resume once. <strong>TalentAIQ Career</strong> finds roles that actually fit, tailors your application for each one, and applies on your behalf — then messages you the moment something happens.
          </p>

          {/* Hero Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Get Started — from ₹299/mo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-300 text-slate-800 font-medium text-sm rounded-xl hover:border-emerald-500/40 hover:-translate-y-0.5 transition shadow-sm"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how" className="py-24 bg-white border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              FOUR STEPS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
              From resume to applied.<br />No manual form-filling.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Everything after your resume upload runs on its own.
            </p>
          </div>

          {/* 4 Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative mb-16">
            {stepsData.map((step) => (
              <div key={step.number} className="text-center group">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white font-display font-bold text-lg flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                  {step.number}
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

          {/* Detailed Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {stepDetails.map((detail, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-500/30 transition shadow-xs"
              >
                <h4 className="font-display font-bold text-slate-900 text-base mb-2">
                  {detail.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {detail.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DIFFERENT SECTION */}
      <section className="py-24 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              WHY IT'S DIFFERENT
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Built for how job hunting<br />actually feels
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whyCards.map((card, idx) => (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/40 hover:-translate-y-1 transition duration-300 shadow-sm hover:shadow-md"
              >
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="font-display font-bold text-slate-900 text-base mb-2">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              PRICING
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
              Simple monthly plans.<br />Cancel anytime.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Pick the plan that matches how actively you're job hunting. Every plan includes AI matching, tailored applications, and status updates.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative p-8 rounded-2xl bg-white border-2 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? "border-[#059669] shadow-xl shadow-emerald-600/10 scale-105"
                    : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#059669] text-white font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    MOST POPULAR
                  </div>
                )}
                <div>
                  <span className="font-mono text-xs font-bold text-[#059669] tracking-wider uppercase block text-center mb-3">
                    {plan.name}
                  </span>
                  <div className="text-center mb-2">
                    <span className="font-display text-4xl sm:text-5xl font-extrabold text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">{plan.unit}</span>
                  </div>
                  <div className="text-xs font-bold text-center text-slate-700 bg-slate-100 py-1.5 rounded-lg mb-6">
                    {plan.apps}
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                        <span className="text-[#059669] font-bold shrink-0">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/register?plan=${plan.name.toLowerCase()}`}
                  className={`w-full py-3 rounded-xl font-semibold text-xs text-center transition ${
                    plan.popular
                      ? "bg-[#059669] hover:bg-[#047857] text-white shadow-md shadow-emerald-600/20"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="font-mono text-xs font-bold text-[#059669] tracking-widest uppercase mb-2 block">
              FAQ
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Questions, answered
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl bg-white overflow-hidden transition"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
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

      {/* BOTTOM CTA SECTION */}
      <section className="py-20 bg-gradient-to-r from-[#059669] via-[#047857] to-[#0d9488] text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to let AI handle your job applications?
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto">
            Join hundreds of candidates in India getting high-fit job interviews effortlessly.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3.5 bg-white text-[#059669] font-bold text-sm rounded-xl hover:bg-emerald-50 transition shadow-lg shadow-black/10 hover:-translate-y-0.5"
          >
            Start Applying Now — ₹299/mo
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
              TalentAIQ Career
            </span>
            <span>© {new Date().getFullYear()} TalentAIQ Labs™</span>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed">
            Data encrypted at rest & handled under India's Digital Personal Data Protection (DPDP) Act, 2023.
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

// Data Structures matching www.talentaiq.in/career
const stepsData = [
  {
    number: "1",
    title: "Create Profile",
    description: "Sign up and tell the agent what roles, locations, and salary range you're targeting.",
  },
  {
    number: "2",
    title: "Upload Resume",
    description: "One upload. The AI parses your skills, experience, and education automatically.",
  },
  {
    number: "3",
    title: "AI Matches & Tailors",
    description: "The agent finds relevant openings and rewrites your resume and cover note for each one.",
  },
  {
    number: "4",
    title: "Applies & Notifies",
    description: "Applications go out automatically. You get a WhatsApp or email update the moment something moves.",
  },
];

const stepDetails = [
  {
    title: "1 · Create your profile",
    text: "Sign up and set your preferences: the kind of roles you want, cities you're open to, and your expected salary range. The agent only applies to roles inside what you've told it you want.",
  },
  {
    title: "2 · Upload your resume",
    text: "Upload once, in PDF or DOCX. The AI extracts your skills, work history, and education so it has a structured picture of your background.",
  },
  {
    title: "3 · AI matches and tailors",
    text: "The agent searches relevant listings and scores them against your profile. For each strong match, it rewrites your resume and drafts a cover note specific to that job description.",
  },
  {
    title: "4 · Applies and notifies you",
    text: "Tailored applications are submitted on your behalf. Every time something happens, you get a message on WhatsApp or email — no dashboard-checking required.",
  },
];

const whyCards = [
  {
    icon: "🎯",
    title: "Actually tailored",
    text: "Not a mass-blast. Each application is rewritten against that specific job description.",
  },
  {
    icon: "💬",
    title: "WhatsApp-first",
    text: "Updates land where you already check — no separate app to babysit.",
  },
  {
    icon: "🔒",
    title: "DPDP compliant",
    text: "Your data is encrypted at rest, never sold, and deletable on request under India's DPDP Act, 2023.",
  },
];

const pricingPlans = [
  {
    name: "STARTER",
    price: "₹299",
    unit: "per month",
    apps: "5 applications/month",
    popular: false,
    features: [
      "Profile setup and preference matching",
      "AI resume parsing",
      "Ongoing job matching against your criteria",
      "Tailored resume & cover note per application",
      "Automatic application submission",
      "WhatsApp & email status notifications",
    ],
  },
  {
    name: "PRO",
    price: "₹599",
    unit: "per month",
    apps: "12 applications/month",
    popular: true,
    features: [
      "Everything in Starter",
      "More applications than Starter",
      "Priority matching queue",
      "Faster turnaround per application",
      "Dedicated AI Copilot recommendations",
    ],
  },
  {
    name: "POWER",
    price: "₹999",
    unit: "per month",
    apps: "25 applications/month",
    popular: false,
    features: [
      "Everything in Pro",
      "Highest monthly application volume",
      "Highest priority matching queue",
      "Best for an active, high-volume search",
      "Direct recruiter outreach acceleration",
    ],
  },
];

const faqItems = [
  {
    q: "How does job matching work?",
    a: "The AI parses your resume and preferences, then compares them against open roles using semantic matching — not just keyword search — to find jobs that genuinely fit your background.",
  },
  {
    q: "Will every application actually be tailored, or is it a template?",
    a: "Each application is generated against that specific job description — your resume framing and cover note change per role, rather than one fixed version sent everywhere.",
  },
  {
    q: "How do I get notified?",
    a: "Via WhatsApp or email, whichever you set as your preference — you'll hear about applications submitted and any recruiter responses.",
  },
  {
    q: "Is my data safe?",
    a: "Your data is encrypted at rest and handled under India's DPDP Act, 2023. See our Privacy Policy for full details.",
  },
  {
    q: "What's the difference between the plans?",
    a: "All three plans include the same features — profile setup, resume parsing, AI matching, tailored applications, and notifications. The difference is your monthly application volume: 5 on Starter, 12 on Pro, or 25 on Power. Pick based on how actively you're searching.",
  },
];
