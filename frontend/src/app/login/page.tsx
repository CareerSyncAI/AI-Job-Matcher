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
    <div className="min-h-screen flex items-center justify-center bg-[#0b1326] px-4 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#8083ff]/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#4edea3]/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] shadow-[0_0_12px_rgba(128,131,255,0.25)]">
              <span className="material-symbols-outlined text-2xl">neurology</span>
            </div>
          </Link>
          <h1 className="font-headline font-bold text-2xl text-[#dae2fd] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-[#908fa0] mt-1">
            Sign in to your TalentIQ AI workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#131b2e] border border-[#222a3d] rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          {/* Demo Quick-fill Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={fillDemoCandidate}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#8083ff]/10 border border-[#8083ff]/20 hover:bg-[#8083ff]/15 transition-colors text-left group"
            >
              <span className="material-symbols-outlined text-[#8083ff] text-lg">person</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#c0c1ff]">Demo Candidate</p>
                <p className="text-[10px] text-[#908fa0] truncate font-mono">candidate.demo@...</p>
              </div>
            </button>
            <button
              type="button"
              onClick={fillDemoRecruiter}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/20 hover:bg-[#4edea3]/15 transition-colors text-left group"
            >
              <span className="material-symbols-outlined text-[#4edea3] text-lg">badge</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#4edea3]">Demo Recruiter</p>
                <p className="text-[10px] text-[#908fa0] truncate font-mono">recruiter.sarah@...</p>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#c7c4d7] uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center bg-[#171f33] border border-[#222a3d] rounded-lg px-3.5 py-2.5 focus-within:border-[#8083ff] transition-colors">
                <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  autoComplete="email"
                  required
                  className="w-full bg-transparent text-[#dae2fd] text-sm placeholder:text-[#464554] focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#c7c4d7] uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center bg-[#171f33] border border-[#222a3d] rounded-lg px-3.5 py-2.5 focus-within:border-[#8083ff] transition-colors">
                <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-transparent text-[#dae2fd] text-sm placeholder:text-[#464554] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-[#908fa0] hover:text-[#dae2fd] transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20">
                <span className="material-symbols-outlined text-[#ffb4ab] text-lg shrink-0 mt-0.5">error</span>
                <p className="text-xs text-[#ffb4ab]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-3 px-4 bg-[#8083ff] hover:bg-[#c0c1ff] disabled:opacity-50 disabled:cursor-not-allowed text-[#0d0096] font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(128,131,255,0.25)] cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0d0096] border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-[#908fa0] mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#c0c1ff] hover:text-[#dae2fd] font-semibold transition-colors"
            >
              Create Account
            </Link>
          </p>

          <p className="text-center text-[10px] text-[#464554] mt-5">
            Academic prototype — CHARUSAT University, SGP 5th Semester
          </p>
        </div>
      </div>
    </div>
  );
}
