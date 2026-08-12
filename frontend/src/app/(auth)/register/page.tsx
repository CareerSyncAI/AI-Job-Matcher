"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { SpotlightCard } from "@/components/motion/MotionPrimitives";
import { formatAPIErrorMessage } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"recruiter" | "candidate">("recruiter");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        role,
        organization_name: role === "recruiter" ? organizationName : undefined,
      });
      router.push(role === "recruiter" ? "/recruiter" : "/app/dashboard");
    } catch (err) {
      setError(formatAPIErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SpotlightCard className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">Create Account</h1>
        <p className="text-sm text-gray-400 mb-6">Join CareerSync AI as a Recruiter or Candidate.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                className={`py-2 text-xs rounded border transition ${
                  role === "recruiter"
                    ? "bg-white/10 border-white/40 text-white font-semibold"
                    : "bg-black/30 border-white/10 text-gray-400"
                }`}
              >
                Recruiter
              </button>
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`py-2 text-xs rounded border transition ${
                  role === "candidate"
                    ? "bg-white/10 border-white/40 text-white font-semibold"
                    : "bg-black/30 border-white/10 text-gray-400"
                }`}
              >
                Candidate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Password (min 12 chars)</label>
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          {role === "recruiter" && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Organization Name</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-white text-black font-semibold rounded text-sm hover:bg-gray-200 transition disabled:opacity-50"
          >
            {submitting ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-white hover:underline">
            Sign in
          </a>
        </p>
      </SpotlightCard>
    </div>
  );
}
