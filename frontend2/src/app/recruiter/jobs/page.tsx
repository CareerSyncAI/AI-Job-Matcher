"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRecruiter } from "@/lib/context/RecruiterContext";

export default function JobsIndexPage() {
  const router = useRouter();
  const { selectedJobId } = useRecruiter();

  useEffect(() => {
    router.replace(`/recruiter/jobs/${selectedJobId}`);
  }, [selectedJobId, router]);

  return null;
}
