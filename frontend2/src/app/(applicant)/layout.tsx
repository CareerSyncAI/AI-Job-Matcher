"use client";

import React from "react";
import { ApplicantProvider } from "@/lib/context/ApplicantContext";
import { ApplicantHeader } from "@/components/layout/ApplicantHeader";

export default function ApplicantLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ApplicantProvider>
      <div className="flex flex-col min-h-screen bg-ink-base text-text-primary">
        {/* Top Navbar */}
        <ApplicantHeader />
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 focus:outline-none" tabIndex={0}>
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
    </ApplicantProvider>
  );
}
