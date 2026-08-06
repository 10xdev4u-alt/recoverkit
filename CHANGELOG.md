# Changelog

All notable changes to this project will be documented here.
Format follows Keep a Changelog; versioning is SemVer.

## [Unreleased]

## [0.2.0] — 2026-08-06

### Added
- Waitlist signup (Supabase-backed, idempotent on duplicate email)
- Stripe Connect onboarding: OAuth callback registers per-account webhooks and
  backfills recent failed/open invoices (`lib/backfill.ts`)
- Stripe webhook intake with idempotency ledger (`webhook_events`), handling
  `invoice.payment_failed`, `invoice.payment_succeeded`, `charge.failed`,
  `customer.subscription.updated`
- Decline-code → recovery-action mapping and dunning email routing
  (`lib/decline-codes.ts`)
- No-login card update: magic-link tokens (`recovery_tokens`), SetupIntent
  mint, Stripe Elements card form, finalize (attach + pay open invoices)
- Daily retry cron (`/api/cron/retry`): decline-aware scheduling + 48h no-click
  nudges, locked via `last_scheduled_at` (no double-fire)
- Dunning emails via Resend, keyed to decline codes, with send/delivered/
  opened/clicked/bounced tracking (`email_events` + Resend webhook)
- Auth: Supabase magic-link sign-in, dashboard route protection, account
  resolution + RLS-scoped queries
- Dashboard: revenue-protection metrics (recovered month, recovery rate,
  at-risk MRR, open failures) + payment list
- Payment detail: timeline (failures, emails, opens/clicks, outcome)
- Settings: Stripe connection status, email from/reply-to/support, per-template
  copy overrides (subject + intro) persisted as `template_overrides`
- Gabarito display font + focus-visible rings + reduced-motion support
- Testing: Playwright e2e (landing, auth, recovery) + vitest coverage gate
  (98% lines) with a fake Supabase client for DB-bound libs
- Hardening: audit log (`audit_events` + `lib/audit.ts`), rate limiting
  (waitlist + settings), route loading skeleton + error boundary, empty states
- Release ops: `docs/RUNBOOK.md` (env maps, deploy flow, monitoring),
  `/api/health` uptime probe, cron success ping via `MONITORING_URL`

### Fixed
- Dev server boots without Supabase env vars (CI e2e-safe): middleware,
  dashboard layout, and sign-in degrade gracefully
- Native browser validation no longer masks the waitlist form's custom error
  message (`noValidate`)

## [Unreleased]

### Added
- Project scaffold: README, spec, validation playbook
- Docs for positioning, validation gates, and MVP scope
- Competitive research: Churnkey / Stunning / ChurnWard / Gravy / Stripe gaps
  (`docs/RESEARCH.md`)
- Technical research: Stripe webhooks + decline codes, no-login card update flow,
  Resend, Supabase schema (`docs/TECHNICAL.md`)
- Dunning email templates keyed to decline codes (`docs/EMAIL_TEMPLATES.md`)
- Dev flow: GitHub Flow + commitlint + CI + PR template (`docs/DEV_FLOW.md`)
- commitlint tooling (`@commitlint/cli`, `@commitlint/config-conventional`)
- Stage pipeline: `staging` integration branch + protection, CODEOWNERS, issue
  templates, CI coverage for staging pushes (`docs/DEV_FLOW.md`)
- Repo standards: MIT LICENSE, CONTRIBUTING, SECURITY, editorconfig,
  gitattributes, Dependabot config
- Husky pre-commit hook enforcing commit conventions locally
- MVP Phase 1: Next.js 15 scaffold (App Router, TypeScript, Tailwind v4, ESLint
  flat config), CI full gate (typecheck/lint/build), 20-phase build plan
  (`docs/BUILD_PLAN.md`)

### Updated
- Architecture: `webhook_events` idempotency ledger + locked research decisions
