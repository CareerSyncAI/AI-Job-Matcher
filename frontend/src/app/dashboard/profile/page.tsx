"use client";

import React, { useState, useEffect } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import {
  IconUser,
  IconBuilding,
  IconMapPin,
  IconCheckCircle,
  IconAlertTriangle,
  IconKey,
  IconEye,
  IconEyeOff,
  IconX,
} from "@/components/Icons";

interface UserProfileData {
  id: number;
  email: string;
  role: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  organization_name: string | null;
  bio: string | null;
  skills: string[];
  created_at: string | null;
  updated_at: string | null;
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Remember me toggle
  const [isRemembered, setIsRemembered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rem = localStorage.getItem("careersync_remember_me") === "true";
      setIsRemembered(rem);
    }
  }, []);

  const handleToggleRemember = (val: boolean) => {
    setIsRemembered(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("careersync_remember_me", String(val));
      if (!val) {
        localStorage.removeItem("careersync_remember_email");
      } else if (user?.email) {
        localStorage.setItem("careersync_remember_email", user.email);
      }
    }
  };

  // Fetch full profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/auth/profile");
        const data: UserProfileData = res.data;
        setProfile(data);
        setFullName(data.full_name || "");
        setHeadline(data.headline || "");
        setLocation(data.location || "");
        setOrganizationName(data.organization_name || "");
        setBio(data.bio || "");
        setSkills(data.skills || []);
      } catch (err: unknown) {
        console.error("Failed to load profile:", err);
        setProfileError("Could not retrieve account details from database.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Add skill tag
  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const clean = newSkillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setNewSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await api.put("/auth/profile", {
        full_name: fullName.trim() || null,
        headline: headline.trim() || null,
        location: location.trim() || null,
        organization_name: organizationName.trim() || null,
        bio: bio.trim() || null,
        skills: skills,
      });

      setProfile(res.data);
      setProfileSuccess("Profile details saved and synchronized across your account.");
      await refreshUser();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError("Failed to update profile. Please try again.");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(res.data.message || "Password successfully updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError("Failed to change password. Verify your current password.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-8 animate-fadeIn">
        {/* Profile Hero Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-display font-bold text-2xl shadow-lg shadow-emerald-600/30">
                {(fullName ? fullName.charAt(0) : user?.email?.charAt(0) || "U").toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                    {fullName || user?.email?.split("@")[0] || "My Profile"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                    {user?.role?.toUpperCase() || "CANDIDATE"}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {headline || (user?.role === "recruiter" ? "Hiring Manager" : "Professional Job Seeker")} •{" "}
                  {location || "Location not set"}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Session Active • Database Connected</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                <span className="text-slate-500">ID:</span> #{user?.id || profile?.id || 1}
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                Free Platform Tier
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading profile information...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Profile Information Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 sm:p-7 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-base font-semibold text-white">Profile Details</h2>
                  <p className="text-xs text-slate-400">
                    Manage your identity, professional overview, and skill competencies.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <IconCheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <p>{profileSuccess}</p>
                  </div>
                )}

                {profileError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                    <IconAlertTriangle size={16} className="text-rose-400 shrink-0" />
                    <p>{profileError}</p>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alice Vance"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Professional Headline</label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Location</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. San Francisco, CA / Remote"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                        />
                        <IconMapPin size={16} className="absolute left-3.5 top-3 text-slate-500" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        {user?.role === "recruiter" ? "Organization / Company" : "Current Affiliation"}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                        />
                        <IconBuilding size={16} className="absolute left-3.5 top-3 text-slate-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">Professional Bio &amp; Summary</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      placeholder="Briefly describe your experience, technical focus, and career goals..."
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600 resize-none"
                    />
                  </div>

                  {/* Skills Matrix */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-300">Skills &amp; Competencies</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={handleAddSkill}
                        placeholder="Add a skill (e.g. Python, Docker, React) and press Enter"
                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Add Skill
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 min-h-10">
                      {skills.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">No skills added yet. Type a skill above to enrich your job matching profile.</span>
                      ) : (
                        skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-slate-400 hover:text-rose-400 transition cursor-pointer p-0.5"
                              aria-label={`Remove ${skill}`}
                            >
                              <IconX size={12} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-3 bg-gradient-to-r from-[#059669] to-[#0d9488] hover:from-[#047857] hover:to-[#0f766e] text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile ? "Saving Changes..." : "Save Profile Details"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password & Security Card */}
              <div className="p-6 sm:p-7 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">Security &amp; Password</h2>
                    <p className="text-xs text-slate-400">Update your account password safely.</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <IconKey size={16} />
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <IconCheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <p>{passwordSuccess}</p>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                    <IconAlertTriangle size={16} className="text-rose-400 shrink-0" />
                    <p>{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
                      >
                        {showCurrentPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">New Password (min 8 chars)</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={8}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
                        >
                          {showNewPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={8}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition cursor-pointer p-0.5"
                        >
                          {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                    >
                      {changingPassword ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right 1 Col: Session & Account Information */}
            <div className="space-y-6">
              {/* Account Meta Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white">Account Information</h3>
                  <p className="text-xs text-slate-400">Authenticated profile records</p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Primary Email</span>
                    <span className="font-mono text-slate-200 break-all">{user?.email}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Account Role</span>
                    <span className="capitalize font-semibold text-slate-200">{user?.role}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Platform Access</span>
                    <span className="text-emerald-400 font-semibold">100% Free Lifetime</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Database Sync</span>
                    <span className="text-slate-300">SQLite Active Connection</span>
                  </div>

                  {profile?.created_at && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Member Since</span>
                      <span className="text-slate-300 font-mono">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Session & Device Preferences Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white">Session &amp; Security</h3>
                  <p className="text-xs text-slate-400">Automatic sign-in preferences</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Remember on this device</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        Keep credentials and session remembered on this browser for automatic login.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isRemembered}
                      onChange={(e) => handleToggleRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer mt-1"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Session Security Notice</p>
                    <p>
                      Your JWT token is safely managed and authenticated directly against the local backend server.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      window.location.href = "/login";
                    }}
                    className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    End Current Session (Sign Out)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
