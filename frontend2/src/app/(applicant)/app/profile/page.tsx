"use client";

import React, { useState } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { User, Tag, Calendar, MapPin, GraduationCap, X, Check, Save } from "lucide-react";

export default function ProfilePage() {
  const { profile, updateProfile, profileCompleteness, isLoading } = useApplicantContext();

  const [name, setName] = useState(profile?.name || "");
  const [headline, setHeadline] = useState(profile?.headline || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [education, setEducation] = useState(profile?.education || "");
  const [experienceYears, setExperienceYears] = useState(profile?.experienceYears || 0);
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  
  const [skillInput, setSkillInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Sync state notes when profile loads
  React.useEffect(() => {
    if (profile) {
      const timer = setTimeout(() => {
        setName(profile.name || "");
        setHeadline(profile.headline || "");
        setLocation(profile.location || "");
        setEducation(profile.education || "");
        setExperienceYears(profile.experienceYears || 0);
        setSkills(profile.skills || []);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSkill = skillInput.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills([...skills, cleanSkill]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        headline,
        location,
        education,
        experienceYears: Number(experienceYears),
        skills
      });
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      {/* Header */}
      <div className="border-b border-ink-border pb-4 flex justify-between items-center">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
            My Credentials
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Maintain your skill declarations, work experience thresholds, and education profiles.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary font-semibold uppercase">Completion</p>
          <span className="font-mono text-sm font-bold text-aperture-500">{profileCompleteness}%</span>
        </div>
      </div>

      {/* Success Banner */}
      {showSuccessAlert && (
        <div className="bg-success/10 border border-success/30 px-4 py-3 rounded text-xs text-success flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 stroke-[2.5px]" />
          <span>Profile changes saved successfully and synced with recruiters!</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6 text-xs">
        <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-4">
          <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider border-b border-ink-border pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-aperture-500" />
            General Profile Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dhruv Gajera"
                className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none focus:border-aperture-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer | Next.js Developer"
                className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none focus:border-aperture-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-text-tertiary" /> Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Surat, Gujarat, India"
                className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none focus:border-aperture-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-text-tertiary" /> Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none focus:border-aperture-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-text-secondary mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-text-tertiary" /> Highest Education
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.Tech in Computer Engineering, Gujarat Technological University"
                className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none focus:border-aperture-500"
              />
            </div>
          </div>
        </div>

        {/* Skill tag Manager */}
        <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-4">
          <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider border-b border-ink-border pb-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-aperture-500" />
            Skills Management
          </h3>

          {/* Add skill input */}
          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Add skill tag (e.g. Next.js)"
              className="flex-1 p-2 bg-ink-base border border-ink-border rounded text-text-primary focus:outline-none focus:border-aperture-500"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-3 bg-aperture-500 hover:bg-aperture-600 text-ink-base font-semibold rounded cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Skill lists */}
          <div className="space-y-2">
            <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">
              Declared Skills ({skills.length})
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-ink-base border border-ink-border text-text-primary rounded-full"
                >
                  <span className="font-medium">{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="p-0.5 rounded-full hover:bg-ink-border text-text-secondary hover:text-danger cursor-pointer"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <p className="text-xs text-text-tertiary italic">No skills declared yet. Add skills to compute matches.</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-aperture-500 hover:bg-aperture-600 text-ink-base font-bold rounded transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      </form>
    </div>
  );
}
