"use client";

import React from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { Bell, Briefcase, FileText, User, Sparkles, Clock } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const { profile, applications } = useApplicantContext();

  const notifications = [
    {
      id: "notif-1",
      type: "application",
      title: "Application status updated",
      description: "Recruiter reviewed your matching profile for Senior Software Engineer (Frontend).",
      time: "2 hours ago",
      icon: Briefcase,
      link: "/app/applications"
    },
    {
      id: "notif-2",
      type: "resume",
      title: "Resume parsed successfully",
      description: "Dhruv_Gajera_Resume_v1.pdf text structure parsed. 5 skill tags extracted.",
      time: "1 day ago",
      icon: FileText,
      link: "/app/resume"
    },
    {
      id: "notif-3",
      type: "profile",
      title: "Optimize profile visibility",
      description: "Headline and education profiles completed. Matching score computed.",
      time: "2 days ago",
      icon: User,
      link: "/app/profile"
    }
  ];

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-ink-border pb-4">
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Notifications
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Stay updated on parsing stages, recruiter actions, and job recommendation warnings.
        </p>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {notifications.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.link}
              className="bg-ink-surface border border-ink-border hover:border-aperture-500/30 rounded p-4 flex gap-4 text-xs transition-all block cursor-pointer"
            >
              <div className="w-8 h-8 rounded bg-aperture-500/10 text-aperture-500 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="font-semibold text-text-primary">
                  {item.title}
                </h4>
                <p className="text-text-secondary leading-relaxed font-sans">
                  {item.description}
                </p>
                <p className="text-[10px] text-text-tertiary font-mono pt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {item.time}
                </p>
              </div>
            </Link>
          )})}
      </div>
    </div>
  );
}
