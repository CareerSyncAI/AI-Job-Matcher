"use client";

import React, { useState, useEffect } from "react";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { RecruiterProvider } from "@/lib/context/RecruiterContext";
import { AuthProvider } from "@/features/auth/AuthContext";
import { CommandMenu } from "@/components/ui/CommandMenu";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <RecruiterProvider>
            {children}
            <CommandMenu isOpen={commandMenuOpen} onClose={() => setCommandMenuOpen(false)} />
          </RecruiterProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
