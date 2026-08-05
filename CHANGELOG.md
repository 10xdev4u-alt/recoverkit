# Changelog

All notable changes to this project will be documented here.
Format follows Keep a Changelog; versioning is SemVer.

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
