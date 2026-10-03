"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import {
  CareerSyncLogo,
  IconUser,
  IconBuilding,
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
  IconCheckCircle,
  IconKey,
  IconX,
} from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot Password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Auto-login: If user already has an active session, redirect to /dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("careersync_remember_email");
      const savedRemember = localStorage.getItem("careersync_remember_me");
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedRemember !== null) {
        setRememberMe(savedRemember === "true");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password, rememberMe);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError("Please enter your email address.");
      return;
    }
    setForgotError(null);
    setForgotSubmitting(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail.trim().toLowerCase() });
      setForgotSuccess(res.data.message || "Reset link dispatched.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setForgotError(err.message);
      } else {
        setForgotError("Failed to dispatch reset link.");
      }
    } finally {
      setForgotSubmitting(false);
    }
  };

  const fillDemoCandidate = () => {
    setEmail("alice.vance@example.com");
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <CareerSyncLogo size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-slate-100 tracking-tight">
            Career<span className="text-[#059669]">Sync</span>
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
            <p className="text-slate-400 text-xs">Sign in to your free CareerSync workspace</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <IconAlertTriangle size={16} className="text-rose-400 shrink-0" />
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
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotModalOpen(true);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#059669] to-[#0d9488] hover:from-[#047857] hover:to-[#0f766e] text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Signing in..." : "Sign In to Account"}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Quick Test Profiles
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillDemoCandidate}
                className="px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-emerald-400 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <IconUser size={15} />
                Candidate Demo
              </button>
              <button
                type="button"
                onClick={fillDemoRecruiter}
                className="px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-teal-400 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <IconBuilding size={15} />
                Recruiter Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} CareerSync • 100% Free Platform
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <IconKey size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Reset Password</h3>
                  <p className="text-xs text-slate-400">Enter your email to recover access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotSuccess(null);
                  setForgotError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <IconX size={18} />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-start gap-2.5">
                  <IconCheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{forgotSuccess}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(false);
                    setForgotSuccess(null);
                    setForgotError(null);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                    <IconAlertTriangle size={15} className="text-rose-400 shrink-0" />
                    <p>{forgotError}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">Account Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    A secure password reset link or instructions will be dispatched to this address.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(false);
                      setForgotError(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    {forgotSubmitting ? "Sending..." : "Send Instructions"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
