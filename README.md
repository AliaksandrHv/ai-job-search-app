# Job Search Copilot

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-v1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-v4-38BDF8?logo=tailwindcss&logoColor=white)

A local-first job search management app built with Next.js, React, and Tailwind.

The product is designed to support a practical end-to-end workflow:

Jobs -> Recruiters -> Interviews -> Follow-ups -> Activity Timeline -> Insights -> Backup/Restore

## MVP Features

### Jobs
- Add, edit, delete jobs
- Required validation for company and title
- Status tracking (`Saved`, `Applied`, `Interview`, `Rejected`)
- Optional job link support
- Follow-up fields and actions

### Recruiters
- Add, edit, delete recruiter contacts
- Search and sort recruiters
- Track contact dates and next follow-up
- Link/unlink recruiter to a job

### Interviews
- Add, edit, delete interviews
- Link interviews to jobs and optionally recruiters
- Status tracking (`Scheduled`, `Completed`, `Cancelled`)
- Filters, search, and sort modes
- "Needs outcome update" detection for past scheduled interviews

### Follow-ups
- Job-level follow-up status and dates
- Quick actions:
  - set/reschedule follow-up
  - mark contacted today
  - mark follow-up done
  - clear follow-up
- Dashboard cards for due/overdue visibility

### Activity Timeline
- Auto-logs key product actions
- Dashboard "Recent Activity" widget
- Job Details and Recruiter Details timelines
- Persists in localStorage with cap to avoid unbounded growth

### Backup / Restore
- Export full app data to JSON
- Import JSON backup with validation and overwrite confirmation
- Immediate UI refresh after successful restore

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- localStorage persistence (no backend in MVP)

## Architecture Overview

Current implementation is intentionally single-page and local-first:

- Main UI and state orchestration: `app/page.tsx`
- Global styles/theme tokens: `app/globals.css`
- App shell metadata: `app/layout.tsx`

Data lifecycle:

1. Hydrate state from localStorage on app load
2. Normalize records to keep backward compatibility
3. Persist each entity set through dedicated `useEffect` syncs
4. Render views (Dashboard, Applications, Recruiters, Interviews)
5. Open detail/edit panels for focused record operations

## Data Model (MVP)

### Job
- `id`
- `company`
- `title`
- `status`
- `note`
- `jobLink?`
- `linkedRecruiterId?`
- `nextFollowUpDate?`
- `lastContactDate?`
- `followUpStatus?`
- `createdAt?`

### Recruiter
- `id`
- `name`
- `company`
- `role`
- `email`
- `profileLink?`
- `notes`
- `lastContactDate?`
- `nextFollowUpDate?`
- `createdAt?`

### Interview
- `id`
- `jobId`
- `recruiterId?`
- `interviewType`
- `status`
- `scheduledAt`
- `notes`
- `createdAt?`
- `updatedAt?`

### ActivityEvent
- `id`
- `type`
- `timestamp`
- `message`
- `jobId?`
- `recruiterId?`
- `interviewId?`

## Persistence Keys

- `ai_job_search_jobs_v1`
- `ai_job_search_recruiters_v1`
- `ai_job_search_interviews_v1`
- `ai_job_search_activity_v1`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Project Structure (Current)

```text
app/
  globals.css
  layout.tsx
  page.tsx
```

## Portfolio Notes

This project demonstrates:

- Product-driven feature sequencing from MVP to usability polish
- Strong local data modeling and backward-compatible persistence
- Connected workflow across entities (jobs, recruiters, interviews, follow-ups)
- Operational UX (dashboard insights, details panels, quick actions)
- Practical data portability via JSON backup/restore

## MVP Status

MVP is complete and functional as a standalone local-first product.

Potential next iterations:

- Modular code split (`components/`, `hooks/`, `lib/`, `types/`)
- richer keyboard shortcuts
- priority/pinned jobs
- enhanced analytics widgets
