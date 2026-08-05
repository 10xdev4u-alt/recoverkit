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

### Updated
- Architecture: `webhook_events` idempotency ledger + locked research decisions
