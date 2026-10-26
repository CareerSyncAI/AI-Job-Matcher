"use client";

import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
      {children}
    </ProtectedRoute>
  );
}
