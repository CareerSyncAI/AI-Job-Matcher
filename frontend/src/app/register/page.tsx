"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("candidate");
  const [organizationName, setOrganizationName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-[#0b1326] px-4 py-8 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#4edea3]/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-[#8083ff]/5 rounded-full blur-[100px]" />
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
            Create Your Account
          </h1>
          <p className="text-sm text-[#908fa0] mt-1">
            Join TalentIQ AI and unlock intelligent career matching
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-[#131b2e] border border-[#222a3d] rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-[#c7c4d7] uppercase tracking-wider mb-2">
              I am a
            </label>
            <div className="flex gap-2 bg-[#171f33] p-1 rounded-lg border border-[#222a3d]">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  role === "candidate"
                    ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.2)]"
                    : "text-[#c7c4d7] hover:text-[#dae2fd]"
                }`}
              >
                <span className="material-symbols-outlined text-base">person</span>
                Job Seeker
              </button>
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  role === "recruiter"
                    ? "bg-[#4edea3] text-[#003824] shadow-[0_0_12px_rgba(78,222,163,0.2)]"
                    : "text-[#c7c4d7] hover:text-[#dae2fd]"
                }`}
              >
                <span className="material-symbols-outlined text-base">badge</span>
                Recruiter
              </button>
            </div>
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

            {/* Organization Name (Recruiter only) */}
            {role === "recruiter" && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[#c7c4d7] uppercase tracking-wider">
                  Organization Name
                </label>
                <div className="flex items-center bg-[#171f33] border border-[#222a3d] rounded-lg px-3.5 py-2.5 focus-within:border-[#4edea3] transition-colors">
                  <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">domain</span>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    className="w-full bg-transparent text-[#dae2fd] text-sm placeholder:text-[#464554] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#c7c4d7] uppercase tracking-wider">
                Password <span className="text-[#908fa0] normal-case">(min 8 characters)</span>
              </label>
              <div className="flex items-center bg-[#171f33] border border-[#222a3d] rounded-lg px-3.5 py-2.5 focus-within:border-[#8083ff] transition-colors">
                <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={8}
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#c7c4d7] uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="flex items-center bg-[#171f33] border border-[#222a3d] rounded-lg px-3.5 py-2.5 focus-within:border-[#8083ff] transition-colors">
                <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  required
                  className="w-full bg-transparent text-[#dae2fd] text-sm placeholder:text-[#464554] focus:outline-none"
                />
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
              className={`w-full py-3 px-4 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                role === "recruiter"
                  ? "bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] shadow-[0_0_20px_rgba(78,222,163,0.25)]"
                  : "bg-[#8083ff] hover:bg-[#c0c1ff] text-[#0d0096] shadow-[0_0_20px_rgba(128,131,255,0.25)]"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">rocket_launch</span>
                  {role === "recruiter" ? "Create Recruiter Account" : "Create Candidate Account"}
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-[#908fa0] mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#c0c1ff] hover:text-[#dae2fd] font-semibold transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
