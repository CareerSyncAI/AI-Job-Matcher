"use client";

import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#8083ff]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[#4edea3]/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#ffb95f]/5 rounded-full blur-[100px]" />
      </div>

      {/* Nav Header */}
      <header className="relative z-20 w-full px-6 xl:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] shadow-[0_0_12px_rgba(128,131,255,0.25)]">
            <span className="material-symbols-outlined text-xl">neurology</span>
          </div>
          <span className="font-headline font-bold text-xl tracking-tight">TalentIQ AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg bg-[#8083ff] text-[#0d0096] text-sm font-bold hover:bg-[#c0c1ff] transition-all shadow-[0_0_20px_rgba(128,131,255,0.25)]"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8083ff]/15 border border-[#8083ff]/30 text-[#c0c1ff] text-xs font-semibold mb-8">
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          AI-Powered Talent Intelligence Platform
        </div>

        <h1 className="font-headline font-bold text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight mb-6">
          Your Career,{" "}
          <span className="bg-gradient-to-r from-[#8083ff] via-[#c0c1ff] to-[#4edea3] bg-clip-text text-transparent">
            Amplified by AI
          </span>
        </h1>

        <p className="text-lg md:text-xl text-[#c7c4d7] max-w-2xl mx-auto mb-10 leading-relaxed">
          Semantic resume matching, ATS-optimized tailoring, and intelligent candidate
          pipelines — all powered by deep vector analysis.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-3.5 rounded-xl bg-[#8083ff] text-[#0d0096] font-bold text-base hover:bg-[#c0c1ff] transition-all shadow-[0_0_30px_rgba(128,131,255,0.3)] flex items-center gap-2"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            Start Matching Now
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-[#171f33] text-[#dae2fd] font-semibold text-base border border-[#222a3d] hover:border-[#464554] hover:bg-[#222a3d] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">login</span>
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Candidate Features */}
          <div className="bg-[#131b2e]/80 backdrop-blur-xl rounded-2xl p-6 border border-[#222a3d] hover:border-[#8083ff]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#8083ff]/15 flex items-center justify-center text-[#8083ff] mb-4 group-hover:shadow-[0_0_20px_rgba(128,131,255,0.2)] transition-all">
              <span className="material-symbols-outlined text-2xl">target</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-2">Smart Job Matches</h3>
            <p className="text-sm text-[#c7c4d7] leading-relaxed">
              AI-driven semantic vector analysis matches you to roles with 96%+ precision. Beyond keyword matching.
            </p>
          </div>

          <div className="bg-[#131b2e]/80 backdrop-blur-xl rounded-2xl p-6 border border-[#222a3d] hover:border-[#4edea3]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#4edea3]/15 flex items-center justify-center text-[#4edea3] mb-4 group-hover:shadow-[0_0_20px_rgba(78,222,163,0.2)] transition-all">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-2">Resume Studio & ATS</h3>
            <p className="text-sm text-[#c7c4d7] leading-relaxed">
              Real-time ATS compatibility scoring, keyword injection, and impact bullet rewriting. 1-click tailoring per role.
            </p>
          </div>

          <div className="bg-[#131b2e]/80 backdrop-blur-xl rounded-2xl p-6 border border-[#222a3d] hover:border-[#ffb95f]/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#ffb95f]/15 flex items-center justify-center text-[#ffb95f] mb-4 group-hover:shadow-[0_0_20px_rgba(255,185,95,0.2)] transition-all">
              <span className="material-symbols-outlined text-2xl">quiz</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-2">Interview Prep AI</h3>
            <p className="text-sm text-[#c7c4d7] leading-relaxed">
              Role-specific question simulation, skill gap bridging strategies, and model answer generation.
            </p>
          </div>
        </div>

        {/* Recruiter CTA */}
        <div className="mt-8 bg-gradient-to-r from-[#131b2e] to-[#171f33] rounded-2xl p-8 border border-[#222a3d] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#00a572]/20 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
              <span className="material-symbols-outlined text-3xl">group_work</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-xl">For Recruiters & Employers</h3>
              <p className="text-sm text-[#c7c4d7] mt-1">
                Autonomous candidate sourcing, AI-scored talent pipelines, and deep resume comparison matrix.
              </p>
            </div>
          </div>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl bg-[#4edea3] text-[#003824] font-bold text-sm hover:bg-[#6ffbbe] transition-all shadow-[0_0_20px_rgba(78,222,163,0.2)] shrink-0"
          >
            Start Recruiting with AI →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#222a3d] py-8 px-6 text-center">
        <p className="text-xs text-[#908fa0]">
          TalentIQ AI • System Development Project (SGP) • CHARUSAT University, 5th Semester
        </p>
      </footer>
    </div>
  );
}
