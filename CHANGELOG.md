# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions Playwright workflow on push/PR to `main`
- CI artifact uploads for `playwright-report/` and `test-results/`
- MIT license file
- GitHub issue templates (`bug report`, `feature request`)
- Expanded README sections for demo, problem, architecture, testing, and roadmap
- YouTube walkthrough video link in project and profile documentation
- Additional Playwright E2E coverage for job search and status filtering flows
- AI Copilot feature flag, provider abstraction, and server routes for summaries, notes, and follow-ups
- Disabled-by-default AI UI controls and assistant panel inside job details
- Playwright coverage for AI-disabled, AI-enabled, and AI-error states

### Changed

- Dashboard `Start Building` action now scrolls to Add Job and focuses the Company input
- Playwright CI config now captures screenshots on failure and records browser sessions in CI
- README top badges now highlight CI, Playwright status, deployment, and license
- Dashboard copy and metadata now describe AI as implemented architecture that is disabled by default in the public build

## [1.0.0] - 2026-03-06

Initial public release (`v1.0` tag).

### Added

- Local-first Job Search Copilot MVP built with Next.js, React, and Tailwind
- Dashboard, Applications, Recruiters, and Interviews views
- End-to-end workflow for jobs, recruiter linking, interviews, and follow-ups
- Activity timeline and dashboard insights
- JSON backup/export and import/restore flows
- Job-level validation, edit/delete confirmations, and persistence via localStorage
- Initial Playwright E2E test coverage for core user flows

[Unreleased]: https://github.com/AliaksandrHv/ai-job-search-app/compare/v1.0...HEAD
[1.0.0]: https://github.com/AliaksandrHv/ai-job-search-app/tree/v1.0
