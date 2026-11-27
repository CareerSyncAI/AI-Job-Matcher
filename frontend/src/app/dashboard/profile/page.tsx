"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
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
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  name: string | null;
  headline: string | null;
  location: string | null;
  organization_name: string | null;
  bio: string | null;
  skills: string[];
  created_at: string | null;
  updated_at: string | null;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { detail?: unknown } } })?.response;
  const detail = response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : ""))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}

function subscribeToRememberPreference(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener("careersync-remember-preference-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("careersync-remember-preference-change", onChange);
  };
}

function getRememberPreferenceSnapshot() {
  try {
    return localStorage.getItem("careersync_remember_me") === "true";
  } catch {
    return false;
  }
}

function getRememberPreferenceServerSnapshot() {
  return false;
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
  const { user, refreshUser, logout, isLoading: authLoading } = useAuth();
  const authUserId = user?.id;
  const { theme, setTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ProfileSectionTab>("general");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);

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
  const isRemembered = useSyncExternalStore(
    subscribeToRememberPreference,
    getRememberPreferenceSnapshot,
    getRememberPreferenceServerSnapshot
  );

  // Sign out confirmation dialog
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutDialogRef = useRef<HTMLDivElement>(null);

  const handleToggleRemember = (val: boolean) => {
    const rememberedEmail = user?.email || profile?.email;
    if (val && !rememberedEmail) return;
    try {
      localStorage.setItem("careersync_remember_me", String(val));
      if (!val) {
        localStorage.removeItem("careersync_remember_email");
      } else if (rememberedEmail) {
        localStorage.setItem("careersync_remember_email", rememberedEmail);
      }
      window.dispatchEvent(new Event("careersync-remember-preference-change"));
    } catch {}
  };

  // Fetch full profile data
  useEffect(() => {
    if (authLoading) return;
    if (!authUserId) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();
    api.get("/auth/profile", { signal: controller.signal })
      .then((res) => {
        const data = res.data as UserProfileData;
        setProfile(data);
        if (data.role.toLowerCase() !== "candidate") setActiveTab("general");
        setFullName(data.name || "");
        setHeadline(data.headline || "");
        setLocation(data.location || "");
        setOrganizationName(data.organization_name || "");
        setBio(data.bio || "");
        setSkills(Array.isArray(data.skills) ? data.skills : []);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setProfileLoadError(getApiErrorMessage(error, "Could not load your profile. Please try again."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authLoading, authUserId, router, profileLoadAttempt]);

  // Skill management
  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter") return;
    if (e) e.preventDefault();
    const clean = newSkillInput.trim().replace(/\s+/g, " ");
    if (clean) {
      setSkills((previous) => previous.some((skill) => skill.toLocaleLowerCase() === clean.toLocaleLowerCase()) ? previous : [...previous, clean]);
      setNewSkillInput("");
      setProfileSuccess(null);
      setProfileError(null);
    }
  };

  const handleAddSuggestedSkill = (skill: string) => {
    setSkills((previous) => previous.some((item) => item.toLocaleLowerCase() === skill.toLocaleLowerCase()) ? previous : [...previous, skill]);
    setProfileSuccess(null);
    setProfileError(null);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((previous) => previous.filter((skill) => skill !== skillToRemove));
    setProfileSuccess(null);
    setProfileError(null);
  };

  // Save profile updates
  const handleSaveProfile = async (section: "general" | "skills") => {
    if (!profile) {
      setProfileError("Your profile has not loaded. Retry loading it before saving.");
      return;
    }
    if (!["candidate", "recruiter"].includes(profile.role.toLowerCase())) {
      setProfileError("This account role cannot edit profile details.");
      return;
    }
    if (section === "skills" && profile.role.toLowerCase() !== "candidate") {
      setProfileError("Skills can only be updated on a candidate profile.");
      return;
    }
    const pendingSkill = newSkillInput.trim().replace(/\s+/g, " ");
    const skillsToSave = pendingSkill && !skills.some((skill) => skill.toLocaleLowerCase() === pendingSkill.toLocaleLowerCase())
      ? [...skills, pendingSkill]
      : skills;
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const isRecruiter = profile.role.toLowerCase() === "recruiter";
      const payload = section === "skills"
        ? { skills: skillsToSave }
        : isRecruiter
          ? { organization_name: organizationName.trim() }
          : {
              name: fullName.trim(),
              headline: headline.trim(),
              location: location.trim(),
              bio: bio.trim(),
            };
      const res = await api.put("/auth/profile", payload);
      const data = res.data as UserProfileData;
      setProfile(data);
      if (section === "skills") {
        const savedSkills = Array.isArray(data.skills) ? data.skills : skillsToSave;
        setSkills(savedSkills);
        setNewSkillInput("");
      } else if (isRecruiter) {
        setOrganizationName(data.organization_name || "");
      } else {
        setFullName(data.name || "");
        setHeadline(data.headline || "");
        setLocation(data.location || "");
        setBio(data.bio || "");
      }
      setProfileSuccess(section === "skills" ? "Skills saved successfully." : "Profile details saved successfully.");
      await refreshUser();
    } catch (error: unknown) {
      setProfileError(getApiErrorMessage(error, "Failed to update your profile. Please try again."));
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Enter your current password to continue.");
      return;
    }
    if (newPassword.trim().length === 0 || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Choose a new password different from your current password.");
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
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: unknown) {
      setPasswordError(getApiErrorMessage(error, "Failed to change your password. Please try again."));
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle logout
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setSigningOut(false);
      setConfirmSignOutOpen(false);
    }
  };

  const selectTab = (tab: ProfileSectionTab) => {
    setActiveTab(tab);
    setProfileSuccess(null);
    setProfileError(null);
    setPasswordSuccess(null);
    setPasswordError(null);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: ProfileSectionTab) => {
    const index = sectionTabs.findIndex((tab) => tab.id === current);
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % sectionTabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + sectionTabs.length) % sectionTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = sectionTabs.length - 1;
    else return;
    event.preventDefault();
    const next = sectionTabs[nextIndex].id;
    selectTab(next);
    requestAnimationFrame(() => document.getElementById(`profile-tab-${next}`)?.focus());
  };

  useEffect(() => {
    if (!confirmSignOutOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => signOutDialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable()?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmSignOutOpen(false);
      } else if (event.key === "Tab") {
        const items = focusable();
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!signOutDialogRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [confirmSignOutOpen]);

  const allSectionTabs = [
    { id: "general", label: "Profile & Identity", icon: IconUser },
    { id: "skills", label: "Skills & Capabilities", icon: IconSettings },
    { id: "appearance", label: "Appearance & Theme", icon: isDark ? IconMoon : IconSun },
    { id: "security", label: "Security & Password", icon: IconShield },
    { id: "session", label: "Session & Account", icon: IconKey },
  ] as const;
  const sectionTabs = allSectionTabs.filter((tab) =>
    tab.id !== "skills" || profile?.role.toLowerCase() === "candidate"
  );
  const isCandidate = profile?.role.toLowerCase() === "candidate";
  const isRecruiter = profile?.role.toLowerCase() === "recruiter";

  const rawId = user?.id || profile?.id || "";
  const shortId = rawId.length > 10 ? `${rawId.slice(0, 8)}...` : rawId;
  const suggestedSkills = POPULAR_SKILLS.filter((skill) =>
    !skills.some((savedSkill) => savedSkill.toLocaleLowerCase() === skill.toLocaleLowerCase())
  );

  return (
    <div className="space-y-8 motion-safe:animate-fadeIn max-w-5xl mx-auto">
      {/* Profile Hero Header */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div aria-hidden="true" className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-display font-bold text-2xl shadow-lg shadow-emerald-600/30 shrink-0">
              {(loading ? "" : (profile?.name?.trim() || user?.email?.trim())?.charAt(0) || "U").toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {loading ? "Loading profile…" : profile?.name?.trim() || user?.email?.split("@")[0] || "My Profile"}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                  isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {profile?.role || user?.role || "Account"}
                </span>
              </div>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {loading ? "" : profile?.headline || (profile?.role?.toLowerCase() === "recruiter" ? "Hiring Manager" : "Professional Job Seeker")}{" "}
                {!loading && profile?.location ? `• ${profile.location}` : ""}
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${profile ? "bg-emerald-500" : "bg-slate-400"} motion-safe:animate-pulse`} aria-hidden="true" />
                <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                  {loading ? "Loading account profile" : profile ? "Account profile loaded" : "Account profile unavailable"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              title={`Full Account ID: ${rawId}`}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <span className={isDark ? "text-slate-500" : "text-slate-600"}>ID:</span> <span className="select-all">#{shortId || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs - Responsive Grid with Zero Scrollbar */}
      <div
        role="tablist"
        aria-label="Profile settings sections"
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
              id={`profile-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={profile ? "profile-panel" : undefined}
              disabled={!profile}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              className={`flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                isActive
                  ? "bg-[#059669] text-white shadow-md shadow-emerald-600/20"
                  : isDark
                  ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} aria-hidden="true" className={isActive ? "text-white shrink-0" : isDark ? "text-slate-400 shrink-0" : "text-slate-500 shrink-0"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

        {loading ? (
          <div role="status" aria-live="polite" className={`p-8 sm:p-16 rounded-2xl border text-center text-sm ${isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
            Loading profile information…
          </div>
        ) : !profile ? (
          <div className={`p-8 rounded-2xl border text-center space-y-4 ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
            <div role="alert" aria-live="assertive" className="text-sm">{profileLoadError || "Your profile could not be loaded."}</div>
            <button type="button" onClick={() => { setLoading(true); setProfileLoadError(null); setProfileLoadAttempt((attempt) => attempt + 1); }} className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold">
              Retry
            </button>
          </div>
        ) : (
          <div id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${activeTab}`} tabIndex={0} className="space-y-6">
            {/* SUBSECTION 1: General Profile & Identity */}
            {activeTab === "general" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 motion-safe:animate-fadeIn ${
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
                  <div role="status" aria-live="polite" className={`p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${isDark ? "text-emerald-400" : "text-emerald-800"} text-xs font-medium flex items-center gap-2`}>
                    <IconCheckCircle size={16} aria-hidden="true" className="shrink-0" />
                    <p>{profileSuccess}</p>
                  </div>
                )}

                {profileError && (
                  <div role="alert" aria-live="assertive" className={`p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 ${isDark ? "text-rose-400" : "text-rose-700"} text-xs font-medium flex items-center gap-2`}>
                    <IconAlertTriangle size={16} aria-hidden="true" className="shrink-0" />
                    <p>{profileError}</p>
                  </div>
                )}

                <form onSubmit={(event) => { event.preventDefault(); void handleSaveProfile("general"); }} className="space-y-5">
                  {isCandidate && <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="profile-full-name" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Full Name
                      </label>
                      <input
                        id="profile-full-name"
                        type="text"
                        autoComplete="name"
                        maxLength={255}
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setProfileSuccess(null); setProfileError(null); }}
                        placeholder="e.g. Alice Vance"
                        className={`w-full text-sm rounded-xl px-4 py-2.5 border focus:outline-none focus:border-emerald-500 transition ${
                          isDark
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="profile-headline" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Professional Headline
                      </label>
                      <input
                        id="profile-headline"
                        type="text"
                        maxLength={255}
                        value={headline}
                        onChange={(e) => { setHeadline(e.target.value); setProfileSuccess(null); setProfileError(null); }}
                        placeholder="e.g. Senior Full-Stack Engineer"
                        className={`w-full text-sm rounded-xl px-4 py-2.5 border focus:outline-none focus:border-emerald-500 transition ${
                          isDark
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                    </div>
                  </div>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {isCandidate && (
                    <div className="space-y-1.5">
                      <label htmlFor="profile-location" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Location
                      </label>
                      <div className="relative">
                        <input
                          id="profile-location"
                          type="text"
                          maxLength={255}
                          value={location}
                          onChange={(e) => { setLocation(e.target.value); setProfileSuccess(null); setProfileError(null); }}
                          placeholder="e.g. San Francisco, CA / Remote"
                          className={`w-full text-sm rounded-xl px-4 py-2.5 pl-10 border focus:outline-none focus:border-emerald-500 transition ${
                            isDark
                              ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                          }`}
                        />
                        <IconMapPin size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    )}

                    {isRecruiter && (
                    <div className="space-y-1.5">
                      <label htmlFor="profile-org" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Organization / Company
                      </label>
                      <div className="relative">
                        <input
                          id="profile-org"
                          type="text"
                          autoComplete="organization"
                          maxLength={255}
                          value={organizationName}
                          onChange={(e) => { setOrganizationName(e.target.value); setProfileSuccess(null); setProfileError(null); }}
                          placeholder="e.g. Acme Corporation"
                          className={`w-full text-sm rounded-xl px-4 py-2.5 pl-10 border focus:outline-none focus:border-emerald-500 transition ${
                            isDark
                              ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                          }`}
                        />
                        <IconBuilding size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    )}
                  </div>

                  {isCandidate && (
                  <div className="space-y-1.5">
                    <label htmlFor="profile-bio" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Professional Bio &amp; Summary
                    </label>
                    <textarea
                      id="profile-bio"
                      value={bio}
                      maxLength={1000}
                      onChange={(e) => { setBio(e.target.value); setProfileSuccess(null); setProfileError(null); }}
                      rows={4}
                      placeholder="Briefly describe your experience, technical focus, and career goals..."
                      className={`w-full text-sm rounded-xl p-4 border focus:outline-none focus:border-emerald-500 transition resize-none ${
                        isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      }`}
                    />
                  </div>
                  )}

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
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 motion-safe:animate-fadeIn ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <h2 className="text-base font-semibold">Skills &amp; Capabilities Matrix</h2>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    These skill competencies directly calibrate your semantic matching score against open opportunities.
                  </p>
                </div>

                {profileSuccess && <div role="status" aria-live="polite" className={`text-xs font-medium ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>{profileSuccess}</div>}
                {profileError && <div role="alert" aria-live="assertive" className={`text-xs font-medium ${isDark ? "text-rose-400" : "text-rose-700"}`}>{profileError}</div>}

                <div className="space-y-4">
                  {/* Add skill input */}
                  <div className="flex gap-2">
                    <label htmlFor="new-profile-skill" className="sr-only">Add a skill</label>
                    <input
                      id="new-profile-skill"
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => { setNewSkillInput(e.target.value); setProfileSuccess(null); setProfileError(null); }}
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
                    <h3 className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Current Verified Skills ({skills.length})
                    </h3>
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 ${isDark ? "text-emerald-400" : "text-emerald-800"} text-xs font-medium shadow-xs`}
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className={`transition cursor-pointer p-0.5 ${isDark ? "hover:text-rose-300" : "hover:text-rose-700"}`}
                              aria-label={`Remove ${skill}`}
                            >
                              <IconX size={12} aria-hidden="true" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick-add popular suggestions */}
                  {suggestedSkills.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h3 className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Suggested Skills (Click to Add)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                      {suggestedSkills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleAddSuggestedSkill(skill)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                            isDark
                              ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-emerald-400"
                              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-emerald-700 shadow-xs"
                          }`}
                        >
                          + {skill}
                        </button>
                      ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile("skills")}
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
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 motion-safe:animate-fadeIn ${
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
                  <label
                    className={`block p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-4 focus-within:ring-2 focus-within:ring-emerald-500 ${
                      isDark
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50"
                    }`}
                  >
                    <input type="radio" name="profile-theme" value="dark" checked={theme === "dark"} onChange={() => setTheme("dark")} className="sr-only" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shadow-xs">
                          <IconMoon size={20} aria-hidden="true" />
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
                          <IconCheckCircle size={14} aria-hidden="true" />
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
                  </label>

                  {/* Light Theme Option Card */}
                  <label
                    className={`block p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-4 focus-within:ring-2 focus-within:ring-emerald-500 ${
                      !isDark
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                    }`}
                  >
                    <input type="radio" name="profile-theme" value="light" checked={theme === "light"} onChange={() => setTheme("light")} className="sr-only" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-xs">
                          <IconSun size={20} aria-hidden="true" />
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
                          <IconCheckCircle size={14} aria-hidden="true" />
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
                  </label>
                </div>

                <div
                  className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <IconCheckCircle size={16} aria-hidden="true" className={`shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-800"}`} />
                  <span>
                    Current preference: <strong className="capitalize">{theme} Theme</strong>. Stored locally on this device.
                  </span>
                </div>
              </div>
            )}

            {/* SUBSECTION 4: Security & Password */}
            {activeTab === "security" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border space-y-6 motion-safe:animate-fadeIn ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-sm"
                }`}
              >
                <div className={`border-b pb-4 flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <div>
                    <h2 className="text-base font-semibold">Security &amp; Password Management</h2>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Update your password here. Use a unique password that you do not use on other sites.
                    </p>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                      isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <IconKey size={18} aria-hidden="true" />
                  </div>
                </div>

                {passwordSuccess && (
                  <div role="status" aria-live="polite" className={`p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${isDark ? "text-emerald-400" : "text-emerald-800"} text-xs font-medium flex items-center gap-2`}>
                    <IconCheckCircle size={16} aria-hidden="true" className="shrink-0" />
                    <p>{passwordSuccess}</p>
                  </div>
                )}

                {passwordError && (
                  <div role="alert" aria-live="assertive" className={`p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 ${isDark ? "text-rose-400" : "text-rose-700"} text-xs font-medium flex items-center gap-2`}>
                    <IconAlertTriangle size={16} aria-hidden="true" className="shrink-0" />
                    <p>{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="profile-curr-pass" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        id="profile-curr-pass"
                        type={showCurrentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        maxLength={128}
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSuccess(null); setPasswordError(null); }}
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
                        aria-pressed={showCurrentPassword}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 ${isDark ? "hover:text-slate-200" : "hover:text-slate-700"} transition cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg`}
                      >
                        {showCurrentPassword ? <IconEyeOff size={18} aria-hidden="true" /> : <IconEye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="profile-new-pass" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        New Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          id="profile-new-pass"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          maxLength={128}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(null); setPasswordError(null); }}
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
                          aria-pressed={showNewPassword}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 ${isDark ? "hover:text-slate-200" : "hover:text-slate-700"} transition cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg`}
                        >
                          {showNewPassword ? <IconEyeOff size={18} aria-hidden="true" /> : <IconEye size={18} aria-hidden="true" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="profile-confirm-pass" className={`block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          id="profile-confirm-pass"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          maxLength={128}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSuccess(null); setPasswordError(null); }}
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
                          aria-pressed={showConfirmPassword}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 ${isDark ? "hover:text-slate-200" : "hover:text-slate-700"} transition cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg`}
                        >
                          {showConfirmPassword ? <IconEyeOff size={18} aria-hidden="true" /> : <IconEye size={18} aria-hidden="true" />}
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
              <div className="space-y-6 motion-safe:animate-fadeIn">
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
                      <span className="font-mono text-xs font-semibold break-all">{user?.email || profile.email || "—"}</span>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Account Role
                      </span>
                      <span className="text-xs font-semibold capitalize">{user?.role || profile.role || "—"}</span>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Account Status
                      </span>
                      <span className={`text-xs font-semibold ${profile.is_active ? (isDark ? "text-emerald-400" : "text-emerald-800") : (isDark ? "text-rose-400" : "text-rose-700")}`}>
                        {profile.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Profile Data
                      </span>
                      <span className={`text-xs font-semibold ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>Loaded</span>
                    </div>
                  </div>

                  {/* Device remembrance */}
                  <div
                    className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <label id="remember-email-label" htmlFor="remember-login-email" className="text-xs font-semibold">Remember Login Email</label>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Prefill your email address on the login screen for faster sign-in on this device.
                      </p>
                    </div>
                    <input
                      id="remember-login-email"
                      type="checkbox"
                      checked={isRemembered}
                      disabled={!user?.email && !profile.email}
                      aria-labelledby="remember-email-label"
                      onChange={(e) => handleToggleRemember(e.target.checked)}
                      className={`w-5 h-5 rounded text-emerald-700 focus:ring-emerald-500 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed ${isDark ? "border-slate-700 bg-slate-950" : "border-slate-300 bg-white"}`}
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
                      <h3 className={`text-base font-semibold ${isDark ? "text-rose-400" : "text-rose-700"}`}>Session Actions &amp; Sign Out</h3>
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
                      className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 ${isDark ? "text-rose-300" : "text-rose-700"} border border-rose-500/30 text-xs font-semibold transition cursor-pointer`}
                    >
                      <IconLogout size={16} aria-hidden="true" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md motion-safe:animate-fadeIn" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmSignOutOpen(false); }}>
            <div
              ref={signOutDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="signout-dialog-title"
              aria-describedby="signout-dialog-description"
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-5 ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <IconLogout size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 id="signout-dialog-title" className="text-sm font-semibold">Sign Out</h3>
                  <p id="signout-dialog-description" className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
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
                  disabled={signingOut}
                  aria-busy={signingOut}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-rose-600/20"
                >
                  {signingOut ? "Signing Out…" : "Confirm Sign Out"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
