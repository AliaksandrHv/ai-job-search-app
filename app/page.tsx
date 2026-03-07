"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type JobStatus = "Saved" | "Applied" | "Interview" | "Rejected";
type FollowUpStatus = "Not needed" | "Planned" | "Done" | "Overdue";
type ViewMode = "Dashboard" | "Applications" | "Recruiters" | "Interviews";
type JobDetailsSource = "Dashboard" | "Applications" | "Recruiters" | "Interviews";
type StatusFilter = JobStatus | "All";
type SortOrder = "Newest" | "Oldest";
type RecruiterSortOrder = "Newest" | "Upcoming follow-up";
type InterviewStatus = "Scheduled" | "Completed" | "Cancelled";
type InterviewSortOrder = "Upcoming" | "Newest created" | "Recently updated";
type ActivityType =
  | "job_created"
  | "job_edited"
  | "job_deleted"
  | "job_status_changed"
  | "recruiter_created"
  | "recruiter_edited"
  | "recruiter_deleted"
  | "recruiter_linked"
  | "recruiter_unlinked"
  | "interview_created"
  | "interview_edited"
  | "interview_deleted"
  | "interview_status_changed"
  | "follow_up_set"
  | "follow_up_done"
  | "follow_up_contacted_today"
  | "follow_up_cleared";

type Job = {
  id: number;
  company: string;
  title: string;
  status: JobStatus;
  note: string;
  jobLink?: string;
  linkedRecruiterId?: number;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  followUpStatus?: FollowUpStatus;
  createdAt?: number;
};

type Recruiter = {
  id: number;
  name: string;
  company: string;
  role: string;
  email: string;
  profileLink?: string;
  notes: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  createdAt?: number;
};

type RecruiterDetailsSource = "Recruiters" | "JobDetails" | "Interviews";

type Interview = {
  id: number;
  jobId: number;
  recruiterId?: number;
  interviewType: string;
  status: InterviewStatus;
  scheduledAt: string;
  notes: string;
  createdAt?: number;
  updatedAt?: number;
};

type ActivityEvent = {
  id: number;
  type: ActivityType;
  timestamp: number;
  message: string;
  jobId?: number;
  recruiterId?: number;
  interviewId?: number;
};

const STORAGE_KEY = "ai_job_search_jobs_v1";
const RECRUITER_STORAGE_KEY = "ai_job_search_recruiters_v1";
const INTERVIEW_STORAGE_KEY = "ai_job_search_interviews_v1";
const ACTIVITY_STORAGE_KEY = "ai_job_search_activity_v1";
const APP_VERSION = "0.1.0";
const ACTIVITY_MAX_ITEMS = 250;
const statusOptions: JobStatus[] = ["Saved", "Applied", "Interview", "Rejected"];
const followUpStatusOptions: FollowUpStatus[] = [
  "Not needed",
  "Planned",
  "Done",
  "Overdue",
];
const interviewStatusOptions: InterviewStatus[] = [
  "Scheduled",
  "Completed",
  "Cancelled",
];
const activityTypeOptions: ActivityType[] = [
  "job_created",
  "job_edited",
  "job_deleted",
  "job_status_changed",
  "recruiter_created",
  "recruiter_edited",
  "recruiter_deleted",
  "recruiter_linked",
  "recruiter_unlinked",
  "interview_created",
  "interview_edited",
  "interview_deleted",
  "interview_status_changed",
  "follow_up_set",
  "follow_up_done",
  "follow_up_contacted_today",
  "follow_up_cleared",
];
const interviewTypeOptions = [
  "Phone Screen",
  "Technical",
  "Behavioral",
  "Onsite",
  "Final Round",
];

const defaultJobs: Job[] = [
  {
    id: 1,
    company: "Acme Robotics",
    title: "QA Automation Engineer",
    status: "Applied",
    note: "Submitted on Monday",
    jobLink: "https://example.com/jobs/acme-qa-automation",
    linkedRecruiterId: 102,
    nextFollowUpDate: "2026-03-07",
    lastContactDate: "2026-03-03",
    followUpStatus: "Planned",
    createdAt: 1739491200000,
  },
  {
    id: 2,
    company: "Orbit AI",
    title: "Machine Learning Engineer",
    status: "Saved",
    note: "Need referral before applying",
    createdAt: 1739923200000,
  },
];

const defaultRecruiters: Recruiter[] = [
  {
    id: 101,
    name: "Maya Chen",
    company: "Orbit AI",
    role: "Technical Recruiter",
    email: "maya.chen@orbit.example",
    profileLink: "https://linkedin.com/in/maya-chen-example",
    notes: "Requested an updated resume focused on ML projects.",
    lastContactDate: "2026-03-02",
    nextFollowUpDate: "2026-03-08",
    createdAt: 1741065600000,
  },
  {
    id: 102,
    name: "Jordan Lee",
    company: "Acme Robotics",
    role: "Talent Partner",
    email: "jordan.lee@acme.example",
    notes: "Open to referrals once role budget is approved.",
    lastContactDate: "2026-02-25",
    nextFollowUpDate: "2026-03-14",
    createdAt: 1740720000000,
  },
];

const defaultInterviews: Interview[] = [
  {
    id: 1001,
    jobId: 1,
    recruiterId: 102,
    interviewType: "Phone Screen",
    status: "Scheduled",
    scheduledAt: "2026-03-10T10:00",
    notes: "Prepare concise project examples.",
    createdAt: 1741302000000,
    updatedAt: 1741302000000,
  },
];

const statusClasses: Record<JobStatus, string> = {
  Saved:
    "border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  Applied:
    "border border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Interview:
    "border border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Rejected:
    "border border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const interviewStatusClasses: Record<InterviewStatus, string> = {
  Scheduled:
    "border border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Completed:
    "border border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Cancelled:
    "border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

function isJobStatus(value: unknown): value is JobStatus {
  return statusOptions.includes(value as JobStatus);
}

function isActivityType(value: unknown): value is ActivityType {
  return activityTypeOptions.includes(value as ActivityType);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLink(rawLink: unknown): string | undefined {
  if (typeof rawLink !== "string") return undefined;
  const trimmed = rawLink.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatDateOnly(dateString?: string, fallback = "Not set"): string {
  const timestamp = dateStringToStartOfDay(dateString);
  if (timestamp === null) return fallback;
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCreatedDate(timestamp?: number): string {
  if (typeof timestamp !== "number") return "Not available";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActivityTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeDateInput(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function normalizeDateTimeInput(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function dateTimeToTimestamp(dateTime?: string): number | null {
  const normalized = normalizeDateTimeInput(dateTime);
  if (!normalized) return null;
  const ts = new Date(normalized).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function formatDateTime(dateTime?: string): string {
  const ts = dateTimeToTimestamp(dateTime);
  if (ts === null) return "Not scheduled";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isTodayDateTime(dateTime?: string): boolean {
  const ts = dateTimeToTimestamp(dateTime);
  if (ts === null) return false;
  const date = new Date(ts);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isPastDateTime(dateTime?: string): boolean {
  const ts = dateTimeToTimestamp(dateTime);
  if (ts === null) return false;
  return ts < Date.now();
}

function needsInterviewOutcomeUpdate(interview: Interview): boolean {
  return interview.status === "Scheduled" && isPastDateTime(interview.scheduledAt);
}

function formatRecruiterContextForInterview(
  recruiter: Recruiter | undefined,
  job: Job | undefined
): string {
  if (!recruiter) return "Unassigned";
  if (job && recruiter.company.toLowerCase() === job.company.toLowerCase()) {
    return recruiter.name;
  }
  return `${recruiter.name} (${recruiter.company})`;
}

function dateStringToStartOfDay(dateString?: string): number | null {
  if (!dateString) return null;
  const validDateString = normalizeDateInput(dateString);
  if (!validDateString) return null;
  const date = new Date(`${validDateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isFollowUpSoon(nextFollowUpDate?: string): boolean {
  const followUpTs = dateStringToStartOfDay(nextFollowUpDate);
  if (followUpTs === null) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffInDays = Math.floor((followUpTs - today.getTime()) / 86400000);
  return diffInDays >= 0 && diffInDays <= 3;
}

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEffectiveFollowUpStatus(job: Job): FollowUpStatus {
  const rawStatus = job.followUpStatus ?? "Not needed";

  if (rawStatus === "Done" || rawStatus === "Not needed") {
    return rawStatus;
  }

  const dueTs = dateStringToStartOfDay(job.nextFollowUpDate);
  if (dueTs === null) {
    return rawStatus === "Overdue" ? "Planned" : rawStatus;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueTs < today.getTime()) {
    return "Overdue";
  }

  return "Planned";
}

function getFollowUpMeta(job: Job): {
  status: FollowUpStatus;
  label: string;
  badgeClass: string;
  isDueToday: boolean;
  isOverdue: boolean;
  dueTimestamp: number | null;
} {
  const status = getEffectiveFollowUpStatus(job);
  const dueTs = dateStringToStartOfDay(job.nextFollowUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = today.getTime() + 86400000;
  const isDueToday = dueTs !== null && dueTs >= today.getTime() && dueTs < tomorrow;
  const isOverdue = status === "Overdue";

  if (status === "Done") {
    const label = job.lastContactDate
      ? `Follow-up done (${formatDateOnly(job.lastContactDate)})`
      : "Follow-up done";
    return {
      status,
      label,
      badgeClass:
        "border border-emerald-300 bg-emerald-100 text-emerald-700",
      isDueToday,
      isOverdue,
      dueTimestamp: dueTs,
    };
  }

  if (!dueTs) {
    return {
      status,
      label: "No follow-up set",
      badgeClass: "border border-slate-300 bg-slate-100 text-slate-700",
      isDueToday: false,
      isOverdue: false,
      dueTimestamp: null,
    };
  }

  if (isOverdue) {
    return {
      status,
      label: `Overdue (${formatDateOnly(job.nextFollowUpDate)})`,
      badgeClass: "border border-rose-300 bg-rose-100 text-rose-700",
      isDueToday,
      isOverdue,
      dueTimestamp: dueTs,
    };
  }

  if (isDueToday) {
    return {
      status,
      label: "Follow-up today",
      badgeClass: "border border-amber-300 bg-amber-100 text-amber-800",
      isDueToday,
      isOverdue,
      dueTimestamp: dueTs,
    };
  }

  return {
    status,
    label: `Planned for ${formatDateOnly(job.nextFollowUpDate, "TBD")}`,
    badgeClass: "border border-blue-300 bg-blue-100 text-blue-700",
    isDueToday,
    isOverdue,
    dueTimestamp: dueTs,
  };
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewMode>("Dashboard");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [exportFeedback, setExportFeedback] = useState("");
  const [importFeedback, setImportFeedback] = useState("");
  const [importError, setImportError] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<JobStatus>("Saved");
  const [note, setNote] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [formError, setFormError] = useState("");
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<JobStatus>("Saved");
  const [editNote, setEditNote] = useState("");
  const [editJobLink, setEditJobLink] = useState("");
  const [editError, setEditError] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("Newest");
  const [detailsJobId, setDetailsJobId] = useState<number | null>(null);
  const [detailsSource, setDetailsSource] = useState<JobDetailsSource>("Dashboard");
  const [followUpDraftDate, setFollowUpDraftDate] = useState("");
  const [followUpError, setFollowUpError] = useState("");
  const [detailsRecruiterId, setDetailsRecruiterId] = useState<number | null>(
    null
  );
  const [recruiterDetailsSource, setRecruiterDetailsSource] =
    useState<RecruiterDetailsSource>("Recruiters");
  const [recruiterSourceJobId, setRecruiterSourceJobId] = useState<
    number | null
  >(null);
  const [recruiterSourceJobView, setRecruiterSourceJobView] =
    useState<JobDetailsSource>("Dashboard");
  const [isLinkRecruiterMode, setIsLinkRecruiterMode] = useState(false);
  const [linkRecruiterSelection, setLinkRecruiterSelection] = useState("");
  const [linkRecruiterError, setLinkRecruiterError] = useState("");

  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterCompany, setRecruiterCompany] = useState("");
  const [recruiterRole, setRecruiterRole] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [recruiterProfileLink, setRecruiterProfileLink] = useState("");
  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [lastContactDate, setLastContactDate] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [recruiterError, setRecruiterError] = useState("");
  const [editingRecruiterId, setEditingRecruiterId] = useState<number | null>(
    null
  );
  const [editRecruiterName, setEditRecruiterName] = useState("");
  const [editRecruiterCompany, setEditRecruiterCompany] = useState("");
  const [editRecruiterRole, setEditRecruiterRole] = useState("");
  const [editRecruiterEmail, setEditRecruiterEmail] = useState("");
  const [editRecruiterProfileLink, setEditRecruiterProfileLink] = useState("");
  const [editRecruiterNotes, setEditRecruiterNotes] = useState("");
  const [editLastContactDate, setEditLastContactDate] = useState("");
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState("");
  const [editRecruiterError, setEditRecruiterError] = useState("");
  const [recruiterSearchTerm, setRecruiterSearchTerm] = useState("");
  const [recruiterSortOrder, setRecruiterSortOrder] =
    useState<RecruiterSortOrder>("Newest");

  const [interviewJobId, setInterviewJobId] = useState("");
  const [interviewRecruiterId, setInterviewRecruiterId] = useState("");
  const [interviewType, setInterviewType] = useState(interviewTypeOptions[0]);
  const [interviewStatus, setInterviewStatus] =
    useState<InterviewStatus>("Scheduled");
  const [interviewScheduledAt, setInterviewScheduledAt] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewError, setInterviewError] = useState("");
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(
    null
  );
  const [editInterviewJobId, setEditInterviewJobId] = useState("");
  const [editInterviewRecruiterId, setEditInterviewRecruiterId] = useState("");
  const [editInterviewType, setEditInterviewType] = useState(
    interviewTypeOptions[0]
  );
  const [editInterviewStatus, setEditInterviewStatus] =
    useState<InterviewStatus>("Scheduled");
  const [editInterviewScheduledAt, setEditInterviewScheduledAt] = useState("");
  const [editInterviewNotes, setEditInterviewNotes] = useState("");
  const [editInterviewError, setEditInterviewError] = useState("");
  const [interviewSearchTerm, setInterviewSearchTerm] = useState("");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<
    InterviewStatus | "All"
  >("All");
  const [interviewSortOrder, setInterviewSortOrder] =
    useState<InterviewSortOrder>("Upcoming");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setJobs(defaultJobs);
      } else {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          setJobs(defaultJobs);
        } else {
          const normalizedJobs = parsed
            .map((item, index): Job | null => {
              if (!item || typeof item !== "object") return null;

              const candidate = item as {
                id?: unknown;
                company?: unknown;
                title?: unknown;
                status?: unknown;
                note?: unknown;
                jobLink?: unknown;
                linkedRecruiterId?: unknown;
                nextFollowUpDate?: unknown;
                lastContactDate?: unknown;
                followUpStatus?: unknown;
                createdAt?: unknown;
              };

              if (
                typeof candidate.company !== "string" ||
                !candidate.company.trim() ||
                typeof candidate.title !== "string" ||
                !candidate.title.trim()
              ) {
                return null;
              }

              const normalizedJobLink = normalizeLink(candidate.jobLink);
              const normalizedNextFollowUpDate = normalizeDateInput(
                candidate.nextFollowUpDate
              );
              const normalizedLastContactDate = normalizeDateInput(
                candidate.lastContactDate
              );
              const normalizedFollowUpStatus = followUpStatusOptions.includes(
                candidate.followUpStatus as FollowUpStatus
              )
                ? (candidate.followUpStatus as FollowUpStatus)
                : undefined;

              return {
                id:
                  typeof candidate.id === "number"
                    ? candidate.id
                    : Date.now() + index,
                company: candidate.company.trim(),
                title: candidate.title.trim(),
                status: isJobStatus(candidate.status)
                  ? candidate.status
                  : "Saved",
                note:
                  typeof candidate.note === "string" && candidate.note.trim()
                    ? candidate.note.trim()
                    : "Recently added",
                ...(normalizedJobLink ? { jobLink: normalizedJobLink } : {}),
                ...(typeof candidate.linkedRecruiterId === "number"
                  ? { linkedRecruiterId: candidate.linkedRecruiterId }
                  : {}),
                ...(normalizedNextFollowUpDate
                  ? { nextFollowUpDate: normalizedNextFollowUpDate }
                  : {}),
                ...(normalizedLastContactDate
                  ? { lastContactDate: normalizedLastContactDate }
                  : {}),
                ...(normalizedFollowUpStatus
                  ? { followUpStatus: normalizedFollowUpStatus }
                  : {}),
                ...(typeof candidate.createdAt === "number"
                  ? { createdAt: candidate.createdAt }
                  : {}),
              };
            })
            .filter((job): job is Job => job !== null);

          setJobs(normalizedJobs.length > 0 ? normalizedJobs : defaultJobs);
        }
      }

      const recruiterRaw = window.localStorage.getItem(RECRUITER_STORAGE_KEY);
      if (!recruiterRaw) {
        setRecruiters(defaultRecruiters);
      } else {
        const parsedRecruiters = JSON.parse(recruiterRaw);
        if (!Array.isArray(parsedRecruiters)) {
          setRecruiters(defaultRecruiters);
        } else {
          const normalizedRecruiters = parsedRecruiters
            .map((item, index): Recruiter | null => {
              if (!item || typeof item !== "object") return null;

              const candidate = item as {
                id?: unknown;
                name?: unknown;
                company?: unknown;
                role?: unknown;
                email?: unknown;
                profileLink?: unknown;
                notes?: unknown;
                lastContactDate?: unknown;
                nextFollowUpDate?: unknown;
                createdAt?: unknown;
              };

              if (
                typeof candidate.name !== "string" ||
                !candidate.name.trim() ||
                typeof candidate.company !== "string" ||
                !candidate.company.trim()
              ) {
                return null;
              }

              const normalizedProfileLink = normalizeLink(candidate.profileLink);
              const normalizedLastContactDate = normalizeDateInput(
                candidate.lastContactDate
              );
              const normalizedNextFollowUpDate = normalizeDateInput(
                candidate.nextFollowUpDate
              );

              return {
                id:
                  typeof candidate.id === "number"
                    ? candidate.id
                    : Date.now() + index,
                name: candidate.name.trim(),
                company: candidate.company.trim(),
                role: typeof candidate.role === "string" ? candidate.role.trim() : "",
                email:
                  typeof candidate.email === "string"
                    ? candidate.email.trim()
                    : "",
                notes:
                  typeof candidate.notes === "string" && candidate.notes.trim()
                    ? candidate.notes.trim()
                    : "No notes yet.",
                ...(normalizedProfileLink
                  ? { profileLink: normalizedProfileLink }
                  : {}),
                ...(normalizedLastContactDate
                  ? { lastContactDate: normalizedLastContactDate }
                  : {}),
                ...(normalizedNextFollowUpDate
                  ? { nextFollowUpDate: normalizedNextFollowUpDate }
                  : {}),
                ...(typeof candidate.createdAt === "number"
                  ? { createdAt: candidate.createdAt }
                  : {}),
              };
            })
            .filter((recruiter): recruiter is Recruiter => recruiter !== null);

          setRecruiters(
            normalizedRecruiters.length > 0
              ? normalizedRecruiters
              : defaultRecruiters
          );
        }
      }

      const interviewRaw = window.localStorage.getItem(INTERVIEW_STORAGE_KEY);
      if (!interviewRaw) {
        setInterviews(defaultInterviews);
      } else {
        const parsedInterviews = JSON.parse(interviewRaw);
        if (!Array.isArray(parsedInterviews)) {
          setInterviews(defaultInterviews);
        } else {
          const normalizedInterviews = parsedInterviews
            .map((item, index): Interview | null => {
              if (!item || typeof item !== "object") return null;

              const candidate = item as {
                id?: unknown;
                jobId?: unknown;
                recruiterId?: unknown;
                interviewType?: unknown;
                status?: unknown;
                scheduledAt?: unknown;
                notes?: unknown;
                createdAt?: unknown;
                updatedAt?: unknown;
              };

              const normalizedScheduledAt = normalizeDateTimeInput(
                candidate.scheduledAt
              );
              if (
                typeof candidate.jobId !== "number" ||
                !normalizedScheduledAt
              ) {
                return null;
              }

              const normalizedStatus = interviewStatusOptions.includes(
                candidate.status as InterviewStatus
              )
                ? (candidate.status as InterviewStatus)
                : "Scheduled";

              return {
                id:
                  typeof candidate.id === "number"
                    ? candidate.id
                    : Date.now() + index,
                jobId: candidate.jobId,
                ...(typeof candidate.recruiterId === "number"
                  ? { recruiterId: candidate.recruiterId }
                  : {}),
                interviewType:
                  typeof candidate.interviewType === "string" &&
                  candidate.interviewType.trim()
                    ? candidate.interviewType.trim()
                    : interviewTypeOptions[0],
                status: normalizedStatus,
                scheduledAt: normalizedScheduledAt,
                notes:
                  typeof candidate.notes === "string" && candidate.notes.trim()
                    ? candidate.notes.trim()
                    : "No notes yet.",
                ...(typeof candidate.createdAt === "number"
                  ? { createdAt: candidate.createdAt }
                  : {}),
                ...(typeof candidate.updatedAt === "number"
                  ? { updatedAt: candidate.updatedAt }
                  : {}),
              };
            })
            .filter((interview): interview is Interview => interview !== null);

          setInterviews(
            normalizedInterviews.length > 0
              ? normalizedInterviews
              : defaultInterviews
          );
        }
      }

      const activityRaw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!activityRaw) {
        setActivities([]);
      } else {
        const parsedActivities = JSON.parse(activityRaw);
        if (!Array.isArray(parsedActivities)) {
          setActivities([]);
        } else {
          const normalizedActivities = parsedActivities
            .map((item, index): ActivityEvent | null => {
              if (!item || typeof item !== "object") return null;
              const candidate = item as {
                id?: unknown;
                type?: unknown;
                timestamp?: unknown;
                message?: unknown;
                jobId?: unknown;
                recruiterId?: unknown;
                interviewId?: unknown;
              };

              if (!isActivityType(candidate.type)) return null;
              if (typeof candidate.message !== "string" || !candidate.message.trim()) {
                return null;
              }

              const timestamp =
                typeof candidate.timestamp === "number"
                  ? candidate.timestamp
                  : Date.now() - index;

              return {
                id:
                  typeof candidate.id === "number"
                    ? candidate.id
                    : Date.now() + index,
                type: candidate.type,
                timestamp,
                message: candidate.message.trim(),
                ...(typeof candidate.jobId === "number"
                  ? { jobId: candidate.jobId }
                  : {}),
                ...(typeof candidate.recruiterId === "number"
                  ? { recruiterId: candidate.recruiterId }
                  : {}),
                ...(typeof candidate.interviewId === "number"
                  ? { interviewId: candidate.interviewId }
                  : {}),
              };
            })
            .filter((activity): activity is ActivityEvent => activity !== null)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, ACTIVITY_MAX_ITEMS);

          setActivities(normalizedActivities);
        }
      }
    } catch {
      setJobs(defaultJobs);
      setRecruiters(defaultRecruiters);
      setInterviews(defaultInterviews);
      setActivities([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      RECRUITER_STORAGE_KEY,
      JSON.stringify(recruiters)
    );
  }, [isHydrated, recruiters]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      INTERVIEW_STORAGE_KEY,
      JSON.stringify(interviews)
    );
  }, [interviews, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      JSON.stringify(activities)
    );
  }, [activities, isHydrated]);

  useEffect(() => {
    if (!importError) return;
    const timeoutId = window.setTimeout(() => {
      setImportError("");
    }, 3500);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [importError]);

  useEffect(() => {
    function handleEscapeKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (editingInterviewId !== null) {
        setEditingInterviewId(null);
        setEditInterviewJobId("");
        setEditInterviewRecruiterId("");
        setEditInterviewType(interviewTypeOptions[0]);
        setEditInterviewStatus("Scheduled");
        setEditInterviewScheduledAt("");
        setEditInterviewNotes("");
        setEditInterviewError("");
        return;
      }

      if (editingRecruiterId !== null) {
        setEditingRecruiterId(null);
        setEditRecruiterName("");
        setEditRecruiterCompany("");
        setEditRecruiterRole("");
        setEditRecruiterEmail("");
        setEditRecruiterProfileLink("");
        setEditRecruiterNotes("");
        setEditLastContactDate("");
        setEditNextFollowUpDate("");
        setEditRecruiterError("");
        return;
      }

      if (editingJobId !== null) {
        setEditingJobId(null);
        setEditCompany("");
        setEditTitle("");
        setEditStatus("Saved");
        setEditNote("");
        setEditJobLink("");
        setEditError("");
        return;
      }

      if (detailsRecruiterId !== null) {
        setDetailsRecruiterId(null);
        setRecruiterDetailsSource("Recruiters");
        setRecruiterSourceJobId(null);
        setRecruiterSourceJobView("Dashboard");
        return;
      }

      if (detailsJobId !== null) {
        setDetailsJobId(null);
        setFollowUpDraftDate("");
        setFollowUpError("");
        setIsLinkRecruiterMode(false);
        setLinkRecruiterSelection("");
        setLinkRecruiterError("");
      }
    }

    window.addEventListener("keydown", handleEscapeKeyDown);
    return () => {
      window.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, [
    detailsJobId,
    detailsRecruiterId,
    editingInterviewId,
    editingRecruiterId,
    editingJobId,
  ]);

  const applicationJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = jobs.filter((job) => {
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      const matchesSearch =
        !query ||
        job.company.toLowerCase().includes(query) ||
        job.title.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });

    return filtered.sort((a, b) =>
      sortOrder === "Newest" ? b.id - a.id : a.id - b.id
    );
  }, [jobs, searchTerm, sortOrder, statusFilter]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === detailsJobId) ?? null,
    [detailsJobId, jobs]
  );

  const selectedJobLinkedRecruiter = useMemo(() => {
    if (!selectedJob || typeof selectedJob.linkedRecruiterId !== "number") {
      return null;
    }
    return (
      recruiters.find(
        (recruiter) => recruiter.id === selectedJob.linkedRecruiterId
      ) ?? null
    );
  }, [recruiters, selectedJob]);

  const selectedJobInterviews = useMemo(() => {
    if (!selectedJob) return [];
    return interviews
      .filter((interview) => interview.jobId === selectedJob.id)
      .sort((a, b) => {
        const aTs = dateTimeToTimestamp(a.scheduledAt) ?? Number.MAX_SAFE_INTEGER;
        const bTs = dateTimeToTimestamp(b.scheduledAt) ?? Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      });
  }, [interviews, selectedJob]);

  const selectedJobFollowUp = useMemo(
    () => (selectedJob ? getFollowUpMeta(selectedJob) : null),
    [selectedJob]
  );

  const linkedJobByRecruiterId = useMemo(() => {
    const mapping = new Map<number, Job>();
    jobs.forEach((job) => {
      if (typeof job.linkedRecruiterId === "number") {
        mapping.set(job.linkedRecruiterId, job);
      }
    });
    return mapping;
  }, [jobs]);

  const selectedRecruiter = useMemo(
    () => recruiters.find((recruiter) => recruiter.id === detailsRecruiterId) ?? null,
    [detailsRecruiterId, recruiters]
  );

  const selectedRecruiterLinkedJob = useMemo(() => {
    if (!selectedRecruiter) return null;
    return linkedJobByRecruiterId.get(selectedRecruiter.id) ?? null;
  }, [linkedJobByRecruiterId, selectedRecruiter]);

  const filteredRecruiters = useMemo(() => {
    const query = recruiterSearchTerm.trim().toLowerCase();

    const filtered = recruiters.filter((recruiter) => {
      if (!query) return true;
      return (
        recruiter.name.toLowerCase().includes(query) ||
        recruiter.company.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    if (recruiterSortOrder === "Newest") {
      sorted.sort(
        (a, b) =>
          (b.createdAt ?? b.id) - (a.createdAt ?? a.id)
      );
      return sorted;
    }

    sorted.sort((a, b) => {
      const aTs = dateStringToStartOfDay(a.nextFollowUpDate);
      const bTs = dateStringToStartOfDay(b.nextFollowUpDate);
      if (aTs === null && bTs === null) {
        return (b.createdAt ?? b.id) - (a.createdAt ?? a.id);
      }
      if (aTs === null) return 1;
      if (bTs === null) return -1;
      return aTs - bTs;
    });

    return sorted;
  }, [recruiterSearchTerm, recruiterSortOrder, recruiters]);

  const followUpSoonCount = useMemo(
    () =>
      recruiters.filter((recruiter) =>
        isFollowUpSoon(recruiter.nextFollowUpDate)
      ).length,
    [recruiters]
  );

  const jobsById = useMemo(() => {
    const mapping = new Map<number, Job>();
    jobs.forEach((job) => mapping.set(job.id, job));
    return mapping;
  }, [jobs]);

  const recruitersById = useMemo(() => {
    const mapping = new Map<number, Recruiter>();
    recruiters.forEach((recruiter) => mapping.set(recruiter.id, recruiter));
    return mapping;
  }, [recruiters]);

  const filteredInterviews = useMemo(() => {
    const query = interviewSearchTerm.trim().toLowerCase();
    const filtered = interviews.filter((interview) => {
      const interviewJob = jobsById.get(interview.jobId);
      const interviewRecruiter =
        typeof interview.recruiterId === "number"
          ? recruitersById.get(interview.recruiterId)
          : undefined;

      const matchesStatus =
        interviewStatusFilter === "All" || interview.status === interviewStatusFilter;
      const matchesSearch =
        !query ||
        (interviewJob?.company.toLowerCase().includes(query) ?? false) ||
        (interviewJob?.title.toLowerCase().includes(query) ?? false) ||
        (interviewRecruiter?.name.toLowerCase().includes(query) ?? false);

      return matchesStatus && matchesSearch;
    });

    const sorted = [...filtered];
    if (interviewSortOrder === "Newest created") {
      sorted.sort(
        (a, b) => (b.createdAt ?? b.id) - (a.createdAt ?? a.id)
      );
      return sorted;
    }
    if (interviewSortOrder === "Recently updated") {
      sorted.sort(
        (a, b) => (b.updatedAt ?? b.createdAt ?? b.id) - (a.updatedAt ?? a.createdAt ?? a.id)
      );
      return sorted;
    }

    sorted.sort((a, b) => {
      const aTs = dateTimeToTimestamp(a.scheduledAt);
      const bTs = dateTimeToTimestamp(b.scheduledAt);
      if (aTs === null && bTs === null) {
        return (b.createdAt ?? b.id) - (a.createdAt ?? a.id);
      }
      if (aTs === null) return 1;
      if (bTs === null) return -1;
      return aTs - bTs;
    });
    return sorted;
  }, [
    interviewSearchTerm,
    interviewSortOrder,
    interviewStatusFilter,
    interviews,
    jobsById,
    recruitersById,
  ]);

  const upcomingInterviewCount = useMemo(() => {
    const now = Date.now();
    return interviews.filter((interview) => {
      if (interview.status !== "Scheduled") return false;
      const ts = dateTimeToTimestamp(interview.scheduledAt);
      return ts !== null && ts >= now;
    }).length;
  }, [interviews]);

  const followUpDashboardJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonCutoff = today.getTime() + 7 * 86400000;

    return jobs
      .map((job) => {
        const followUp = getFollowUpMeta(job);
        const dueTs = followUp.dueTimestamp;
        const isDueSoon =
          dueTs !== null &&
          dueTs > today.getTime() &&
          dueTs <= soonCutoff &&
          followUp.status === "Planned";
        let bucket = 99;
        if (followUp.isOverdue) bucket = 0;
        else if (followUp.isDueToday) bucket = 1;
        else if (isDueSoon) bucket = 2;

        return { job, followUp, bucket, dueTs };
      })
      .filter((item) => item.bucket < 99)
      .sort((a, b) => {
        if (a.bucket !== b.bucket) return a.bucket - b.bucket;
        const aTs = a.dueTs ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.dueTs ?? Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      });
  }, [jobs]);

  const followUpsDueTodayCount = useMemo(
    () => jobs.filter((job) => getFollowUpMeta(job).isDueToday).length,
    [jobs]
  );

  const followUpsOverdueCount = useMemo(
    () => jobs.filter((job) => getFollowUpMeta(job).isOverdue).length,
    [jobs]
  );

  const pipelineCounts = useMemo(
    () =>
      statusOptions.map((statusOption) => ({
        status: statusOption,
        count: jobs.filter((job) => job.status === statusOption).length,
      })),
    [jobs]
  );

  const upcomingInterviewsForDashboard = useMemo(() => {
    const now = Date.now();
    return [...interviews]
      .filter((interview) => {
        if (interview.status !== "Scheduled") return false;
        const ts = dateTimeToTimestamp(interview.scheduledAt);
        return ts !== null && ts >= now;
      })
      .sort((a, b) => {
        const aTs = dateTimeToTimestamp(a.scheduledAt) ?? Number.MAX_SAFE_INTEGER;
        const bTs = dateTimeToTimestamp(b.scheduledAt) ?? Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      })
      .slice(0, 5);
  }, [interviews]);

  const interviewsNeedingUpdate = useMemo(
    () => interviews.filter((interview) => needsInterviewOutcomeUpdate(interview)),
    [interviews]
  );

  const recentActivities = useMemo(
    () =>
      [...activities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
    [activities]
  );

  const selectedJobActivities = useMemo(() => {
    if (!selectedJob) return [];
    return activities
      .filter((activity) => activity.jobId === selectedJob.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
  }, [activities, selectedJob]);

  const selectedRecruiterActivities = useMemo(() => {
    if (!selectedRecruiter) return [];
    return activities
      .filter((activity) => activity.recruiterId === selectedRecruiter.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
  }, [activities, selectedRecruiter]);

  function addActivity(
    entry: Omit<ActivityEvent, "id" | "timestamp"> & {
      timestamp?: number;
    }
  ) {
    const timestamp = entry.timestamp ?? Date.now();
    const event: ActivityEvent = {
      id: timestamp + Math.floor(Math.random() * 1000),
      type: entry.type,
      timestamp,
      message: entry.message,
      ...(typeof entry.jobId === "number" ? { jobId: entry.jobId } : {}),
      ...(typeof entry.recruiterId === "number"
        ? { recruiterId: entry.recruiterId }
        : {}),
      ...(typeof entry.interviewId === "number"
        ? { interviewId: entry.interviewId }
        : {}),
    };

    setActivities((prev) => [event, ...prev].slice(0, ACTIVITY_MAX_ITEMS));
  }

  function canOpenActivityContext(activity: ActivityEvent): boolean {
    if (typeof activity.jobId === "number") {
      return jobsById.has(activity.jobId);
    }

    if (typeof activity.recruiterId === "number") {
      return recruitersById.has(activity.recruiterId);
    }

    if (typeof activity.interviewId === "number") {
      return interviews.some((interview) => interview.id === activity.interviewId);
    }

    return false;
  }

  function handleOpenActivityContext(activity: ActivityEvent) {
    if (typeof activity.jobId === "number" && jobsById.has(activity.jobId)) {
      handleOpenDetails(activity.jobId, "Dashboard");
      return;
    }

    if (
      typeof activity.recruiterId === "number" &&
      recruitersById.has(activity.recruiterId)
    ) {
      handleOpenRecruiterDetails(activity.recruiterId, "Recruiters");
      return;
    }

    if (typeof activity.interviewId === "number") {
      const interview = interviews.find((item) => item.id === activity.interviewId);
      if (!interview) return;

      if (jobsById.has(interview.jobId)) {
        handleOpenDetails(interview.jobId, "Dashboard");
        return;
      }

      setActiveView("Interviews");
    }
  }

  function readStorageArray(key: string): unknown[] {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function normalizeImportedJobs(rawJobs: unknown[]): Job[] {
    return rawJobs
      .map((item, index): Job | null => {
        if (!isObjectRecord(item)) return null;

        const company = typeof item.company === "string" ? item.company.trim() : "";
        const title = typeof item.title === "string" ? item.title.trim() : "";
        if (!company || !title) return null;

        const normalizedJobLink = normalizeLink(item.jobLink);
        const normalizedNextFollowUpDate = normalizeDateInput(item.nextFollowUpDate);
        const normalizedLastContactDate = normalizeDateInput(item.lastContactDate);
        const normalizedFollowUpStatus = followUpStatusOptions.includes(
          item.followUpStatus as FollowUpStatus
        )
          ? (item.followUpStatus as FollowUpStatus)
          : undefined;

        return {
          id: typeof item.id === "number" ? item.id : Date.now() + index,
          company,
          title,
          status: isJobStatus(item.status) ? item.status : "Saved",
          note:
            typeof item.note === "string" && item.note.trim()
              ? item.note.trim()
              : "Recently added",
          ...(normalizedJobLink ? { jobLink: normalizedJobLink } : {}),
          ...(typeof item.linkedRecruiterId === "number"
            ? { linkedRecruiterId: item.linkedRecruiterId }
            : {}),
          ...(normalizedNextFollowUpDate
            ? { nextFollowUpDate: normalizedNextFollowUpDate }
            : {}),
          ...(normalizedLastContactDate
            ? { lastContactDate: normalizedLastContactDate }
            : {}),
          ...(normalizedFollowUpStatus
            ? { followUpStatus: normalizedFollowUpStatus }
            : {}),
          ...(typeof item.createdAt === "number"
            ? { createdAt: item.createdAt }
            : {}),
        };
      })
      .filter((job): job is Job => job !== null);
  }

  function normalizeImportedRecruiters(rawRecruiters: unknown[]): Recruiter[] {
    return rawRecruiters
      .map((item, index): Recruiter | null => {
        if (!isObjectRecord(item)) return null;

        const name = typeof item.name === "string" ? item.name.trim() : "";
        const company = typeof item.company === "string" ? item.company.trim() : "";
        if (!name || !company) return null;

        const normalizedProfileLink = normalizeLink(item.profileLink);
        const normalizedLastContactDate = normalizeDateInput(item.lastContactDate);
        const normalizedNextFollowUpDate = normalizeDateInput(item.nextFollowUpDate);

        return {
          id: typeof item.id === "number" ? item.id : Date.now() + index,
          name,
          company,
          role: typeof item.role === "string" ? item.role.trim() : "",
          email: typeof item.email === "string" ? item.email.trim() : "",
          notes:
            typeof item.notes === "string" && item.notes.trim()
              ? item.notes.trim()
              : "No notes yet.",
          ...(normalizedProfileLink ? { profileLink: normalizedProfileLink } : {}),
          ...(normalizedLastContactDate
            ? { lastContactDate: normalizedLastContactDate }
            : {}),
          ...(normalizedNextFollowUpDate
            ? { nextFollowUpDate: normalizedNextFollowUpDate }
            : {}),
          ...(typeof item.createdAt === "number"
            ? { createdAt: item.createdAt }
            : {}),
        };
      })
      .filter((recruiter): recruiter is Recruiter => recruiter !== null);
  }

  function normalizeImportedInterviews(rawInterviews: unknown[]): Interview[] {
    return rawInterviews
      .map((item, index): Interview | null => {
        if (!isObjectRecord(item)) return null;
        const normalizedScheduledAt = normalizeDateTimeInput(item.scheduledAt);
        if (typeof item.jobId !== "number" || !normalizedScheduledAt) return null;

        const normalizedStatus = interviewStatusOptions.includes(
          item.status as InterviewStatus
        )
          ? (item.status as InterviewStatus)
          : "Scheduled";

        return {
          id: typeof item.id === "number" ? item.id : Date.now() + index,
          jobId: item.jobId,
          ...(typeof item.recruiterId === "number"
            ? { recruiterId: item.recruiterId }
            : {}),
          interviewType:
            typeof item.interviewType === "string" && item.interviewType.trim()
              ? item.interviewType.trim()
              : interviewTypeOptions[0],
          status: normalizedStatus,
          scheduledAt: normalizedScheduledAt,
          notes:
            typeof item.notes === "string" && item.notes.trim()
              ? item.notes.trim()
              : "No notes yet.",
          ...(typeof item.createdAt === "number"
            ? { createdAt: item.createdAt }
            : {}),
          ...(typeof item.updatedAt === "number"
            ? { updatedAt: item.updatedAt }
            : {}),
        };
      })
      .filter((interview): interview is Interview => interview !== null);
  }

  function handleExportData() {
    setImportError("");
    setImportFeedback("");
    const exportPayload = {
      jobs: readStorageArray(STORAGE_KEY),
      recruiters: readStorageArray(RECRUITER_STORAGE_KEY),
      interviews: readStorageArray(INTERVIEW_STORAGE_KEY),
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    };

    const formattedJson = JSON.stringify(exportPayload, null, 2);
    const fileBlob = new Blob([formattedJson], { type: "application/json" });
    const objectUrl = URL.createObjectURL(fileBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = `job-search-copilot-backup-${toLocalDateInput(
      new Date()
    )}.json`;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(objectUrl);

    setExportFeedback("Backup downloaded");
    window.setTimeout(() => {
      setExportFeedback("");
    }, 2500);
  }

  function handleImportDataClick() {
    setExportFeedback("");
    setImportError("");
    setImportFeedback("");
    if (!importInputRef.current) return;
    importInputRef.current.value = "";
    importInputRef.current.click();
  }

  async function handleImportFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setExportFeedback("");
    setImportError("");
    setImportFeedback("");

    let parsedPayload: unknown;
    try {
      const text = await selectedFile.text();
      parsedPayload = JSON.parse(text);
    } catch {
      setImportError("Invalid backup file");
      return;
    }

    if (!isObjectRecord(parsedPayload)) {
      setImportError("Backup format not supported");
      return;
    }

    const rawJobs = parsedPayload.jobs;
    const rawRecruiters = parsedPayload.recruiters;
    const rawInterviews = parsedPayload.interviews;

    if (!Array.isArray(rawJobs) || !Array.isArray(rawRecruiters) || !Array.isArray(rawInterviews)) {
      setImportError("Backup format not supported");
      return;
    }

    const isConfirmed = window.confirm(
      "Import will replace your current jobs, recruiters, and interviews. Continue?"
    );
    if (!isConfirmed) {
      setImportFeedback("Import cancelled");
      return;
    }

    const normalizedJobs = normalizeImportedJobs(rawJobs);
    const normalizedRecruiters = normalizeImportedRecruiters(rawRecruiters);
    const normalizedInterviews = normalizeImportedInterviews(rawInterviews);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedJobs));
    window.localStorage.setItem(
      RECRUITER_STORAGE_KEY,
      JSON.stringify(normalizedRecruiters)
    );
    window.localStorage.setItem(
      INTERVIEW_STORAGE_KEY,
      JSON.stringify(normalizedInterviews)
    );

    setJobs(normalizedJobs);
    setRecruiters(normalizedRecruiters);
    setInterviews(normalizedInterviews);
    setDetailsJobId(null);
    setDetailsRecruiterId(null);
    if (editingJobId !== null) {
      handleCloseEdit();
    }
    if (editingRecruiterId !== null) {
      handleCloseRecruiterEdit();
    }
    if (editingInterviewId !== null) {
      handleCloseInterviewEdit();
    }

    setImportFeedback("Data imported successfully");
    window.setTimeout(() => {
      setImportFeedback("");
    }, 3000);
  }

  function handleSaveJob() {
    const trimmedCompany = company.trim();
    const trimmedTitle = title.trim();

    if (!trimmedCompany || !trimmedTitle) {
      setFormError("Company and Job title are required before saving.");
      return;
    }

    const newJob: Job = {
      id: Date.now(),
      company: trimmedCompany,
      title: trimmedTitle,
      status,
      note: note.trim() || "Recently added",
      jobLink: normalizeLink(jobLink),
      followUpStatus: "Not needed",
      createdAt: Date.now(),
    };

    setJobs((prev) => [newJob, ...prev]);
    addActivity({
      type: "job_created",
      message: `Added job ${newJob.title} at ${newJob.company}`,
      jobId: newJob.id,
    });
    setCompany("");
    setTitle("");
    setStatus("Saved");
    setNote("");
    setJobLink("");
    setFormError("");
  }

  function handleDeleteJob(id: number) {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;

    const isConfirmed = window.confirm(
      `Delete "${job.company} - ${job.title}"? This cannot be undone.`
    );
    if (!isConfirmed) return;

    addActivity({
      type: "job_deleted",
      message: `Deleted job ${job.title} at ${job.company}`,
      jobId: job.id,
    });
    if (typeof job.linkedRecruiterId === "number") {
      const recruiter = recruitersById.get(job.linkedRecruiterId);
      if (recruiter) {
        addActivity({
          type: "recruiter_unlinked",
          message: `Unlinked recruiter ${recruiter.name} from ${job.title} at ${job.company} due to job deletion`,
          jobId: job.id,
          recruiterId: recruiter.id,
        });
      }
    }
    setJobs((prev) => prev.filter((item) => item.id !== id));
    setInterviews((prev) => prev.filter((interview) => interview.jobId !== id));
    if (detailsJobId === id) {
      setDetailsJobId(null);
    }
    if (editingJobId === id) {
      handleCloseEdit();
    }
    if (recruiterSourceJobId === id) {
      setRecruiterSourceJobId(null);
    }
    if (editInterviewJobId === String(id)) {
      handleCloseInterviewEdit();
    }
  }

  function handleOpenDetails(jobId: number, source: JobDetailsSource) {
    const selected = jobs.find((job) => job.id === jobId);
    setDetailsJobId(jobId);
    setDetailsSource(source);
    setFollowUpDraftDate(selected?.nextFollowUpDate ?? "");
    setFollowUpError("");
    setDetailsRecruiterId(null);
    setIsLinkRecruiterMode(false);
    setLinkRecruiterSelection("");
    setLinkRecruiterError("");
  }

  function handleCloseDetails() {
    setDetailsJobId(null);
    setFollowUpDraftDate("");
    setFollowUpError("");
    setIsLinkRecruiterMode(false);
    setLinkRecruiterSelection("");
    setLinkRecruiterError("");
  }

  function handleOpenRecruiterDetails(
    recruiterId: number,
    source: RecruiterDetailsSource,
    sourceJobId?: number,
    sourceJobView?: JobDetailsSource
  ) {
    setDetailsRecruiterId(recruiterId);
    setRecruiterDetailsSource(source);
    setRecruiterSourceJobId(source === "JobDetails" ? sourceJobId ?? null : null);
    setRecruiterSourceJobView(sourceJobView ?? "Dashboard");
    setDetailsJobId(null);
  }

  function handleCloseRecruiterDetails() {
    setDetailsRecruiterId(null);
    setRecruiterDetailsSource("Recruiters");
    setRecruiterSourceJobId(null);
    setRecruiterSourceJobView("Dashboard");
  }

  function handleBackFromRecruiterDetails() {
    if (
      recruiterDetailsSource === "JobDetails" &&
      recruiterSourceJobId !== null
    ) {
      handleOpenDetails(recruiterSourceJobId, recruiterSourceJobView);
      setDetailsRecruiterId(null);
      return;
    }

    if (recruiterDetailsSource === "Interviews") {
      setActiveView("Interviews");
    } else {
      setActiveView("Recruiters");
    }
    handleCloseRecruiterDetails();
  }

  function handleStartRecruiterLinking() {
    if (!selectedJob) return;
    setIsLinkRecruiterMode(true);
    setLinkRecruiterSelection(
      typeof selectedJob.linkedRecruiterId === "number"
        ? String(selectedJob.linkedRecruiterId)
        : ""
    );
    setLinkRecruiterError("");
  }

  function handleCancelRecruiterLinking() {
    setIsLinkRecruiterMode(false);
    setLinkRecruiterSelection("");
    setLinkRecruiterError("");
  }

  function handleSaveRecruiterLink() {
    if (!selectedJob) return;
    const recruiterId = Number(linkRecruiterSelection);
    if (!Number.isFinite(recruiterId)) {
      setLinkRecruiterError("Select a recruiter before saving.");
      return;
    }

    const recruiter = recruitersById.get(recruiterId);
    if (!recruiter) {
      setLinkRecruiterError("Select a valid recruiter before saving.");
      return;
    }

    const previousRecruiterId =
      typeof selectedJob.linkedRecruiterId === "number"
        ? selectedJob.linkedRecruiterId
        : null;
    const previousRecruiter =
      previousRecruiterId !== null
        ? recruitersById.get(previousRecruiterId)
        : undefined;
    const previousJobForRecruiter = jobs.find(
      (job) => job.linkedRecruiterId === recruiterId && job.id !== selectedJob.id
    );

    if (previousRecruiterId === recruiterId && !previousJobForRecruiter) {
      setIsLinkRecruiterMode(false);
      setLinkRecruiterSelection(String(recruiterId));
      setLinkRecruiterError("");
      return;
    }

    setJobs((prev) =>
      prev.map((job) => {
        if (job.id === selectedJob.id) {
          return { ...job, linkedRecruiterId: recruiterId };
        }
        if (job.linkedRecruiterId === recruiterId) {
          const nextJob = { ...job };
          delete nextJob.linkedRecruiterId;
          return nextJob;
        }
        return job;
      })
    );

    if (
      previousRecruiter &&
      previousRecruiter.id !== recruiterId
    ) {
      addActivity({
        type: "recruiter_unlinked",
        message: `Unlinked recruiter ${previousRecruiter.name} from ${selectedJob.title} at ${selectedJob.company}`,
        jobId: selectedJob.id,
        recruiterId: previousRecruiter.id,
      });
    }

    if (previousJobForRecruiter) {
      addActivity({
        type: "recruiter_unlinked",
        message: `Unlinked recruiter ${recruiter.name} from ${previousJobForRecruiter.title} at ${previousJobForRecruiter.company}`,
        jobId: previousJobForRecruiter.id,
        recruiterId: recruiter.id,
      });
    }

    addActivity({
      type: "recruiter_linked",
      message: `Linked recruiter ${recruiter.name} to ${selectedJob.title} at ${selectedJob.company}`,
      jobId: selectedJob.id,
      recruiterId: recruiter.id,
    });

    setIsLinkRecruiterMode(false);
    setLinkRecruiterSelection(String(recruiterId));
    setLinkRecruiterError("");
  }

  function handleUnlinkRecruiterFromJob(jobId: number) {
    const job = jobsById.get(jobId);
    if (!job) return;
    const recruiterId =
      typeof job.linkedRecruiterId === "number" ? job.linkedRecruiterId : null;
    const recruiter =
      recruiterId !== null ? recruitersById.get(recruiterId) : undefined;

    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const nextJob = { ...job };
        delete nextJob.linkedRecruiterId;
        return nextJob;
      })
    );
    if (recruiter) {
      addActivity({
        type: "recruiter_unlinked",
        message: `Unlinked recruiter ${recruiter.name} from ${job.title} at ${job.company}`,
        jobId: job.id,
        recruiterId: recruiter.id,
      });
    }
    setIsLinkRecruiterMode(false);
    setLinkRecruiterSelection("");
    setLinkRecruiterError("");
  }

  function handleSetFollowUpDate(jobId: number) {
    const normalizedDate = normalizeDateInput(followUpDraftDate);
    if (!normalizedDate) {
      setFollowUpError("Select a valid follow-up date.");
      return;
    }

    const job = jobsById.get(jobId);
    if (!job) return;
    const previousDate = job.nextFollowUpDate;

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              nextFollowUpDate: normalizedDate,
              followUpStatus: "Planned",
            }
          : job
      )
    );
    addActivity({
      type: "follow_up_set",
      message: previousDate
        ? `Rescheduled follow-up for ${job.title} at ${job.company} from ${previousDate} to ${normalizedDate}`
        : `Follow-up scheduled for ${normalizedDate} on ${job.title} at ${job.company}`,
      jobId: job.id,
    });
    setFollowUpDraftDate(normalizedDate);
    setFollowUpError("");
  }

  function handleMarkContactedToday(jobId: number) {
    const today = toLocalDateInput(new Date());
    const job = jobsById.get(jobId);
    if (!job) return;

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              lastContactDate: today,
              followUpStatus: "Done",
            }
          : job
      )
    );
    addActivity({
      type: "follow_up_contacted_today",
      message: `Marked contacted today (${today}) for ${job.title} at ${job.company}`,
      jobId: job.id,
    });
    setFollowUpError("");
  }

  function handleMarkFollowUpDone(jobId: number) {
    const today = toLocalDateInput(new Date());
    const job = jobsById.get(jobId);
    if (!job) return;

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              lastContactDate: job.lastContactDate ?? today,
              followUpStatus: "Done",
            }
          : job
      )
    );
    addActivity({
      type: "follow_up_done",
      message: `Marked follow-up done for ${job.title} at ${job.company}`,
      jobId: job.id,
    });
    setFollowUpError("");
  }

  function handleClearFollowUp(jobId: number) {
    const job = jobsById.get(jobId);
    if (!job) return;

    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const nextJob = { ...job, followUpStatus: "Not needed" as FollowUpStatus };
        delete nextJob.nextFollowUpDate;
        delete nextJob.lastContactDate;
        return nextJob;
      })
    );
    addActivity({
      type: "follow_up_cleared",
      message: `Cleared follow-up for ${job.title} at ${job.company}`,
      jobId: job.id,
    });
    setFollowUpDraftDate("");
    setFollowUpError("");
  }

  function handleStartEdit(job: Job) {
    setEditingJobId(job.id);
    setEditCompany(job.company);
    setEditTitle(job.title);
    setEditStatus(job.status);
    setEditNote(job.note);
    setEditJobLink(job.jobLink ?? "");
    setEditError("");
  }

  function handleCloseEdit() {
    setEditingJobId(null);
    setEditCompany("");
    setEditTitle("");
    setEditStatus("Saved");
    setEditNote("");
    setEditJobLink("");
    setEditError("");
  }

  function handleSaveEdit() {
    if (editingJobId === null) return;

    const trimmedCompany = editCompany.trim();
    const trimmedTitle = editTitle.trim();

    if (!trimmedCompany || !trimmedTitle) {
      setEditError("Company and Job title are required.");
      return;
    }

    const existingJob = jobsById.get(editingJobId);
    if (!existingJob) return;
    const normalizedJobLink = normalizeLink(editJobLink);

    setJobs((prev) =>
      prev.map((job) =>
        job.id === editingJobId
          ? {
              ...job,
              company: trimmedCompany,
              title: trimmedTitle,
              status: editStatus,
              note: editNote.trim() || "Recently updated",
              jobLink: normalizedJobLink,
            }
          : job
      )
    );
    addActivity({
      type: "job_edited",
      message: `Edited job ${trimmedTitle} at ${trimmedCompany}`,
      jobId: editingJobId,
    });
    if (existingJob.status !== editStatus) {
      addActivity({
        type: "job_status_changed",
        message: `Status changed from ${existingJob.status} to ${editStatus} for ${trimmedTitle} at ${trimmedCompany}`,
        jobId: editingJobId,
      });
    }

    handleCloseEdit();
  }

  function handleSaveRecruiter() {
    const trimmedName = recruiterName.trim();
    const trimmedCompany = recruiterCompany.trim();

    if (!trimmedName || !trimmedCompany) {
      setRecruiterError("Name and company are required.");
      return;
    }

    const newRecruiter: Recruiter = {
      id: Date.now(),
      name: trimmedName,
      company: trimmedCompany,
      role: recruiterRole.trim(),
      email: recruiterEmail.trim(),
      notes: recruiterNotes.trim() || "No notes yet.",
      profileLink: normalizeLink(recruiterProfileLink),
      lastContactDate: normalizeDateInput(lastContactDate),
      nextFollowUpDate: normalizeDateInput(nextFollowUpDate),
      createdAt: Date.now(),
    };

    setRecruiters((prev) => [newRecruiter, ...prev]);
    addActivity({
      type: "recruiter_created",
      message: `Added recruiter ${newRecruiter.name} at ${newRecruiter.company}`,
      recruiterId: newRecruiter.id,
    });
    setRecruiterName("");
    setRecruiterCompany("");
    setRecruiterRole("");
    setRecruiterEmail("");
    setRecruiterProfileLink("");
    setRecruiterNotes("");
    setLastContactDate("");
    setNextFollowUpDate("");
    setRecruiterError("");
  }

  function handleDeleteRecruiter(id: number) {
    const recruiter = recruiters.find((item) => item.id === id);
    if (!recruiter) return;

    const isConfirmed = window.confirm(
      `Delete recruiter "${recruiter.name}" at "${recruiter.company}"?`
    );
    if (!isConfirmed) return;

    const affectedJobs = jobs.filter((job) => job.linkedRecruiterId === id);
    const affectedInterviews = interviews.filter(
      (interview) => interview.recruiterId === id
    );

    setRecruiters((prev) => prev.filter((item) => item.id !== id));
    setJobs((prev) =>
      prev.map((job) => {
        if (job.linkedRecruiterId !== id) return job;
        const nextJob = { ...job };
        delete nextJob.linkedRecruiterId;
        return nextJob;
      })
    );
    setInterviews((prev) =>
      prev.map((interview) => {
        if (interview.recruiterId !== id) return interview;
        const nextInterview = { ...interview };
        delete nextInterview.recruiterId;
        return nextInterview;
      })
    );
    affectedJobs.forEach((job) => {
      addActivity({
        type: "recruiter_unlinked",
        message: `Unlinked recruiter ${recruiter.name} from ${job.title} at ${job.company}`,
        jobId: job.id,
        recruiterId: recruiter.id,
      });
    });
    affectedInterviews.forEach((interview) => {
      const interviewJob = jobsById.get(interview.jobId);
      addActivity({
        type: "interview_edited",
        message: `Removed recruiter ${recruiter.name} from interview for ${
          interviewJob
            ? `${interviewJob.title} at ${interviewJob.company}`
            : "a removed job"
        }`,
        jobId: interview.jobId,
        recruiterId: recruiter.id,
        interviewId: interview.id,
      });
    });
    addActivity({
      type: "recruiter_deleted",
      message: `Deleted recruiter ${recruiter.name} at ${recruiter.company}`,
      recruiterId: recruiter.id,
    });
    if (editingRecruiterId === id) {
      handleCloseRecruiterEdit();
    }
    if (detailsRecruiterId === id) {
      handleCloseRecruiterDetails();
    }
    if (linkRecruiterSelection === String(id)) {
      setLinkRecruiterSelection("");
    }
    if (editInterviewRecruiterId === String(id)) {
      setEditInterviewRecruiterId("");
    }
  }

  function handleStartRecruiterEdit(recruiter: Recruiter) {
    setEditingRecruiterId(recruiter.id);
    setEditRecruiterName(recruiter.name);
    setEditRecruiterCompany(recruiter.company);
    setEditRecruiterRole(recruiter.role);
    setEditRecruiterEmail(recruiter.email);
    setEditRecruiterProfileLink(recruiter.profileLink ?? "");
    setEditRecruiterNotes(recruiter.notes);
    setEditLastContactDate(recruiter.lastContactDate ?? "");
    setEditNextFollowUpDate(recruiter.nextFollowUpDate ?? "");
    setEditRecruiterError("");
  }

  function handleCloseRecruiterEdit() {
    setEditingRecruiterId(null);
    setEditRecruiterName("");
    setEditRecruiterCompany("");
    setEditRecruiterRole("");
    setEditRecruiterEmail("");
    setEditRecruiterProfileLink("");
    setEditRecruiterNotes("");
    setEditLastContactDate("");
    setEditNextFollowUpDate("");
    setEditRecruiterError("");
  }

  function handleSaveRecruiterEdit() {
    if (editingRecruiterId === null) return;

    const trimmedName = editRecruiterName.trim();
    const trimmedCompany = editRecruiterCompany.trim();
    if (!trimmedName || !trimmedCompany) {
      setEditRecruiterError("Name and company are required.");
      return;
    }

    const recruiter = recruitersById.get(editingRecruiterId);
    if (!recruiter) return;

    setRecruiters((prev) =>
      prev.map((recruiter) =>
        recruiter.id === editingRecruiterId
          ? {
              ...recruiter,
              name: trimmedName,
              company: trimmedCompany,
              role: editRecruiterRole.trim(),
              email: editRecruiterEmail.trim(),
              profileLink: normalizeLink(editRecruiterProfileLink),
              notes: editRecruiterNotes.trim() || "No notes yet.",
              lastContactDate: normalizeDateInput(editLastContactDate),
              nextFollowUpDate: normalizeDateInput(editNextFollowUpDate),
            }
          : recruiter
      )
    );
    addActivity({
      type: "recruiter_edited",
      message: `Edited recruiter ${trimmedName} at ${trimmedCompany}`,
      recruiterId: recruiter.id,
    });

    handleCloseRecruiterEdit();
  }

  function handleSaveInterview() {
    const parsedJobId = Number(interviewJobId);
    const normalizedScheduledAt = normalizeDateTimeInput(interviewScheduledAt);

    if (!Number.isFinite(parsedJobId) || !jobsById.has(parsedJobId)) {
      setInterviewError("Choose a valid job.");
      return;
    }
    if (!normalizedScheduledAt) {
      setInterviewError("Set a valid interview date and time.");
      return;
    }

    const parsedRecruiterId = Number(interviewRecruiterId);
    const hasValidRecruiter =
      Number.isFinite(parsedRecruiterId) && recruitersById.has(parsedRecruiterId);
    const interviewJob = jobsById.get(parsedJobId);
    if (!interviewJob) {
      setInterviewError("Choose a valid job.");
      return;
    }
    const interviewRecruiter = hasValidRecruiter
      ? recruitersById.get(parsedRecruiterId)
      : undefined;

    const newInterview: Interview = {
      id: Date.now(),
      jobId: parsedJobId,
      ...(hasValidRecruiter ? { recruiterId: parsedRecruiterId } : {}),
      interviewType: interviewType.trim() || interviewTypeOptions[0],
      status: interviewStatus,
      scheduledAt: normalizedScheduledAt,
      notes: interviewNotes.trim() || "No notes yet.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setInterviews((prev) => [newInterview, ...prev]);
    addActivity({
      type: "interview_created",
      message: `Created ${newInterview.interviewType} interview (${newInterview.status}) for ${interviewJob.title} at ${interviewJob.company}`,
      jobId: interviewJob.id,
      ...(interviewRecruiter ? { recruiterId: interviewRecruiter.id } : {}),
      interviewId: newInterview.id,
    });
    setInterviewJobId("");
    setInterviewRecruiterId("");
    setInterviewType(interviewTypeOptions[0]);
    setInterviewStatus("Scheduled");
    setInterviewScheduledAt("");
    setInterviewNotes("");
    setInterviewError("");
  }

  function handleDeleteInterview(id: number) {
    const interview = interviews.find((item) => item.id === id);
    if (!interview) return;

    const interviewJob = jobsById.get(interview.jobId);
    const label = interviewJob
      ? `${interviewJob.company} - ${interviewJob.title}`
      : "this interview";

    const isConfirmed = window.confirm(`Delete interview for "${label}"?`);
    if (!isConfirmed) return;

    addActivity({
      type: "interview_deleted",
      message: `Deleted ${interview.interviewType} interview for ${label}`,
      jobId: interview.jobId,
      ...(typeof interview.recruiterId === "number"
        ? { recruiterId: interview.recruiterId }
        : {}),
      interviewId: interview.id,
    });
    setInterviews((prev) => prev.filter((item) => item.id !== id));
    if (editingInterviewId === id) {
      handleCloseInterviewEdit();
    }
  }

  function handleStartInterviewEdit(interview: Interview) {
    setEditingInterviewId(interview.id);
    setEditInterviewJobId(String(interview.jobId));
    setEditInterviewRecruiterId(
      typeof interview.recruiterId === "number" ? String(interview.recruiterId) : ""
    );
    setEditInterviewType(interview.interviewType);
    setEditInterviewStatus(interview.status);
    setEditInterviewScheduledAt(interview.scheduledAt);
    setEditInterviewNotes(interview.notes);
    setEditInterviewError("");
  }

  function handleCloseInterviewEdit() {
    setEditingInterviewId(null);
    setEditInterviewJobId("");
    setEditInterviewRecruiterId("");
    setEditInterviewType(interviewTypeOptions[0]);
    setEditInterviewStatus("Scheduled");
    setEditInterviewScheduledAt("");
    setEditInterviewNotes("");
    setEditInterviewError("");
  }

  function handleSetInterviewStatus(id: number, status: InterviewStatus) {
    const existingInterview = interviews.find((interview) => interview.id === id);
    if (!existingInterview) return;
    if (existingInterview.status === status) return;

    const interviewJob = jobsById.get(existingInterview.jobId);
    setInterviews((prev) =>
      prev.map((interview) =>
        interview.id === id
          ? { ...interview, status, updatedAt: Date.now() }
          : interview
      )
    );
    addActivity({
      type: "interview_status_changed",
      message: `Interview status changed from ${existingInterview.status} to ${status} for ${
        interviewJob
          ? `${interviewJob.title} at ${interviewJob.company}`
          : "a removed job"
      }`,
      jobId: existingInterview.jobId,
      ...(typeof existingInterview.recruiterId === "number"
        ? { recruiterId: existingInterview.recruiterId }
        : {}),
      interviewId: existingInterview.id,
    });
  }

  function handleStartInterviewQuickCreateFromJob(job: Job) {
    setActiveView("Interviews");
    setInterviewJobId(String(job.id));
    setInterviewRecruiterId(
      typeof job.linkedRecruiterId === "number" ? String(job.linkedRecruiterId) : ""
    );
    setInterviewType(interviewTypeOptions[0]);
    setInterviewStatus("Scheduled");
    setInterviewScheduledAt("");
    setInterviewNotes("");
    setInterviewError("");
    setDetailsJobId(null);
  }

  function handleSaveInterviewEdit() {
    if (editingInterviewId === null) return;
    const parsedJobId = Number(editInterviewJobId);
    const normalizedScheduledAt = normalizeDateTimeInput(editInterviewScheduledAt);

    if (!Number.isFinite(parsedJobId) || !jobsById.has(parsedJobId)) {
      setEditInterviewError("Choose a valid job.");
      return;
    }
    if (!normalizedScheduledAt) {
      setEditInterviewError("Set a valid interview date and time.");
      return;
    }

    const parsedRecruiterId = Number(editInterviewRecruiterId);
    const hasValidRecruiter =
      Number.isFinite(parsedRecruiterId) && recruitersById.has(parsedRecruiterId);
    const existingInterview = interviews.find(
      (interview) => interview.id === editingInterviewId
    );
    if (!existingInterview) return;
    const nextJob = jobsById.get(parsedJobId);
    if (!nextJob) return;
    const nextRecruiter = hasValidRecruiter
      ? recruitersById.get(parsedRecruiterId)
      : undefined;
    const previousRecruiter =
      typeof existingInterview.recruiterId === "number"
        ? recruitersById.get(existingInterview.recruiterId)
        : undefined;

    setInterviews((prev) =>
      prev.map((interview) =>
        interview.id === editingInterviewId
          ? {
              ...interview,
              jobId: parsedJobId,
              ...(hasValidRecruiter ? { recruiterId: parsedRecruiterId } : {}),
              ...(hasValidRecruiter ? {} : { recruiterId: undefined }),
              interviewType: editInterviewType.trim() || interviewTypeOptions[0],
              status: editInterviewStatus,
              scheduledAt: normalizedScheduledAt,
              notes: editInterviewNotes.trim() || "No notes yet.",
              updatedAt: Date.now(),
            }
          : interview
      )
    );
    addActivity({
      type: "interview_edited",
      message: `Updated ${editInterviewType.trim() || interviewTypeOptions[0]} interview for ${nextJob.title} at ${nextJob.company}`,
      jobId: nextJob.id,
      ...(nextRecruiter ? { recruiterId: nextRecruiter.id } : {}),
      interviewId: editingInterviewId,
    });
    if (existingInterview.status !== editInterviewStatus) {
      addActivity({
        type: "interview_status_changed",
        message: `Interview status changed from ${existingInterview.status} to ${editInterviewStatus} for ${nextJob.title} at ${nextJob.company}`,
        jobId: nextJob.id,
        ...(nextRecruiter ? { recruiterId: nextRecruiter.id } : {}),
        interviewId: editingInterviewId,
      });
    }
    if (
      previousRecruiter &&
      (!nextRecruiter || previousRecruiter.id !== nextRecruiter.id)
    ) {
      addActivity({
        type: "interview_edited",
        message: `Unassigned recruiter ${previousRecruiter.name} from interview for ${nextJob.title} at ${nextJob.company}`,
        jobId: nextJob.id,
        recruiterId: previousRecruiter.id,
        interviewId: editingInterviewId,
      });
    }
    if (
      nextRecruiter &&
      (!previousRecruiter || previousRecruiter.id !== nextRecruiter.id)
    ) {
      addActivity({
        type: "interview_edited",
        message: `Assigned recruiter ${nextRecruiter.name} to interview for ${nextJob.title} at ${nextJob.company}`,
        jobId: nextJob.id,
        recruiterId: nextRecruiter.id,
        interviewId: editingInterviewId,
      });
    }

    handleCloseInterviewEdit();
  }

  const navItemBase =
    "w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#ff6e2030_0%,transparent_35%),radial-gradient(circle_at_20%_30%,#0ea5e930_0%,transparent_32%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="h-fit rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 lg:w-64 lg:shrink-0">
            <p className="text-xs tracking-[0.12em] text-[var(--text-muted)] uppercase">
              Job Copilot
            </p>
            <h1 className="mt-2 text-xl font-semibold">Workspace</h1>

            <nav className="mt-5 space-y-2">
              <button
                onClick={() => setActiveView("Dashboard")}
                className={`${navItemBase} ${
                  activeView === "Dashboard"
                    ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                    : "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)]"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView("Applications")}
                className={`${navItemBase} ${
                  activeView === "Applications"
                    ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                    : "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)]"
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveView("Recruiters")}
                className={`${navItemBase} ${
                  activeView === "Recruiters"
                    ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                    : "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)]"
                }`}
              >
                Recruiters
              </button>
              <button
                onClick={() => setActiveView("Interviews")}
                className={`${navItemBase} ${
                  activeView === "Interviews"
                    ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                    : "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)]"
                }`}
              >
                Interviews
              </button>
            </nav>

            <div className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-xs text-[var(--text-muted)]">
              <p>Saved jobs: {jobs.length}</p>
              <p className="mt-1">Recruiters tracked: {recruiters.length}</p>
              <p className="mt-1">Interviews tracked: {interviews.length}</p>
            </div>
          </aside>

          <section className="flex-1 space-y-8">
            {activeView === "Dashboard" ? (
              <>
                <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 backdrop-blur-sm sm:p-8">
                  <p className="inline-block rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] px-3 py-1 text-xs font-medium tracking-[0.12em] text-[var(--pill-text)] uppercase">
                    Project Kickoff
                  </p>
                  <h2 className="mt-5 max-w-4xl text-3xl leading-tight font-semibold md:text-5xl">
                    Build an AI copilot that makes job search execution systematic.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base text-[var(--text-muted)] md:text-lg">
                    This starter homepage is your baseline. Next step is wiring real
                    data flows for jobs, outreach, resume tailoring, and interview
                    prep.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 font-medium">
                      Recruiters tracked: {recruiters.length}
                    </span>
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 font-medium">
                      Upcoming interviews: {upcomingInterviewCount}
                    </span>
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 font-medium text-amber-800">
                      Follow-ups due today: {followUpsDueTodayCount}
                    </span>
                    <span className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1 font-medium text-rose-700">
                      Overdue follow-ups: {followUpsOverdueCount}
                    </span>
                    {followUpSoonCount > 0 ? (
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 font-medium text-amber-800">
                        Follow-up soon: {followUpSoonCount}
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 font-medium text-[var(--text-muted)]">
                        No urgent follow-ups
                      </span>
                    )}
                  </div>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <button className="w-full rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95 sm:w-auto">
                      Start Building
                    </button>
                    <button className="w-full rounded-xl border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-secondary-text)] transition hover:bg-[var(--button-secondary-hover)] sm:w-auto">
                      Define MVP Scope
                    </button>
                    <button
                      onClick={handleExportData}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/70 sm:w-auto"
                    >
                      Export Data
                    </button>
                    <button
                      onClick={handleImportDataClick}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/70 sm:w-auto"
                    >
                      Import Data
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportFileSelected}
                      className="hidden"
                    />
                  </div>
                  {exportFeedback ? (
                    <p className="mt-3 text-sm text-emerald-700 transition-opacity" role="status">
                      {exportFeedback}
                    </p>
                  ) : null}
                  {importFeedback ? (
                    <p className="mt-1 text-sm text-emerald-700 transition-opacity" role="status">
                      {importFeedback}
                    </p>
                  ) : null}
                  {importError ? (
                    <p className="mt-1 text-sm text-rose-700 transition-opacity" role="alert">
                      {importError}
                    </p>
                  ) : null}
                </header>

                <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold sm:text-xl">Pipeline Summary</h3>
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                      Total jobs: {jobs.length}
                    </span>
                  </div>

                  {jobs.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm text-[var(--text-muted)]">
                      No jobs yet. Add your first role to start the pipeline.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {pipelineCounts.map(({ status: pipelineStatus, count }) => {
                        const isPriorityStage = pipelineStatus === "Interview";
                        return (
                          <article
                            key={pipelineStatus}
                            className={`rounded-xl border px-3 py-3 ${
                              isPriorityStage
                                ? "border-amber-300 bg-amber-100/70"
                                : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                            }`}
                          >
                            <p className="text-xs tracking-[0.08em] text-[var(--text-muted)] uppercase">
                              {pipelineStatus}
                            </p>
                            <p className="mt-1 text-2xl font-semibold">{count}</p>
                            {isPriorityStage && count > 0 ? (
                              <p className="mt-1 text-xs text-amber-900">
                                Priority stage
                              </p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="grid gap-4 xl:grid-cols-3">
                  <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                    <h3 className="text-2xl font-semibold">Upcoming Interviews</h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Next interviews in chronological order.
                    </p>

                    <div className="mt-4 space-y-3">
                      {upcomingInterviewsForDashboard.length === 0 ? (
                        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm text-[var(--text-muted)]">
                          No upcoming interviews yet. Add one from the Interviews view.
                        </p>
                      ) : (
                        upcomingInterviewsForDashboard.map((interview) => {
                          const interviewJob = jobsById.get(interview.jobId);
                          const interviewRecruiter =
                            typeof interview.recruiterId === "number"
                              ? recruitersById.get(interview.recruiterId)
                              : undefined;

                          return (
                            <div
                              key={interview.id}
                              className={`rounded-xl border p-3 ${
                                isTodayDateTime(interview.scheduledAt)
                                  ? "border-amber-300 bg-amber-100/70"
                                  : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                              }`}
                            >
                              <p className="font-medium">
                                {interviewJob?.title ?? "Job removed"}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {interviewJob?.company ?? "Unknown company"}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {interview.interviewType} •{" "}
                                {formatDateTime(interview.scheduledAt)}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                Recruiter:{" "}
                                {formatRecruiterContextForInterview(
                                  interviewRecruiter,
                                  interviewJob
                                )}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {isTodayDateTime(interview.scheduledAt) ? (
                                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                    Today
                                  </span>
                                ) : null}
                                {interviewJob ? (
                                  <button
                                    onClick={() =>
                                      handleOpenDetails(interviewJob.id, "Dashboard")
                                    }
                                    className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                  >
                                    Open Job
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                    <h3 className="text-2xl font-semibold">
                      Interviews Needing Update ({interviewsNeedingUpdate.length})
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Scheduled interviews with time already passed.
                    </p>

                    <div className="mt-4 space-y-3">
                      {interviewsNeedingUpdate.length === 0 ? (
                        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm text-[var(--text-muted)]">
                          All interview outcomes are up to date.
                        </p>
                      ) : (
                        interviewsNeedingUpdate.slice(0, 5).map((interview) => {
                          const interviewJob = jobsById.get(interview.jobId);
                          return (
                            <div
                              key={interview.id}
                              className="rounded-xl border border-amber-300 bg-amber-100/70 p-3"
                            >
                              <p className="font-medium">
                                {interviewJob
                                  ? `${interviewJob.company} - ${interviewJob.title}`
                                  : "Job removed"}
                              </p>
                              <p className="text-sm text-amber-900">
                                {interview.interviewType} •{" "}
                                {formatDateTime(interview.scheduledAt)}
                              </p>
                              <p className="mt-1 text-xs font-medium text-amber-900">
                                Needs outcome update
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    handleSetInterviewStatus(interview.id, "Completed")
                                  }
                                  className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                                >
                                  Mark Completed
                                </button>
                                <button
                                  onClick={() =>
                                    handleSetInterviewStatus(interview.id, "Cancelled")
                                  }
                                  className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                >
                                  Mark Cancelled
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                    <h3 className="text-2xl font-semibold">Jobs Needing Follow-up</h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Overdue first, then due today, then upcoming follow-ups soon.
                    </p>

                    <div className="mt-4 space-y-3">
                      {followUpDashboardJobs.length === 0 ? (
                        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm text-[var(--text-muted)]">
                          No follow-ups due. You are all caught up.
                        </p>
                      ) : (
                        followUpDashboardJobs.slice(0, 5).map(({ job, followUp }) => {
                          const linkedRecruiter =
                            typeof job.linkedRecruiterId === "number"
                              ? recruitersById.get(job.linkedRecruiterId)
                              : undefined;

                          return (
                            <div
                              key={job.id}
                              className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                            >
                              <p className="font-medium">
                                {job.title} - {job.company}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                Recruiter: {linkedRecruiter?.name ?? "Unassigned"}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${followUp.badgeClass}`}
                                >
                                  {followUp.label}
                                </span>
                                <button
                                  onClick={() => handleOpenDetails(job.id, "Dashboard")}
                                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                >
                                  Open Job
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </article>
                </section>

                <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-2xl font-semibold">Recent Activity</h3>
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                      Latest {recentActivities.length}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Timeline of important updates across jobs, recruiters, interviews, and follow-ups.
                  </p>

                  <div className="mt-4 space-y-3">
                    {recentActivities.length === 0 ? (
                      <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm text-[var(--text-muted)]">
                        No recent activity yet. Your timeline will appear as you update records.
                      </p>
                    ) : (
                      recentActivities.map((activity) => (
                        <article
                          key={activity.id}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                        >
                          <p className="text-sm">{activity.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-[var(--text-muted)]">
                              {formatActivityTimestamp(activity.timestamp)}
                            </p>
                            <button
                              onClick={() => handleOpenActivityContext(activity)}
                              disabled={!canOpenActivityContext(activity)}
                              className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Open Context
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                  <h3 className="text-2xl font-semibold">Add Job</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Minimal tracker to start capturing opportunities.
                  </p>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <input
                      value={company}
                      onChange={(event) => {
                        setCompany(event.target.value);
                        if (formError) setFormError("");
                      }}
                      placeholder="Company"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        if (formError) setFormError("");
                      }}
                      placeholder="Job title"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as JobStatus)}
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Note (optional)"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={jobLink}
                      onChange={(event) => setJobLink(event.target.value)}
                      placeholder="Job link (optional)"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={handleSaveJob}
                      className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                    >
                      Save Job
                    </button>
                  </div>

                  {formError ? (
                    <p className="mt-3 text-sm text-red-700" role="alert">
                      {formError}
                    </p>
                  ) : null}

                  <div className="mt-6 space-y-3">
                    {!isHydrated ? (
                      <p className="text-sm text-[var(--text-muted)]">Loading jobs...</p>
                    ) : jobs.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        No jobs yet. Add your first role to start tracking your pipeline.
                      </p>
                    ) : (
                      jobs.map((job) => {
                        const followUp = getFollowUpMeta(job);

                        return (
                          <article
                            key={job.id}
                            className="group flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="font-medium">
                                {job.company} - {job.title}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {job.note}
                              </p>
                              <span
                                className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${followUp.badgeClass}`}
                              >
                                {followUp.label}
                              </span>
                              {job.jobLink ? (
                                <a
                                  href={job.jobLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 ml-2 inline-block text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                                >
                                  Open
                                </a>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                              <span
                                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClasses[job.status]}`}
                              >
                                {job.status}
                              </span>
                              {(followUp.isOverdue || followUp.isDueToday) ? (
                                <button
                                  onClick={() => handleMarkFollowUpDone(job.id)}
                                  className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                                >
                                  Mark follow-up done
                                </button>
                              ) : null}
                              <button
                                onClick={() => handleOpenDetails(job.id, "Dashboard")}
                                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleStartEdit(job)}
                                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              </>
            ) : activeView === "Applications" ? (
              <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                <h2 className="text-3xl font-semibold">Applications</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Manage all saved roles with quick search, filtering, and sorting.
                </p>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search company or title"
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="All">All statuses</option>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="Newest">Newest first</option>
                    <option value="Oldest">Oldest first</option>
                  </select>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
                  {!isHydrated ? (
                    <p className="p-4 text-sm text-[var(--text-muted)]">Loading jobs...</p>
                  ) : applicationJobs.length === 0 ? (
                    <p className="p-4 text-sm text-[var(--text-muted)]">
                      No applications match your filters. Try clearing search or status.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--panel-border)]">
                      {applicationJobs.map((job) => {
                        const followUp = getFollowUpMeta(job);

                        return (
                          <article
                            key={job.id}
                            className="group grid gap-3 p-4 md:grid-cols-[1.5fr_0.8fr_1fr_auto]"
                          >
                            <div>
                              <p className="font-medium">
                                {job.company} - {job.title}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {job.note}
                              </p>
                              <span
                                className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${followUp.badgeClass}`}
                              >
                                {followUp.label}
                              </span>
                            </div>

                            <div className="flex items-center">
                              <span
                                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClasses[job.status]}`}
                              >
                                {job.status}
                              </span>
                            </div>

                            <div className="flex items-center">
                              {job.jobLink ? (
                                <a
                                  href={job.jobLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                                >
                                  Open
                                </a>
                              ) : (
                                <span className="text-sm text-[var(--text-muted)]">
                                  No link
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-start md:justify-end">
                              <div className="flex flex-wrap items-center gap-2 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                                {(followUp.isOverdue || followUp.isDueToday) ? (
                                  <button
                                    onClick={() => handleMarkFollowUpDone(job.id)}
                                    className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                                  >
                                    Mark follow-up done
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => handleOpenDetails(job.id, "Applications")}
                                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleStartEdit(job)}
                                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : activeView === "Recruiters" ? (
              <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                <h2 className="text-3xl font-semibold">Recruiters</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Track recruiter conversations and follow-up timing in one place.
                </p>

                <div className="mt-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                  <h3 className="text-lg font-semibold">Add Recruiter</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={recruiterName}
                      onChange={(event) => {
                        setRecruiterName(event.target.value);
                        if (recruiterError) setRecruiterError("");
                      }}
                      placeholder="Name"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={recruiterCompany}
                      onChange={(event) => {
                        setRecruiterCompany(event.target.value);
                        if (recruiterError) setRecruiterError("");
                      }}
                      placeholder="Company"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={recruiterRole}
                      onChange={(event) => setRecruiterRole(event.target.value)}
                      placeholder="Role or title"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={recruiterEmail}
                      onChange={(event) => setRecruiterEmail(event.target.value)}
                      placeholder="Email"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      value={recruiterProfileLink}
                      onChange={(event) => setRecruiterProfileLink(event.target.value)}
                      placeholder="LinkedIn or profile link"
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
                    />
                    <input
                      type="date"
                      value={lastContactDate}
                      onChange={(event) => setLastContactDate(event.target.value)}
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(event) => setNextFollowUpDate(event.target.value)}
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                    <textarea
                      value={recruiterNotes}
                      onChange={(event) => setRecruiterNotes(event.target.value)}
                      placeholder="Notes"
                      className="min-h-24 rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
                    />
                  </div>

                  {recruiterError ? (
                    <p className="mt-3 text-sm text-red-700" role="alert">
                      {recruiterError}
                    </p>
                  ) : null}

                  <div className="mt-3">
                    <button
                      onClick={handleSaveRecruiter}
                      className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                    >
                      Save Recruiter
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <input
                    value={recruiterSearchTerm}
                    onChange={(event) => setRecruiterSearchTerm(event.target.value)}
                    placeholder="Search by recruiter name or company"
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  />
                  <select
                    value={recruiterSortOrder}
                    onChange={(event) =>
                      setRecruiterSortOrder(event.target.value as RecruiterSortOrder)
                    }
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="Newest">Newest first</option>
                    <option value="Upcoming follow-up">Upcoming follow-up</option>
                  </select>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
                  {!isHydrated ? (
                    <p className="p-4 text-sm text-[var(--text-muted)]">
                      Loading recruiters...
                    </p>
                  ) : filteredRecruiters.length === 0 ? (
                    <p className="p-4 text-sm text-[var(--text-muted)]">
                      No recruiters match your search. Try a broader name or company.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--panel-border)]">
                      {filteredRecruiters.map((recruiter) => {
                        const linkedJob = linkedJobByRecruiterId.get(recruiter.id);

                        return (
                          <article
                            key={recruiter.id}
                            className="group grid gap-3 p-4 md:grid-cols-[1.25fr_1fr_1fr_auto]"
                          >
                            <div>
                              <p className="font-medium">
                                {recruiter.name} - {recruiter.company}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {recruiter.role || "No title provided"}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {recruiter.email || "No email provided"}
                              </p>
                              <p className="mt-1 text-sm">
                                Linked job:{" "}
                                <span className="font-medium">
                                  {linkedJob
                                    ? `${linkedJob.title} (${linkedJob.company})`
                                    : "Unassigned"}
                                </span>
                              </p>
                              {recruiter.profileLink ? (
                                <a
                                  href={recruiter.profileLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-block text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                                >
                                  Open profile
                                </a>
                              ) : null}
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                Last Contact
                              </p>
                              <p className="mt-1 text-sm">
                                {formatDateOnly(recruiter.lastContactDate)}
                              </p>
                              <p className="mt-3 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                Next Follow-up
                              </p>
                              <p className="mt-1 text-sm">
                                {formatDateOnly(recruiter.nextFollowUpDate)}
                              </p>
                              {isFollowUpSoon(recruiter.nextFollowUpDate) ? (
                                <span className="mt-2 inline-block rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                  Follow-up soon
                                </span>
                              ) : null}
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                Notes
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {recruiter.notes}
                              </p>
                            </div>

                            <div className="flex items-center justify-start gap-2 transition-opacity md:justify-end md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  handleOpenRecruiterDetails(recruiter.id, "Recruiters")
                                }
                                className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleStartRecruiterEdit(recruiter)}
                                className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRecruiter(recruiter.id)}
                                className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                <h2 className="text-3xl font-semibold">Interviews</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Track interview schedule, outcomes, and notes tied to jobs and recruiters.
                </p>

                <div className="mt-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                  <h3 className="text-lg font-semibold">Add Interview</h3>
                  {jobs.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Add a job first before creating interviews.
                    </p>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <select
                          value={interviewJobId}
                          onChange={(event) => {
                            setInterviewJobId(event.target.value);
                            if (interviewError) setInterviewError("");
                          }}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                        >
                          <option value="">Select job</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {job.company} - {job.title}
                            </option>
                          ))}
                        </select>

                        <select
                          value={interviewRecruiterId}
                          onChange={(event) => setInterviewRecruiterId(event.target.value)}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                        >
                          <option value="">No recruiter (optional)</option>
                          {recruiters.map((recruiter) => (
                            <option key={recruiter.id} value={recruiter.id}>
                              {recruiter.name} - {recruiter.company}
                            </option>
                          ))}
                        </select>

                        <select
                          value={interviewType}
                          onChange={(event) => setInterviewType(event.target.value)}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                        >
                          {interviewTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>

                        <select
                          value={interviewStatus}
                          onChange={(event) =>
                            setInterviewStatus(event.target.value as InterviewStatus)
                          }
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                        >
                          {interviewStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>

                        <input
                          type="datetime-local"
                          value={interviewScheduledAt}
                          onChange={(event) => setInterviewScheduledAt(event.target.value)}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
                        />

                        <textarea
                          value={interviewNotes}
                          onChange={(event) => setInterviewNotes(event.target.value)}
                          placeholder="Notes"
                          className="min-h-24 rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
                        />
                      </div>

                      {interviewError ? (
                        <p className="mt-3 text-sm text-red-700" role="alert">
                          {interviewError}
                        </p>
                      ) : null}

                      <div className="mt-3">
                        <button
                          onClick={handleSaveInterview}
                          className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                        >
                          Save Interview
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <input
                    value={interviewSearchTerm}
                    onChange={(event) => setInterviewSearchTerm(event.target.value)}
                    placeholder="Search by job or recruiter"
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  />
                  <select
                    value={interviewStatusFilter}
                    onChange={(event) =>
                      setInterviewStatusFilter(
                        event.target.value as InterviewStatus | "All"
                      )
                    }
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="All">All statuses</option>
                    {interviewStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={interviewSortOrder}
                    onChange={(event) =>
                      setInterviewSortOrder(event.target.value as InterviewSortOrder)
                    }
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="Upcoming">Upcoming first</option>
                    <option value="Newest created">Newest created</option>
                    <option value="Recently updated">Recently updated</option>
                  </select>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
                  {!isHydrated ? (
                    <p className="p-4 text-sm text-[var(--text-muted)]">
                      Loading interviews...
                    </p>
                  ) : filteredInterviews.length === 0 ? (
                    <p className="p-4 text-sm text-[var(--text-muted)]">
                      No interviews match these filters. Try clearing search or status.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--panel-border)]">
                      {filteredInterviews.map((interview) => {
                        const interviewJob = jobsById.get(interview.jobId);
                        const interviewRecruiter =
                          typeof interview.recruiterId === "number"
                            ? recruitersById.get(interview.recruiterId)
                            : null;
                        const isToday = isTodayDateTime(interview.scheduledAt);
                        const isPast = isPastDateTime(interview.scheduledAt);
                        const needsUpdate = needsInterviewOutcomeUpdate(interview);

                        return (
                          <article
                            key={interview.id}
                            className={`group grid gap-3 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto] ${
                              isToday
                                ? "bg-amber-100/60"
                                : isPast
                                  ? "bg-slate-200/50 opacity-90"
                                  : ""
                            }`}
                          >
                            <div>
                              <p className="font-medium">
                                {interviewJob
                                  ? `${interviewJob.company} - ${interviewJob.title}`
                                  : "Job removed"}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {interview.interviewType}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {interview.notes}
                              </p>
                              {needsUpdate ? (
                                <p className="mt-2 text-xs font-medium text-amber-900">
                                  Needs outcome update
                                </p>
                              ) : null}
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                Schedule
                              </p>
                              <p className="mt-1 text-sm">
                                {formatDateTime(interview.scheduledAt)}
                              </p>
                              {isToday ? (
                                <span className="mt-2 inline-block rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                  Today
                                </span>
                              ) : isPast ? (
                                <span className="mt-2 inline-block rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                  Past
                                </span>
                              ) : (
                                <span className="mt-2 inline-block rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                                  Upcoming
                                </span>
                              )}
                              <span
                                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${interviewStatusClasses[interview.status]}`}
                              >
                                {interview.status}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                Recruiter
                              </p>
                              <p className="mt-1 text-sm">
                                {formatRecruiterContextForInterview(
                                  interviewRecruiter ?? undefined,
                                  interviewJob
                                )}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-start gap-2 transition-opacity md:justify-end md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                              {interviewJob ? (
                                <button
                                  onClick={() =>
                                    handleOpenDetails(interviewJob.id, "Interviews")
                                  }
                                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                >
                                  Job
                                </button>
                              ) : null}
                              {interviewRecruiter ? (
                                <button
                                  onClick={() =>
                                    handleOpenRecruiterDetails(
                                      interviewRecruiter.id,
                                      "Interviews"
                                    )
                                  }
                                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                >
                                  Recruiter
                                </button>
                              ) : null}
                              {needsUpdate ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleSetInterviewStatus(interview.id, "Completed")
                                    }
                                    className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                                  >
                                    Mark Completed
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSetInterviewStatus(interview.id, "Cancelled")
                                    }
                                    className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                  >
                                    Mark Cancelled
                                  </button>
                                </>
                              ) : null}
                              <button
                                onClick={() => handleStartInterviewEdit(interview)}
                                className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteInterview(interview.id)}
                                className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </section>
        </div>
      </div>

      {detailsJobId !== null ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl sm:p-6">
            {selectedJob ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-semibold">Job Details</h3>
                  <button
                    onClick={handleCloseDetails}
                    className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 space-y-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Company
                    </p>
                    <p className="mt-1 font-medium">{selectedJob.company}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Title
                    </p>
                    <p className="mt-1 font-medium">{selectedJob.title}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Status
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusClasses[selectedJob.status]}`}
                    >
                      {selectedJob.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Note
                    </p>
                    <p className="mt-1 text-sm">{selectedJob.note}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Job Link
                    </p>
                    {selectedJob.jobLink ? (
                      <a
                        href={selectedJob.jobLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                      >
                        Open Link
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">No link</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Added Date
                    </p>
                    <p className="mt-1 text-sm">
                      {formatCreatedDate(selectedJob.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Linked Recruiter
                    </p>

                    {selectedJobLinkedRecruiter ? (
                      <div className="mt-2">
                        <p className="font-medium">
                          {selectedJobLinkedRecruiter.name}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {selectedJobLinkedRecruiter.company}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {selectedJobLinkedRecruiter.email || "No email provided"}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          Follow-up:{" "}
                          {formatDateOnly(selectedJobLinkedRecruiter.nextFollowUpDate)}
                        </p>
                        <button
                          onClick={() =>
                            handleOpenRecruiterDetails(
                              selectedJobLinkedRecruiter.id,
                              "JobDetails",
                              selectedJob.id,
                              detailsSource
                            )
                          }
                          className="mt-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                        >
                          Open Recruiter Details
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No recruiter linked
                      </p>
                    )}

                    {!isLinkRecruiterMode ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={handleStartRecruiterLinking}
                          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                        >
                          {selectedJobLinkedRecruiter
                            ? "Change Recruiter"
                            : "Link Recruiter"}
                        </button>
                        {selectedJobLinkedRecruiter ? (
                          <button
                            onClick={() => handleUnlinkRecruiterFromJob(selectedJob.id)}
                            className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Remove Link
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {recruiters.length === 0 ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            No recruiters yet. Add one in the Recruiters view first.
                          </p>
                        ) : (
                          <select
                            value={linkRecruiterSelection}
                            onChange={(event) => {
                              setLinkRecruiterSelection(event.target.value);
                              if (linkRecruiterError) setLinkRecruiterError("");
                            }}
                            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
                          >
                            <option value="">Select recruiter</option>
                            {recruiters.map((recruiter) => {
                              const linkedJob = linkedJobByRecruiterId.get(
                                recruiter.id
                              );
                              const linkedLabel =
                                linkedJob && linkedJob.id !== selectedJob.id
                                  ? ` (linked to ${linkedJob.company} - ${linkedJob.title})`
                                  : "";
                              return (
                                <option key={recruiter.id} value={recruiter.id}>
                                  {recruiter.name} - {recruiter.company}
                                  {linkedLabel}
                                </option>
                              );
                            })}
                          </select>
                        )}

                        {linkRecruiterError ? (
                          <p className="text-sm text-red-700" role="alert">
                            {linkRecruiterError}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleSaveRecruiterLink}
                            disabled={recruiters.length === 0}
                            className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Save Link
                          </button>
                          <button
                            onClick={handleCancelRecruiterLinking}
                            className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                          >
                            Cancel
                          </button>
                          {selectedJobLinkedRecruiter ? (
                            <button
                              onClick={() => handleUnlinkRecruiterFromJob(selectedJob.id)}
                              className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              Unlink
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Interviews
                      </p>
                      <button
                        onClick={() => handleStartInterviewQuickCreateFromJob(selectedJob)}
                        className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                      >
                        + Add Interview
                      </button>
                    </div>

                    {selectedJobInterviews.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No interviews for this job yet. Add one to build the timeline.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedJobInterviews.map((interview) => {
                          const interviewRecruiter =
                            typeof interview.recruiterId === "number"
                              ? recruitersById.get(interview.recruiterId)
                              : undefined;
                          const needsUpdate = needsInterviewOutcomeUpdate(interview);

                          return (
                            <div
                              key={interview.id}
                              className="relative rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                            >
                              <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-slate-300" />
                              <div className="ml-2">
                                <p className="font-medium">
                                  {interview.interviewType} -{" "}
                                  {formatDateTime(interview.scheduledAt)}
                                </p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                  Recruiter:{" "}
                                  {formatRecruiterContextForInterview(
                                    interviewRecruiter,
                                    selectedJob
                                  )}
                                </p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                  {interview.notes.length > 100
                                    ? `${interview.notes.slice(0, 100)}...`
                                    : interview.notes}
                                </p>
                                {needsUpdate ? (
                                  <p className="mt-2 text-xs font-medium text-amber-900">
                                    Needs outcome update
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${interviewStatusClasses[interview.status]}`}
                                  >
                                    {interview.status}
                                  </span>
                                  <button
                                    onClick={() => handleStartInterviewEdit(interview)}
                                    className="rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                  >
                                    Edit interview
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Follow-up
                    </p>
                    <p className="mt-2 text-sm">
                      Next follow-up: {formatDateOnly(selectedJob.nextFollowUpDate)}
                    </p>
                    <p className="text-sm">
                      Last contact: {formatDateOnly(selectedJob.lastContactDate)}
                    </p>
                    <p className="text-sm">
                      Status:{" "}
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          selectedJobFollowUp?.badgeClass ??
                          "border border-slate-300 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {selectedJobFollowUp?.status ?? "Not needed"}
                      </span>
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        type="date"
                        value={followUpDraftDate}
                        onChange={(event) => {
                          setFollowUpDraftDate(event.target.value);
                          if (followUpError) setFollowUpError("");
                        }}
                        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm outline-none focus:border-slate-500"
                      />
                      <button
                        onClick={() => handleSetFollowUpDate(selectedJob.id)}
                        className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                      >
                        Set / Reschedule
                      </button>
                    </div>

                    {followUpError ? (
                      <p className="mt-2 text-sm text-red-700" role="alert">
                        {followUpError}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleMarkContactedToday(selectedJob.id)}
                        className="rounded-lg border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      >
                        Mark contacted today
                      </button>
                      <button
                        onClick={() => handleMarkFollowUpDone(selectedJob.id)}
                        className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                      >
                        Mark follow-up done
                      </button>
                      <button
                        onClick={() => handleClearFollowUp(selectedJob.id)}
                        className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Clear follow-up
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Activity Timeline
                      </p>
                      <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                        {selectedJobActivities.length}
                      </span>
                    </div>

                    {selectedJobActivities.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No job activity yet. Updates to this job will appear here.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedJobActivities.map((activity) => (
                          <article
                            key={activity.id}
                            className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                          >
                            <p className="text-sm">{activity.message}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {formatActivityTimestamp(activity.timestamp)}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      handleCloseDetails();
                      handleStartEdit(selectedJob);
                    }}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/70"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteJob(selectedJob.id)}
                    className="rounded-xl border border-rose-300 px-5 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setActiveView(detailsSource);
                      handleCloseDetails();
                    }}
                    className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                  >
                    Back to {detailsSource}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                <p className="text-sm text-[var(--text-muted)]">
                  This job is no longer available.
                </p>
                <button
                  onClick={handleCloseDetails}
                  className="mt-3 rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {detailsRecruiterId !== null ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl sm:p-6">
            {selectedRecruiter ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-semibold">Recruiter Details</h3>
                  <button
                    onClick={handleCloseRecruiterDetails}
                    className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 space-y-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Name
                    </p>
                    <p className="mt-1 font-medium">{selectedRecruiter.name}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Company
                    </p>
                    <p className="mt-1 font-medium">{selectedRecruiter.company}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Role
                    </p>
                    <p className="mt-1 text-sm">
                      {selectedRecruiter.role || "No title provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Email
                    </p>
                    <p className="mt-1 text-sm">
                      {selectedRecruiter.email || "No email provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Profile Link
                    </p>
                    {selectedRecruiter.profileLink ? (
                      <a
                        href={selectedRecruiter.profileLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                      >
                        Open profile
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        No link
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Notes
                    </p>
                    <p className="mt-1 text-sm">{selectedRecruiter.notes}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Last Contact
                    </p>
                    <p className="mt-1 text-sm">
                      {formatDateOnly(selectedRecruiter.lastContactDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Next Follow-up
                    </p>
                    <p className="mt-1 text-sm">
                      {formatDateOnly(selectedRecruiter.nextFollowUpDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Linked Job
                    </p>
                    {selectedRecruiterLinkedJob ? (
                      <div className="mt-2">
                        <p className="font-medium">
                          {selectedRecruiterLinkedJob.title} -{" "}
                          {selectedRecruiterLinkedJob.company}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            statusClasses[selectedRecruiterLinkedJob.status]
                          }`}
                        >
                          {selectedRecruiterLinkedJob.status}
                        </span>
                        <button
                          onClick={() => {
                            handleCloseRecruiterDetails();
                            handleOpenDetails(
                              selectedRecruiterLinkedJob.id,
                              "Recruiters"
                            );
                          }}
                          className="ml-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                        >
                          Open Job Details
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No job linked
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Activity Timeline
                      </p>
                      <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                        {selectedRecruiterActivities.length}
                      </span>
                    </div>

                    {selectedRecruiterActivities.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        No recruiter activity yet. Link or update this recruiter to see history.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedRecruiterActivities.map((activity) => {
                          const linkedJobForActivity =
                            typeof activity.jobId === "number"
                              ? jobsById.get(activity.jobId)
                              : undefined;

                          return (
                            <article
                              key={activity.id}
                              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                            >
                              <p className="text-sm">{activity.message}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {formatActivityTimestamp(activity.timestamp)}
                              </p>
                              {linkedJobForActivity ? (
                                <button
                                  onClick={() => {
                                    handleCloseRecruiterDetails();
                                    handleOpenDetails(linkedJobForActivity.id, "Recruiters");
                                  }}
                                  className="mt-2 rounded-lg border border-[var(--panel-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
                                >
                                  Open Job Details
                                </button>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleStartRecruiterEdit(selectedRecruiter)}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/70"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRecruiter(selectedRecruiter.id)}
                    className="rounded-xl border border-rose-300 px-5 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleBackFromRecruiterDetails}
                    className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                  >
                    {recruiterDetailsSource === "JobDetails"
                      ? "Back to Job Details"
                      : recruiterDetailsSource === "Interviews"
                        ? "Back to Interviews"
                        : "Back to Recruiters"}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                <p className="text-sm text-[var(--text-muted)]">
                  This recruiter is no longer available.
                </p>
                <button
                  onClick={handleCloseRecruiterDetails}
                  className="mt-3 rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {editingInterviewId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold">Edit Interview</h3>
              <button
                onClick={handleCloseInterviewEdit}
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <select
                value={editInterviewJobId}
                onChange={(event) => {
                  setEditInterviewJobId(event.target.value);
                  if (editInterviewError) setEditInterviewError("");
                }}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="">Select job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.company} - {job.title}
                  </option>
                ))}
              </select>

              <select
                value={editInterviewRecruiterId}
                onChange={(event) => setEditInterviewRecruiterId(event.target.value)}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="">No recruiter (optional)</option>
                {recruiters.map((recruiter) => (
                  <option key={recruiter.id} value={recruiter.id}>
                    {recruiter.name} - {recruiter.company}
                  </option>
                ))}
              </select>

              <select
                value={editInterviewType}
                onChange={(event) => setEditInterviewType(event.target.value)}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                {interviewTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={editInterviewStatus}
                onChange={(event) =>
                  setEditInterviewStatus(event.target.value as InterviewStatus)
                }
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                {interviewStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={editInterviewScheduledAt}
                onChange={(event) => setEditInterviewScheduledAt(event.target.value)}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />

              <textarea
                value={editInterviewNotes}
                onChange={(event) => setEditInterviewNotes(event.target.value)}
                placeholder="Notes"
                className="min-h-24 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            {editInterviewError ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {editInterviewError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleSaveInterviewEdit}
                className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
              >
                Save Changes
              </button>
              <button
                onClick={handleCloseInterviewEdit}
                className="rounded-xl border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-secondary-text)] transition hover:bg-[var(--button-secondary-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingRecruiterId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold">Edit Recruiter</h3>
              <button
                onClick={handleCloseRecruiterEdit}
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <input
                value={editRecruiterName}
                onChange={(event) => {
                  setEditRecruiterName(event.target.value);
                  if (editRecruiterError) setEditRecruiterError("");
                }}
                placeholder="Name"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={editRecruiterCompany}
                onChange={(event) => {
                  setEditRecruiterCompany(event.target.value);
                  if (editRecruiterError) setEditRecruiterError("");
                }}
                placeholder="Company"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={editRecruiterRole}
                onChange={(event) => setEditRecruiterRole(event.target.value)}
                placeholder="Role or title"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={editRecruiterEmail}
                onChange={(event) => setEditRecruiterEmail(event.target.value)}
                placeholder="Email"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={editRecruiterProfileLink}
                onChange={(event) => setEditRecruiterProfileLink(event.target.value)}
                placeholder="LinkedIn or profile link"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                type="date"
                value={editLastContactDate}
                onChange={(event) => setEditLastContactDate(event.target.value)}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                type="date"
                value={editNextFollowUpDate}
                onChange={(event) => setEditNextFollowUpDate(event.target.value)}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <textarea
                value={editRecruiterNotes}
                onChange={(event) => setEditRecruiterNotes(event.target.value)}
                placeholder="Notes"
                className="min-h-24 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            {editRecruiterError ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {editRecruiterError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleSaveRecruiterEdit}
                className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
              >
                Save Changes
              </button>
              <button
                onClick={handleCloseRecruiterEdit}
                className="rounded-xl border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-secondary-text)] transition hover:bg-[var(--button-secondary-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingJobId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold">Edit Job</h3>
              <button
                onClick={handleCloseEdit}
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-white/70"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <input
                value={editCompany}
                onChange={(event) => {
                  setEditCompany(event.target.value);
                  if (editError) setEditError("");
                }}
                placeholder="Company"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={editTitle}
                onChange={(event) => {
                  setEditTitle(event.target.value);
                  if (editError) setEditError("");
                }}
                placeholder="Job title"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as JobStatus)}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                value={editNote}
                onChange={(event) => setEditNote(event.target.value)}
                placeholder="Note"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
              <input
                value={editJobLink}
                onChange={(event) => setEditJobLink(event.target.value)}
                placeholder="Job link (optional)"
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            {editError ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {editError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                className="rounded-xl bg-[var(--button-primary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-primary-text)] transition hover:brightness-95"
              >
                Save Changes
              </button>
              <button
                onClick={handleCloseEdit}
                className="rounded-xl border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-5 py-3 text-sm font-medium text-[var(--button-secondary-text)] transition hover:bg-[var(--button-secondary-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
