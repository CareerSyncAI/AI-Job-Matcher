"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useRecruiter } from "@/lib/context/RecruiterContext";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useRecruiter();

  return (
    <div className="flex h-screen overflow-hidden bg-ink-base">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto focus:outline-none p-6" tabIndex={0}>
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3">
              {/* Spinner */}
              <div className="relative w-8 h-8 text-signal-500 animate-spin">
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full stroke-current"
                  fill="none"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" className="opacity-25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
              <p className="text-xs text-text-secondary font-medium tracking-wide">
                Loading recruiter data...
              </p>
            </div>
          ) : (
            <div className="max-w-(--breakpoint-2xl) mx-auto w-full space-y-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
