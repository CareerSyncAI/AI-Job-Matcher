"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  CareerSyncBrand,
  IconUser,
  IconBuilding,
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
  IconSun,
  IconMoon,
} from "@/components/Icons";

function RegisterForm() {
  const router = useRouter();
  const { register, isLoading: authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("candidate");
  const [organizationName, setOrganizationName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (role === "recruiter" && !organizationName.trim()) {
      setError("Organization name is required for recruiters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(
        email.trim().toLowerCase(),
        password,
        role,
        role === "recruiter" ? organizationName.trim() : undefined
      );
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 px-4 py-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header Logo */}
      <div className="relative z-10 max-w-md mx-auto w-full flex justify-between items-center mb-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <CareerSyncBrand size={32} showTagline={true} isLight={!isDark} />
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-xl border border-slate-700/60 bg-slate-800/80 text-amber-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center shadow-xs"
          >
            {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
          <Link href="/login" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">
            Sign in instead →
          </Link>
        </div>
      </div>

      {/* Main Register Card */}
      <div className="relative max-w-md mx-auto w-full z-10">
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display text-2xl font-bold text-slate-100">Create Free Account</h1>
            <p className="text-slate-400 text-xs">Full platform access for Candidates &amp; Recruiters</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <IconAlertTriangle size={16} className="text-rose-400 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Role Toggle Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Account Role</label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                  role === "candidate"
                    ? "bg-[#059669] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <IconUser size={15} />
                Job Candidate
              </button>
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                  role === "recruiter"
                    ? "bg-[#059669] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <IconBuilding size={15} />
                Recruiter
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "recruiter" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Company / Organization Name</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme Tech Labs"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Password (min 8 chars)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 pr-11 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 pr-11 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
                >
                  {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#059669] to-[#0d9488] hover:from-[#047857] hover:to-[#0f766e] text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? "Creating Free Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} CareerSync • 100% Free Platform
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
