"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCandidate = () => {
    setEmail("candidate.demo@talentiq.dev");
    setPassword("Password123456!");
    setError(null);
  };

  const fillDemoRecruiter = () => {
    setEmail("recruiter.sarah@careersync.dev");
    setPassword("Password123456!");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 px-4 py-8 relative overflow-hidden">
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header Logo */}
      <div className="relative z-10 max-w-md mx-auto w-full flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-display font-extrabold text-base shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            T
          </div>
          <span className="font-display font-bold text-lg text-slate-100 tracking-tight">
            Talent<span className="text-[#059669]">IQ</span> AI
          </span>
        </Link>
        <Link href="/register" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">
          Create account →
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="relative max-w-md mx-auto w-full z-10">
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display text-2xl font-bold text-slate-100">Welcome Back</h1>
            <p className="text-slate-400 text-xs">Sign in to your free TalentIQ AI workspace</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-slate-300">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#059669] to-[#0d9488] hover:from-[#047857] hover:to-[#0f766e] text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign In to Account"}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Quick Demo Fill
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillDemoCandidate}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-emerald-400 transition"
              >
                👤 Candidate Demo
              </button>
              <button
                type="button"
                onClick={fillDemoRecruiter}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-teal-400 transition"
              >
                🏢 Recruiter Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} TalentIQ AI • 100% Free Platform
      </div>
    </div>
  );
}
