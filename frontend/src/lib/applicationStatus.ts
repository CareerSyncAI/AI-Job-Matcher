export type ApplicationStatus =
  | "new"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "hired"
  | "rejected";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "Applied",
  under_review: "Reviewed",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
};

export const NEXT_APPLICATION_STATUS: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  new: "under_review",
  under_review: "shortlisted",
  shortlisted: "interviewing",
  interviewing: "offered",
  offered: "hired",
};

export function normalizeApplicationStatus(status: string): ApplicationStatus | null {
  const normalized = status === "screened" ? "under_review" : status;
  return Object.prototype.hasOwnProperty.call(APPLICATION_STATUS_LABELS, normalized)
    ? normalized as ApplicationStatus
    : null;
}

export function getApplicationStatusLabel(status: string): string {
  const normalized = normalizeApplicationStatus(status);
  return normalized ? APPLICATION_STATUS_LABELS[normalized] : "Status unavailable";
}
