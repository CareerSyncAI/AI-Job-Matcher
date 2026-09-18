"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Award, 
  Building2, 
  ArrowLeftRight, 
  Sun, 
  Moon, 
  Upload, 
  User, 
  X,
  Command as CommandIcon
} from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";
import { useToast } from "@/components/ui/ToastProvider";

interface CommandAction {
  id: string;
  category: "Navigation" | "Actions" | "Themes";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  shortcut?: string;
  perform: () => void;
}

export const CommandMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { success, info } = useToast();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions: CommandAction[] = [
    // Navigation
    {
      id: "nav-applicant-dash",
      category: "Navigation",
      title: "Applicant Dashboard",
      subtitle: "Overview of applications, matches, and profile strength",
      icon: LayoutDashboard,
      shortcut: "G D",
      perform: () => { router.push("/app/dashboard"); onClose(); }
    },
    {
      id: "nav-jobs",
      category: "Navigation",
      title: "Find Jobs & Matches",
      subtitle: "Browse open requisitions with AI match scores",
      icon: Briefcase,
      shortcut: "G J",
      perform: () => { router.push("/app/jobs"); onClose(); }
    },
    {
      id: "nav-skill-gap",
      category: "Navigation",
      title: "Skill Gap Optimizer",
      subtitle: "Target role simulation and skill acquisition roadmap",
      icon: Award,
      shortcut: "G S",
      perform: () => { router.push("/app/skill-gap"); onClose(); }
    },
    {
      id: "nav-resume",
      category: "Navigation",
      title: "Resume Vault",
      subtitle: "Manage resume versions and inspect parsed entities",
      icon: FileText,
      shortcut: "G R",
      perform: () => { router.push("/app/resume"); onClose(); }
    },
    {
      id: "nav-recruiter-dash",
      category: "Navigation",
      title: "Recruiter Command Center",
      subtitle: "Candidate rankings, job requisitions, and pipeline",
      icon: Building2,
      shortcut: "G C",
      perform: () => { router.push("/recruiter"); onClose(); }
    },
    {
      id: "nav-recruiter-compare",
      category: "Navigation",
      title: "Candidate Comparison Matrix",
      subtitle: "Side-by-side radar analysis and weight customizer",
      icon: ArrowLeftRight,
      shortcut: "G M",
      perform: () => { router.push("/recruiter/compare"); onClose(); }
    },
    // Actions
    {
      id: "action-upload",
      category: "Actions",
      title: "Upload & Parse Resume",
      subtitle: "Layout-aware parsing and structured skill extraction",
      icon: Upload,
      perform: () => { 
        router.push("/app/resume"); 
        info("Resume Vault", "Select your resume to start extraction");
        onClose(); 
      }
    },
    {
      id: "action-profile",
      category: "Actions",
      title: "Edit Profile & Preferences",
      subtitle: "Update career headline, skills, and target role",
      icon: User,
      perform: () => { router.push("/app/profile"); onClose(); }
    },
    // Themes
    {
      id: "theme-dark",
      category: "Themes",
      title: "Theme: Dark Mode",
      subtitle: "Refined obsidian slate with soft accents",
      icon: Moon,
      perform: () => { 
        setTheme("dark"); 
        success("Theme Changed", "Switched to Dark Mode");
        onClose(); 
      }
    },
    {
      id: "theme-light",
      category: "Themes",
      title: "Theme: Light Mode",
      subtitle: "Clean titanium white with high contrast",
      icon: Sun,
      perform: () => { 
        setTheme("light"); 
        success("Theme Changed", "Switched to Light Mode");
        onClose(); 
      }
    }
  ];

  const filtered = actions.filter((a) => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    (a.subtitle && a.subtitle.toLowerCase().includes(query.toLowerCase())) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].perform();
    }
  }, [isOpen, filtered, selectedIndex, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-20 px-4 sm:px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-2xl glass-panel bg-ink-surface border border-ink-border shadow-glass-lg rounded-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-ink-border gap-3">
              <Search className="w-5 h-5 text-signal-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, search jobs, or switch themes..."
                autoFocus
                className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none font-sans"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="px-2 py-0.5 rounded bg-white/5 border border-ink-border text-[11px] font-mono text-text-tertiary">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Action Items List */}
            <div className="overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-text-tertiary text-sm">
                  No matching commands found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.perform}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 ${
                        isSelected 
                          ? "bg-signal-500/15 border border-signal-500/30 text-text-primary shadow-sm" 
                          : "text-text-secondary hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-signal-500/20 text-signal-500" : "bg-white/5 text-text-tertiary"
                        }`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium leading-tight truncate ${isSelected ? "text-text-primary" : "text-text-secondary"}`}>
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[11px] text-text-tertiary truncate mt-0.5 font-sans">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary bg-white/5 px-2 py-0.5 rounded border border-ink-border">
                          {item.category}
                        </span>
                        {item.shortcut && (
                          <kbd className="text-[10px] font-mono text-text-tertiary bg-white/5 px-1.5 py-0.5 rounded border border-ink-border">
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-black/20 border-t border-ink-border flex items-center justify-between text-[11px] text-text-tertiary">
              <div className="flex items-center gap-3">
                <span>Navigate <kbd className="font-mono bg-white/5 px-1 rounded">&uarr;</kbd> <kbd className="font-mono bg-white/5 px-1 rounded">&darr;</kbd></span>
                <span>Select <kbd className="font-mono bg-white/5 px-1 rounded">&crarr;</kbd></span>
              </div>
              <span className="font-mono">CareerSync AI v2.4</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
