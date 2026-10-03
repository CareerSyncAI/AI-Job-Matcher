"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
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
  IconSun,
  IconMoon,
  IconLogout,
  IconShield,
  IconSettings,
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

type ProfileSectionTab = "general" | "skills" | "appearance" | "security" | "session";

const POPULAR_SKILLS = [
  "Python",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "FastAPI",
  "Docker",
  "Kubernetes",
  "AWS",
  "PostgreSQL",
  "Machine Learning",
  "Tailwind CSS",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ProfileSectionTab>("general");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  // Profile fields state
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

  // Password fields state
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

  // Sign out confirmation dialog
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);

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

  // Skill management
  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter") return;
    if (e) e.preventDefault();
    const clean = newSkillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setNewSkillInput("");
    }
  };

  const handleAddSuggestedSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill]);
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

  // Handle logout
  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  const sectionTabs = [
    { id: "general", label: "Profile & Identity", icon: IconUser },
    { id: "skills", label: "Skills & Capabilities", icon: IconSettings },
    { id: "appearance", label: "Appearance & Theme", icon: isDark ? IconMoon : IconSun },
    { id: "security", label: "Security & Password", icon: IconShield },
    { id: "session", label: "Session & Account", icon: IconKey },
  ] as const;

  const rawId = String(user?.id || profile?.id || "1");
  const shortId = rawId.length > 10 ? `${rawId.slice(0, 8)}...` : rawId;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Profile Hero Header */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-display font-bold text-2xl shadow-lg shadow-emerald-600/30 shrink-0">
              {(fullName ? fullName.charAt(0) : user?.email?.charAt(0) || "U").toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {fullName || user?.email?.split("@")[0] || "My Profile"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-mono font-bold border border-emerald-500/20 uppercase">
                  {user?.role || "Candidate"}
                </span>
              </div>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {headline || (user?.role === "recruiter" ? "Hiring Manager" : "Professional Job Seeker")}{" "}
                {location ? `• ${location}` : ""}
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                  Live Account • Authenticated Session
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              title={`Full Account ID: ${rawId}`}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono select-all ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>ID:</span> #{shortId}
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs - Responsive Grid with Zero Scrollbar */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-1.5 rounded-2xl border ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        {sectionTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ProfileSectionTab)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#059669] text-white shadow-md shadow-emerald-600/20"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} className={isActive ? "text-white" : isDark ? "text-slate-400" : "text-slate-500"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            Loading profile information...
          </div>
        ) : (
          <div className="space-y-6">
            {/* SUBSECTION 1: General Profile & Identity */}
            {activeTab === "general" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 animate-fadeIn ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <h2 className="text-base font-semibold">Profile Identity &amp; Information</h2>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Personal details displayed across candidate vector matching and recruiter discovery.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium flex items-center gap-2">
                    <IconCheckCircle size={16} className="shrink-0" />
                    <p>{profileSuccess}</p>
                  </div>
                )}

                {profileError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-center gap-2">
                    <IconAlertTriangle size={16} className="shrink-0" />
                    <p>{profileError}</p>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alice Vance"
                        className={`w-full text-sm rounded-xl px-4 py-2.5 border focus:outline-none focus:border-emerald-500 transition ${
                          isDark
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Professional Headline
                      </label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Senior Full-Stack Engineer"
                        className={`w-full text-sm rounded-xl px-4 py-2.5 border focus:outline-none focus:border-emerald-500 transition ${
                          isDark
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Location
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. San Francisco, CA / Remote"
                          className={`w-full text-sm rounded-xl px-4 py-2.5 pl-10 border focus:outline-none focus:border-emerald-500 transition ${
                            isDark
                              ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                          }`}
                        />
                        <IconMapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {user?.role === "recruiter" ? "Organization / Company" : "Current Affiliation"}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className={`w-full text-sm rounded-xl px-4 py-2.5 pl-10 border focus:outline-none focus:border-emerald-500 transition ${
                            isDark
                              ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                          }`}
                        />
                        <IconBuilding size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Professional Bio &amp; Summary
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      placeholder="Briefly describe your experience, technical focus, and career goals..."
                      className={`w-full text-sm rounded-xl p-4 border focus:outline-none focus:border-emerald-500 transition resize-none ${
                        isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      }`}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
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
            )}

            {/* SUBSECTION 2: Skills & Capabilities */}
            {activeTab === "skills" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 animate-fadeIn ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <h2 className="text-base font-semibold">Skills &amp; Capabilities Matrix</h2>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    These skill competencies directly calibrate your semantic matching score against open opportunities.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Add skill input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={handleAddSkill}
                      placeholder="Type a skill (e.g. Python, Docker, Next.js) and press Enter"
                      className={`flex-1 text-sm rounded-xl px-4 py-2.5 border focus:outline-none focus:border-emerald-500 transition ${
                        isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill()}
                      className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Add Skill
                    </button>
                  </div>

                  {/* Active skills list */}
                  <div className="space-y-2">
                    <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Current Verified Skills ({skills.length})
                    </label>
                    <div
                      className={`p-4 rounded-xl border flex flex-wrap gap-2 min-h-24 ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {skills.length === 0 ? (
                        <span className={`text-xs italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          No skills added yet. Add your core capabilities above or click from suggestions below.
                        </span>
                      ) : (
                        skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium shadow-xs"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-rose-500 transition cursor-pointer p-0.5"
                              aria-label={`Remove ${skill}`}
                            >
                              <IconX size={12} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick-add popular suggestions */}
                  <div className="space-y-2 pt-2">
                    <label className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Suggested Skills (Click to Add)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_SKILLS.filter((s) => !skills.includes(s)).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleAddSuggestedSkill(skill)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                            isDark
                              ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-emerald-400"
                              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-emerald-600 shadow-xs"
                          }`}
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile ? "Saving Skills..." : "Save Skills Matrix"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECTION 3: Appearance & Theme */}
            {activeTab === "appearance" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 animate-fadeIn ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <h2 className="text-base font-semibold">Appearance &amp; Theme Settings</h2>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Customize the interface theme. Your preference is automatically saved and synchronized across sessions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Dark Theme Option Card */}
                  <div
                    onClick={() => setTheme("dark")}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-4 ${
                      isDark
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shadow-xs">
                          <IconMoon size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Dark Theme</h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Default enterprise dark slate palette
                          </p>
                        </div>
                      </div>
                      {isDark && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <IconCheckCircle size={14} />
                        </div>
                      )}
                    </div>

                    {/* Preview visual thumbnail */}
                    <div className="h-20 rounded-xl bg-slate-950 border border-slate-800 p-2.5 space-y-2 overflow-hidden select-none">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="w-20 h-2 rounded bg-slate-800" />
                      </div>
                      <div className="w-full h-8 rounded-lg bg-slate-900 border border-slate-800" />
                    </div>
                  </div>

                  {/* Light Theme Option Card */}
                  <div
                    onClick={() => setTheme("light")}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-4 ${
                      !isDark
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-xs">
                          <IconSun size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Light Theme</h3>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Clean high-contrast daytime interface
                          </p>
                        </div>
                      </div>
                      {!isDark && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <IconCheckCircle size={14} />
                        </div>
                      )}
                    </div>

                    {/* Preview visual thumbnail */}
                    <div className="h-20 rounded-xl bg-slate-100 border border-slate-200 p-2.5 space-y-2 overflow-hidden select-none">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-600" />
                        <div className="w-20 h-2 rounded bg-slate-300" />
                      </div>
                      <div className="w-full h-8 rounded-lg bg-white border border-slate-200" />
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <IconCheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>
                    Current preference: <strong className="capitalize">{theme} Theme</strong>. Stored locally on this device.
                  </span>
                </div>
              </div>
            )}

            {/* SUBSECTION 4: Security & Password */}
            {activeTab === "security" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 animate-fadeIn ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                <div className={`border-b pb-4 flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <div>
                    <h2 className="text-base font-semibold">Security &amp; Password Management</h2>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Ensure your account credentials remain secure with argon2-hashed password storage.
                    </p>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                      isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <IconKey size={18} />
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium flex items-center gap-2">
                    <IconCheckCircle size={16} className="shrink-0" />
                    <p>{passwordSuccess}</p>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-center gap-2">
                    <IconAlertTriangle size={16} className="shrink-0" />
                    <p>{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={`w-full text-sm rounded-xl px-4 py-2.5 pr-11 border focus:outline-none focus:border-emerald-500 transition ${
                          isDark
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                        }`}
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
                      <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        New Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={8}
                          className={`w-full text-sm rounded-xl px-4 py-2.5 pr-11 border focus:outline-none focus:border-emerald-500 transition ${
                            isDark
                              ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                          }`}
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
                      <label className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={8}
                          className={`w-full text-sm rounded-xl px-4 py-2.5 pr-11 border focus:outline-none focus:border-emerald-500 transition ${
                            isDark
                              ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                          }`}
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
                      className="px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {changingPassword ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUBSECTION 5: Session & Account Management (Sign Out safely nestled here) */}
            {activeTab === "session" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Account Details Card */}
                <div
                  className={`p-6 sm:p-8 rounded-2xl border space-y-6 ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 className="text-base font-semibold">Active Session &amp; System Information</h2>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Live connection metrics for your verified user account.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Registered Email
                      </span>
                      <span className="font-mono text-xs font-semibold break-all">{user?.email}</span>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Account Role
                      </span>
                      <span className="text-xs font-semibold capitalize">{user?.role}</span>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Account Status
                      </span>
                      <span className="text-xs font-semibold text-emerald-500">Active Verified</span>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Database Connection
                      </span>
                      <span className="text-xs font-semibold text-emerald-500">Connected (SQLite)</span>
                    </div>
                  </div>

                  {/* Device remembrance */}
                  <div
                    className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-semibold">Remember Me On This Device</h4>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Preserve your credentials and automatic session login on this browser.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isRemembered}
                      onChange={(e) => handleToggleRemember(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Session Sign-Out Section */}
                <div
                  className={`p-6 sm:p-8 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                    <h3 className="text-base font-semibold text-rose-500">Session Actions &amp; Sign Out</h3>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Terminating your session clears your authentication tokens and securely returns you to the login screen.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div>
                      <p className="text-xs font-semibold">Ready to end your current session?</p>
                      <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        You can sign back in at any time with your credentials.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmSignOutOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      <IconLogout size={16} />
                      Sign Out of CareerSync
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign Out Confirmation Modal */}
        {confirmSignOutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-5 ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <IconLogout size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Sign Out</h3>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Are you sure you want to exit?
                  </p>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Your active session on this device will be terminated. Any unsaved edits will be discarded.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOutOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-rose-600/20"
                >
                  Confirm Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
